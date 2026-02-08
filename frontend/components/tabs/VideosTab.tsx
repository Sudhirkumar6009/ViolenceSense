"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Trash2,
  Clock,
  Loader2,
  FileVideo,
  ShieldAlert,
  Shield,
  Brain,
  Play,
  X,
} from "lucide-react";
import { apiService } from "@/services/api";
import { Video as VideoType, Prediction } from "@/types";
import { cn, formatBytes, formatDate, formatPercentage } from "@/lib/utils";
import type { TabId } from "@/components/DashboardSidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface VideoWithPrediction extends VideoType {
  prediction?: Prediction | null;
}

interface VideosTabProps {
  onTabChange: (tab: TabId) => void;
}

export default function VideosTab({ onTabChange }: VideosTabProps) {
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
        const videosWithPredictions = await Promise.all(
          response.data.map(async (video) => {
            try {
              const predResponse = await apiService.getPredictionsByVideo(
                video._id,
              );
              const predictions = predResponse.data || [];
              return {
                ...video,
                prediction: predictions.length > 0 ? predictions[0] : null,
              };
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

  const filteredVideos = videos.filter(
    (video) => filter === "all" || getVideoStatus(video) === filter,
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Videos</h1>
          <p className="text-slate-400">
            All uploaded videos with prediction status
          </p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-xl">
          {(["all", "violence", "non-violence", "uploaded"] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
                  filter === f
                    ? f === "violence"
                      ? "bg-red-500/20 text-red-400"
                      : f === "non-violence"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-700",
                )}
              >
                {f === "non-violence"
                  ? "Non-Violence"
                  : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center"
        >
          <FileVideo className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === "all" ? "No Videos Yet" : `No ${filter} videos`}
          </h3>
          <p className="text-slate-400 mb-6">
            {filter === "all"
              ? "Upload your first video to start analyzing content"
              : "No videos match this filter"}
          </p>
          <button
            onClick={() => onTabChange("upload")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition-colors"
          >
            <Video className="w-5 h-5" /> Upload Video
          </button>
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
                "bg-slate-900 border border-slate-800 rounded-xl p-4 border-l-4",
                getVideoStatus(video) === "violence"
                  ? "border-l-red-500"
                  : getVideoStatus(video) === "non-violence"
                    ? "border-l-green-500"
                    : "border-l-slate-600",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-xl flex items-center justify-center relative cursor-pointer group",
                      getVideoStatus(video) === "violence"
                        ? "bg-red-500/20"
                        : getVideoStatus(video) === "non-violence"
                          ? "bg-green-500/20"
                          : "bg-slate-800",
                    )}
                    onClick={() => setSelectedVideo(video)}
                  >
                    <Video
                      className={cn(
                        "w-8 h-8 group-hover:opacity-50 transition-opacity",
                        getVideoStatus(video) === "violence"
                          ? "text-red-400"
                          : getVideoStatus(video) === "non-violence"
                            ? "text-green-400"
                            : "text-cyan-400",
                      )}
                    />
                    <Play className="w-6 h-6 text-white absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-white">
                        {video.originalName}
                      </h3>
                      {getVideoStatus(video) === "violence" && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold">
                          Violence
                        </span>
                      )}
                      {getVideoStatus(video) === "non-violence" && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                          Non-Violence
                        </span>
                      )}
                      {getVideoStatus(video) === "uploaded" && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs font-semibold">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
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
                                ? "text-red-400"
                                : "text-green-400",
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
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-white font-medium">View</span>
                  </button>
                  {getVideoStatus(video) === "uploaded" && (
                    <button
                      onClick={() => handleAnalyze(video._id)}
                      disabled={analyzingId === video._id}
                      className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {analyzingId === video._id ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4 text-white" />
                      )}
                      <span className="text-sm text-white font-medium">
                        {analyzingId === video._id ? "Analyzing..." : "Predict"}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(video._id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-slate-400 hover:text-red-400" />
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
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

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
            className="relative w-full max-w-4xl bg-slate-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">
                  {selectedVideo.originalName}
                </h3>
                {getVideoStatus(selectedVideo) === "violence" && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                    <ShieldAlert className="w-4 h-4" />
                    Violence
                  </span>
                )}
                {getVideoStatus(selectedVideo) === "non-violence" && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    Non-Violence
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>
            <div className="relative bg-black aspect-video flex items-center justify-center">
              {["video/mp4", "video/webm", "video/ogg"].includes(
                selectedVideo.mimetype?.toLowerCase() || "",
              ) ? (
                <video
                  key={selectedVideo._id}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                >
                  <source
                    src={`${API_URL}/videos/${selectedVideo._id}/stream`}
                    type={selectedVideo.mimetype || "video/mp4"}
                  />
                </video>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center p-8">
                  <FileVideo className="w-16 h-16 text-slate-400" />
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">
                      Video Format Not Supported
                    </h4>
                    <p className="text-slate-400 text-sm mb-4">
                      This video ({selectedVideo.mimetype || "unknown"}) cannot
                      be played in the browser.
                    </p>
                    <a
                      href={`${API_URL}/videos/${selectedVideo._id}/stream`}
                      download={selectedVideo.originalName}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors text-white font-medium"
                    >
                      <FileVideo className="w-4 h-4" /> Download Video
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-slate-400">
                  <span>Size: {formatBytes(selectedVideo.size)}</span>
                  <span>Uploaded: {formatDate(selectedVideo.uploadedAt)}</span>
                  {selectedVideo.prediction && (
                    <span
                      className={cn(
                        "font-medium",
                        getVideoStatus(selectedVideo) === "violence"
                          ? "text-red-400"
                          : "text-green-400",
                      )}
                    >
                      Confidence:{" "}
                      {formatPercentage(selectedVideo.prediction.confidence)}
                    </span>
                  )}
                </div>
                {getVideoStatus(selectedVideo) === "uploaded" && (
                  <button
                    onClick={() => {
                      handleAnalyze(selectedVideo._id);
                      setSelectedVideo(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                  >
                    <Brain className="w-4 h-4 text-white" />
                    <span className="text-sm text-white font-medium">
                      Analyze Now
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
