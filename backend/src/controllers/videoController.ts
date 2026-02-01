import { Request, Response } from "express";
import mongoose from "mongoose";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import Video from "../models/Video";
import videoAnalysisService from "../services/videoAnalysisService";
import { getGridFSBucket } from "../config/gridfs";
import logger from "../utils/logger";

class VideoController {
  // POST /api/v1/videos/upload - Upload a video file to GridFS (MongoDB)
  async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "No video file provided",
        });
        return;
      }

      const bucket = getGridFSBucket();
      const uniqueFilename = `${uuidv4()}${path.extname(req.file.originalname).toLowerCase()}`;

      // Create upload stream to GridFS
      const uploadStream = bucket.openUploadStream(uniqueFilename, {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date(),
        },
      });

      // Convert buffer to readable stream and pipe to GridFS
      const readableStream = new Readable();
      readableStream.push(req.file.buffer);
      readableStream.push(null);

      await new Promise<void>((resolve, reject) => {
        readableStream
          .pipe(uploadStream)
          .on("error", reject)
          .on("finish", resolve);
      });

      // Create video document with GridFS reference
      const video = new Video({
        filename: uniqueFilename,
        originalName: req.file.originalname,
        gridfsId: uploadStream.id,
        size: req.file.size,
        mimetype: req.file.mimetype,
        status: "uploaded",
      });

      await video.save();

      logger.info(
        `Video uploaded to MongoDB GridFS: ${video.filename} (GridFS ID: ${uploadStream.id})`,
      );

      res.status(201).json({
        success: true,
        data: {
          id: video._id,
          filename: video.filename,
          originalName: video.originalName,
          size: video.size,
          status: video.status,
          uploadedAt: video.uploadedAt,
        },
        message: "Video uploaded successfully to MongoDB",
      });
    } catch (error: any) {
      logger.error("Error uploading video:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/videos - Get all videos
  async getAllVideos(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      const query: any = {};
      if (status) {
        query.status = status;
      }

      const total = await Video.countDocuments(query);
      const videos = await Video.find(query)
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        success: true,
        data: videos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error("Error fetching videos:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/videos/:id - Get video by ID
  async getVideoById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await videoAnalysisService.getVideoWithPrediction(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "Video not found",
        });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching video:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // DELETE /api/v1/videos/:id - Delete video from GridFS and database
  async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const video = await Video.findById(id);

      if (!video) {
        res.status(404).json({
          success: false,
          error: "Video not found",
        });
        return;
      }

      // Delete file from GridFS
      try {
        const bucket = getGridFSBucket();
        await bucket.delete(video.gridfsId);
        logger.info(`Deleted video from GridFS: ${video.gridfsId}`);
      } catch (gridfsError) {
        logger.warn(`Could not delete GridFS file: ${gridfsError}`);
      }

      // Delete from database
      await Video.findByIdAndDelete(id);

      logger.info(`Video deleted: ${video.filename}`);

      res.json({
        success: true,
        message: "Video deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting video:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/videos/:id/stream - Stream video from GridFS (MongoDB)
  async streamVideo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      logger.info(`Stream request for video ID: ${id}`);

      const video = await Video.findById(id);

      if (!video) {
        logger.error(`Video not found: ${id}`);
        res.status(404).json({
          success: false,
          error: "Video not found",
        });
        return;
      }

      if (!video.gridfsId) {
        logger.error(`Video has no gridfsId: ${id}`);
        res.status(404).json({
          success: false,
          error: "Video file reference not found",
        });
        return;
      }

      const bucket = getGridFSBucket();

      // Ensure gridfsId is a proper ObjectId
      const gridfsObjectId = new mongoose.Types.ObjectId(video.gridfsId);

      // Get file info from GridFS
      const files = await bucket.find({ _id: gridfsObjectId }).toArray();

      if (files.length === 0) {
        logger.error(`GridFS file not found for gridfsId: ${video.gridfsId}`);
        res.status(404).json({
          success: false,
          error: "Video file not found in MongoDB storage",
        });
        return;
      }

      const fileInfo = files[0];
      const fileSize = fileInfo.length;
      const range = req.headers.range;

      logger.info(
        `Streaming video from MongoDB GridFS: ${video.filename} (${fileSize} bytes), range: ${range || "none"}`,
      );

      // Add CORS headers for video streaming
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range");
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Range, Accept-Ranges, Content-Length, Content-Type",
      );

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        logger.info(`Range request: bytes ${start}-${end}/${fileSize}`);

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": video.mimetype || "video/mp4",
        });

        const downloadStream = bucket.openDownloadStream(gridfsObjectId, {
          start,
          end: end + 1,
        });

        downloadStream.on("error", (err) => {
          logger.error(`GridFS download stream error: ${err.message}`);
        });

        downloadStream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": video.mimetype || "video/mp4",
          "Accept-Ranges": "bytes",
        });

        const downloadStream = bucket.openDownloadStream(gridfsObjectId);

        downloadStream.on("error", (err) => {
          logger.error(`GridFS download stream error: ${err.message}`);
        });

        downloadStream.pipe(res);
      }
    } catch (error: any) {
      logger.error("Error streaming video:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new VideoController();
