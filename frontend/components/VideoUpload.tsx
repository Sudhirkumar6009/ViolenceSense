"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileVideo,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { apiService } from "@/services/api";
import { useAppStore } from "@/hooks/useStore";

interface VideoUploadProps {
  onUploadComplete?: (videoId: string, fileName?: string) => void;
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const {
    isUploading,
    setIsUploading,
    uploadProgress,
    setUploadProgress,
    showNotification,
  } = useAppStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadStatus("idle");
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/avi": [".avi"],
      "video/quicktime": [".mov"],
      "video/x-matroska": [".mkv"],
    },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500MB
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      const response = await apiService.uploadVideo(
        selectedFile,
        (progress) => {
          setUploadProgress(progress);
        },
      );

      if (response.success && response.data) {
        setUploadStatus("success");
        showNotification("success", "Video uploaded successfully!");
        onUploadComplete?.(response.data._id, selectedFile.name);
      } else {
        throw new Error(response.error || "Upload failed");
      }
    } catch (err: any) {
      setUploadStatus("error");
      setError(err.message || "Failed to upload video");
      showNotification("error", err.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setError(null);
    setUploadProgress(0);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                isDragActive
                  ? "border-primary-500 bg-primary-500/10 glow-primary"
                  : "border-dark-600 hover:border-primary-500/50 hover:bg-primary-500/5",
              )}
            >
              <input {...getInputProps()} />

              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center"
              >
                <div
                  className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                    isDragActive ? "bg-primary-500/20" : "bg-dark-800",
                  )}
                >
                  <Upload
                    className={cn(
                      "w-10 h-10",
                      isDragActive ? "text-primary-400" : "text-dark-400",
                    )}
                  />
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">
                  {isDragActive
                    ? "Drop your video here"
                    : "Upload Video for Analysis"}
                </h3>

                <p className="text-dark-400 mb-4">
                  Drag and drop your video file, or click to browse
                </p>

                <div className="flex items-center gap-3 text-sm text-dark-500">
                  <span className="flex items-center gap-1">
                    <FileVideo className="w-4 h-4" />
                    MP4, AVI, MOV, MKV
                  </span>
                  <span>•</span>
                  <span>Max 500MB</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Video className="w-8 h-8 text-primary-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">
                    {selectedFile.name}
                  </h4>
                  <p className="text-sm text-dark-400">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
              </div>

              {uploadStatus === "idle" && (
                <button
                  onClick={clearFile}
                  className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            {uploadStatus === "uploading" && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-dark-400">Uploading...</span>
                  <span className="text-primary-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Status Messages */}
            {uploadStatus === "success" && (
              <div className="flex items-center gap-3 p-4 bg-success-500/10 border border-success-500/30 rounded-xl mb-6">
                <CheckCircle className="w-5 h-5 text-success-500" />
                <span className="text-success-400">
                  Video uploaded successfully!
                </span>
              </div>
            )}

            {uploadStatus === "error" && (
              <div className="flex items-center gap-3 p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl mb-6">
                <AlertCircle className="w-5 h-5 text-danger-500" />
                <span className="text-danger-400">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {uploadStatus === "idle" && (
                <>
                  <button
                    onClick={handleUpload}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all glow-primary"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Video
                  </button>
                  <button
                    onClick={clearFile}
                    className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}

              {uploadStatus === "uploading" && (
                <button
                  disabled
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-dark-700 text-dark-400 rounded-xl font-medium cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </button>
              )}

              {(uploadStatus === "success" || uploadStatus === "error") && (
                <button
                  onClick={clearFile}
                  className="flex-1 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-colors"
                >
                  Upload Another Video
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
