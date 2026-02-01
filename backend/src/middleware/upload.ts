import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import config from "../config";
import logger from "../utils/logger";

// Use memory storage for GridFS uploads (videos stored in MongoDB)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  if (config.upload.allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${config.upload.allowedExtensions.join(", ")}`,
      ),
    );
  }
};

// Multer upload instance with memory storage
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Error handler for multer
export const handleUploadError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size: ${config.upload.maxFileSize / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err) {
    logger.error("Upload error:", err);
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  next();
};
