import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { Video } from "../models";
import { videoAnalysisService } from "../services";
import config from "../config";
import logger from "../utils/logger";

class VideoController {
  // POST /api/v1/videos/upload - Upload a video file
  async uploadVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "No video file provided",
        });
        return;
      }

      const video = new Video({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        status: "uploaded",
      });

      await video.save();

      logger.info(`Video uploaded: ${video.filename}`);

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
        message: "Video uploaded successfully",
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

  // DELETE /api/v1/videos/:id - Delete video
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

      // Delete file from disk
      if (fs.existsSync(video.path)) {
        fs.unlinkSync(video.path);
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

  // GET /api/v1/videos/:id/stream - Stream video file
  async streamVideo(req: Request, res: Response): Promise<void> {
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

      if (!fs.existsSync(video.path)) {
        res.status(404).json({
          success: false,
          error: "Video file not found on disk",
        });
        return;
      }

      const stat = fs.statSync(video.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;
        const file = fs.createReadStream(video.path, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": video.mimetype,
        });

        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": video.mimetype,
        });

        fs.createReadStream(video.path).pipe(res);
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
