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
} from "lucide-react";
import { Navbar } from "@/components";
import { apiService } from "@/services/api";
import { Video as VideoType, Prediction } from "@/types";
import { cn, formatBytes, formatDate, formatPercentage } from "@/lib/utils";

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

  const getStatusBadge = (video: VideoWithPrediction) => {
    const status = getVideoStatus(video);

    if (status === "violence") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger-500/10 text-danger-400 text-sm font-medium">
          <ShieldAlert className="w-4 h-4" />
          Violence
        </div>
      );
    }

    if (status === "non-violence") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 text-success-400 text-sm font-medium">
          <Shield className="w-4 h-4" />
          Non-Violence
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700 text-dark-400 text-sm font-medium">
        <Clock className="w-4 h-4" />
        Uploaded
      </div>
    );
  };

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
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center",
                        getVideoStatus(video) === "violence"
                          ? "bg-danger-500/20"
                          : getVideoStatus(video) === "non-violence"
                            ? "bg-success-500/20"
                            : "bg-dark-800",
                      )}
                    >
                      <Video
                        className={cn(
                          "w-8 h-8",
                          getVideoStatus(video) === "violence"
                            ? "text-danger-400"
                            : getVideoStatus(video) === "non-violence"
                              ? "text-success-400"
                              : "text-primary-400",
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        {video.originalName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        <span>{formatBytes(video.size)}</span>
                        <span>•</span>
                        <span>{formatDate(video.uploadedAt)}</span>
                        {video.prediction && (
                          <>
                            <span>•</span>
                            <span
                              className={cn(
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

                  <div className="flex items-center gap-4">
                    {getStatusBadge(video)}

                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => handleDelete(video._id)}
                        className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-dark-400 hover:text-danger-400" />
                      </button>
                    </div>
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
