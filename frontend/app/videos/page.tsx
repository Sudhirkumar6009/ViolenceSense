"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Video,
  Play,
  Trash2,
  Clock,
  CheckCircle,
  Loader2,
  XCircle,
  FileVideo,
  Brain,
} from "lucide-react";
import { Navbar } from "@/components";
import { apiService } from "@/services/api";
import { Video as VideoType } from "@/types";
import { cn, formatBytes, formatDate, getStatusColor } from "@/lib/utils";

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchVideos();
  }, [page]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getVideos(page, 10);
      if (response.success && response.data) {
        setVideos(response.data);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-danger-500" />;
      default:
        return <Clock className="w-4 h-4 text-dark-400" />;
    }
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
            <p className="text-dark-400">Manage your uploaded video files</p>
          </div>
          <Link href="/upload">
            <button className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-all glow-primary">
              <Video className="w-5 h-5" />
              Upload New
            </button>
          </Link>
        </motion.div>

        {/* Videos Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <FileVideo className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Videos Yet
            </h3>
            <p className="text-dark-400 mb-6">
              Upload your first video to start analyzing content
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
            {videos.map((video, index) => (
              <motion.div
                key={video._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-xl p-4 hover:border-primary-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-dark-800 flex items-center justify-center">
                      <Video className="w-8 h-8 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white mb-1">
                        {video.originalName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-dark-400">
                        <span>{formatBytes(video.size)}</span>
                        <span>•</span>
                        <span>{formatDate(video.uploadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                        video.status === "completed"
                          ? "bg-success-500/10 text-success-400"
                          : video.status === "processing"
                            ? "bg-primary-500/10 text-primary-400"
                            : video.status === "failed"
                              ? "bg-danger-500/10 text-danger-400"
                              : "bg-dark-700 text-dark-400",
                      )}
                    >
                      {getStatusIcon(video.status)}
                      <span className="capitalize">{video.status}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/videos/${video._id}`}>
                        <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                          <Play className="w-5 h-5 text-dark-400 hover:text-primary-400" />
                        </button>
                      </Link>
                      {video.status === "uploaded" && (
                        <Link href={`/upload?videoId=${video._id}`}>
                          <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                            <Brain className="w-5 h-5 text-dark-400 hover:text-primary-400" />
                          </button>
                        </Link>
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
