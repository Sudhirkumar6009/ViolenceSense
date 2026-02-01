import { Router } from "express";
import { videoController } from "../controllers";
import { upload, handleUploadError } from "../middleware";

const router = Router();

/**
 * @route   POST /api/v1/videos/upload
 * @desc    Upload a video file for analysis
 * @access  Public
 */
router.post(
  "/upload",
  upload.single("video"),
  handleUploadError,
  videoController.uploadVideo,
);

/**
 * @route   GET /api/v1/videos
 * @desc    Get all videos with pagination
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10)
 * @query   status - Filter by status (uploaded/processing/completed/failed)
 * @access  Public
 */
router.get("/", videoController.getAllVideos);

/**
 * @route   GET /api/v1/videos/:id
 * @desc    Get video details by ID with prediction
 * @access  Public
 */
router.get("/:id", videoController.getVideoById);

/**
 * @route   DELETE /api/v1/videos/:id
 * @desc    Delete a video and its associated data
 * @access  Public
 */
router.delete("/:id", videoController.deleteVideo);

/**
 * @route   GET /api/v1/videos/:id/stream
 * @desc    Stream video file with range support
 * @access  Public
 */
router.get("/:id/stream", videoController.streamVideo);

export default router;
