"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Video,
  Trash2,
  Clock,
  Loader2,
  FileVideo,
  ShieldAlert,
  Shield,
  Brain,
  Filter,
  Play,
  X,
} from "lucide-react";
import { Navbar } from "@/components";
import { apiService } from "@/services/api";
import { Video as VideoType, Prediction } from "@/types";
import { cn, formatBytes, formatDate, formatPercentage } from "../../lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface VideoWithPrediction extends VideoType {
  prediction?: Prediction | null;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoWithPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<
    "all" | "violence" | "non-violence" | "uploaded"
  >("all");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] =
    useState<VideoWithPrediction | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [page]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getVideos(page, 20);
      if (response.success && response.data) {
        // Fetch predictions for each video
        const videosWithPredictions = await Promise.all(
          response.data.map(async (video) => {
            try {
              const predResponse = await apiService.getPredictionsByVideo(
                video._id,
              );
              const predictions = predResponse.data || [];
              const latestPrediction =
                predictions.length > 0 ? predictions[0] : null;
              return { ...video, prediction: latestPrediction };
            } catch {
              return { ...video, prediction: null };
            }
          }),
        );
        setVideos(videosWithPredictions);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      await apiService.deleteVideo(id);
      fetchVideos();
    } catch (error) {
      console.error("Failed to delete video:", error);
    }
  };

  const handleAnalyze = async (videoId: string) => {
    setAnalyzingId(videoId);
    try {
      await apiService.runInference(videoId);
      fetchVideos();
    } catch (error) {
      console.error("Failed to analyze video:", error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const getVideoStatus = (video: VideoWithPrediction) => {
    if (video.prediction?.classification === "violence") return "violence";
    if (video.prediction?.classification === "non-violence")
      return "non-violence";
    return "uploaded";
  };

  const filteredVideos = videos.filter((video) => {
    if (filter === "all") return true;
    return getVideoStatus(video) === filter;
  });

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Videos</h1>
            <p className="text-dark-400">
              All uploaded videos with prediction status
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 p-1 bg-dark-800 rounded-xl">
            <FilterButton
              active={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === "violence"}
              onClick={() => setFilter("violence")}
              color="danger"
            >
              Violence
            </FilterButton>
            <FilterButton
              active={filter === "non-violence"}
              onClick={() => setFilter("non-violence")}
              color="success"
            >
              Non-Violence
            </FilterButton>
            <FilterButton
              active={filter === "uploaded"}
              onClick={() => setFilter("uploaded")}
            >
              Uploaded
            </FilterButton>
          </div>
        </motion.div>

        {/* Videos Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <FileVideo className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === "all" ? "No Videos Yet" : `No ${filter} videos`}
            </h3>
            <p className="text-dark-400 mb-6">
              {filter === "all"
                ? "Upload your first video to start analyzing content"
                : "No videos match this filter"}
            </p>
            <Link href="/upload">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors">
                <Video className="w-5 h-5" />
                Upload Video
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "glass-card rounded-xl p-4 border-l-4 transition-all",
                  getVideoStatus(video) === "violence"
                    ? "border-l-danger-500"
                    : getVideoStatus(video) === "non-violence"
                      ? "border-l-success-500"
                      : "border-l-dark-600",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Video Thumbnail/Icon with Status */}
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center relative cursor-pointer group",
                        getVideoStatus(video) === "violence"
                          ? "bg-danger-500/20"
                          : getVideoStatus(video) === "non-violence"
                            ? "bg-success-500/20"
                            : "bg-dark-800",
                      )}
                      onClick={() => setSelectedVideo(video)}
                    >
                      <Video
                        className={cn(
                          "w-8 h-8 group-hover:opacity-50 transition-opacity",
                          getVideoStatus(video) === "violence"
                            ? "text-danger-400"
                            : getVideoStatus(video) === "non-violence"
                              ? "text-success-400"
                              : "text-primary-400",
                        )}
                      />
                      <Play className="w-6 h-6 text-white absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Video Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-white">
                          {video.originalName}
                        </h3>
                        {/* Inline Status Badge */}
                        {getVideoStatus(video) === "violence" && (
                          <span className="px-2 py-0.5 rounded-full bg-danger-500/20 text-danger-400 text-xs font-semibold">
                            Violence
                          </span>
                        )}
                        {getVideoStatus(video) === "non-violence" && (
                          <span className="px-2 py-0.5 rounded-full bg-success-500/20 text-success-400 text-xs font-semibold">
                            Non-Violence
                          </span>
                        )}
                        {getVideoStatus(video) === "uploaded" && (
                          <span className="px-2 py-0.5 rounded-full bg-dark-700 text-dark-400 text-xs font-semibold">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        <span>{formatBytes(video.size)}</span>
                        <span>•</span>
                        <span>{formatDate(video.uploadedAt)}</span>
                        {video.prediction && (
                          <>
                            <span>•</span>
                            <span
                              className={cn(
                                "font-medium",
                                getVideoStatus(video) === "violence"
                                  ? "text-danger-400"
                                  : "text-success-400",
                              )}
                            >
                              {formatPercentage(video.prediction.confidence)}{" "}
                              confidence
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Video Button */}
                    <button
                      onClick={() => setSelectedVideo(video)}
                      className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4 text-primary-400" />
                      <span className="text-sm text-white font-medium">
                        View Video
                      </span>
                    </button>

                    {/* Analyze Button */}
                    {getVideoStatus(video) === "uploaded" && (
                      <button
                        onClick={() => handleAnalyze(video._id)}
                        disabled={analyzingId === video._id}
                        className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {analyzingId === video._id ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4 text-white" />
                        )}
                        <span className="text-sm text-white font-medium">
                          {analyzingId === video._id
                            ? "Analyzing..."
                            : "Predict"}
                        </span>
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(video._id)}
                      className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-dark-400 hover:text-danger-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-dark-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-dark-800 hover:bg-dark-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Video Player Modal */}
      {selectedVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl bg-dark-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">
                  {selectedVideo.originalName}
                </h3>
                {getVideoStatus(selectedVideo) === "violence" && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger-500/20 text-danger-400 text-sm font-medium">
                    <ShieldAlert className="w-4 h-4" />
                    Violence Detected
                  </span>
                )}
                {getVideoStatus(selectedVideo) === "non-violence" && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-500/20 text-success-400 text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    Non-Violence
                  </span>
                )}
                {getVideoStatus(selectedVideo) === "uploaded" && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-700 text-dark-400 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    Not Analyzed
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-dark-400 hover:text-white" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {/* Check if video format is browser-supported */}
              {["video/mp4", "video/webm", "video/ogg"].includes(
                selectedVideo.mimetype?.toLowerCase() || "",
              ) ? (
                <video
                  key={selectedVideo._id}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error("Video playback error:", e);
                  }}
                >
                  <source
                    src={`${API_URL}/videos/${selectedVideo._id}/stream`}
                    type={selectedVideo.mimetype || "video/mp4"}
                  />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                  <FileVideo className="w-16 h-16 text-dark-400" />
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">
                      Video Format Not Supported
                    </h4>
                    <p className="text-dark-400 text-sm mb-4">
                      This video ({selectedVideo.mimetype || "unknown format"})
                      cannot be played directly in the browser.
                      <br />
                      Please download it to play with a media player like VLC.
                    </p>
                    <a
                      href={`${API_URL}/videos/${selectedVideo._id}/stream`}
                      download={selectedVideo.originalName}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors text-white font-medium"
                    >
                      <FileVideo className="w-4 h-4" />
                      Download Video
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Video Info Footer */}
            <div className="p-4 border-t border-dark-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-dark-400">
                  <span>Size: {formatBytes(selectedVideo.size)}</span>
                  <span>Uploaded: {formatDate(selectedVideo.uploadedAt)}</span>
                  {selectedVideo.prediction && (
                    <span
                      className={cn(
                        "font-medium",
                        getVideoStatus(selectedVideo) === "violence"
                          ? "text-danger-400"
                          : "text-success-400",
                      )}
                    >
                      Confidence:{" "}
                      {formatPercentage(selectedVideo.prediction.confidence)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getVideoStatus(selectedVideo) === "uploaded" && (
                    <button
                      onClick={() => {
                        handleAnalyze(selectedVideo._id);
                        setSelectedVideo(null);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                    >
                      <Brain className="w-4 h-4 text-white" />
                      <span className="text-sm text-white font-medium">
                        Analyze Now
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: "danger" | "success";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? color === "danger"
            ? "bg-danger-500/20 text-danger-400"
            : color === "success"
              ? "bg-success-500/20 text-success-400"
              : "bg-primary-500/20 text-primary-400"
          : "text-dark-400 hover:text-white hover:bg-dark-700",
      )}
    >
      {children}
    </button>
  );
}
