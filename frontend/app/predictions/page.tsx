"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain,
  Shield,
  ShieldAlert,
  Clock,
  Trash2,
  Eye,
  Filter,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Navbar } from "@/components";
import { apiService } from "@/services/api";
import { Prediction, Video } from "@/types";
import { cn, formatPercentage, formatDate } from "@/lib/utils";

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "violence" | "non-violence">(
    "all",
  );

  useEffect(() => {
    fetchPredictions();
  }, [page, filter]);

  const fetchPredictions = async () => {
    setIsLoading(true);
    try {
      const classification = filter === "all" ? undefined : filter;
      const response = await apiService.getPredictions(
        page,
        10,
        classification,
      );
      if (response.success && response.data) {
        setPredictions(response.data);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prediction?")) return;

    try {
      await apiService.deletePrediction(id);
      fetchPredictions();
    } catch (error) {
      console.error("Failed to delete prediction:", error);
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
            <h1 className="text-3xl font-bold text-white mb-2">Predictions</h1>
            <p className="text-dark-400">View all video analysis results</p>
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
          </div>
        </motion.div>

        {/* Predictions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : predictions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <Brain className="w-16 h-16 text-dark-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Predictions Yet
            </h3>
            <p className="text-dark-400 mb-6">
              Upload and analyze videos to see predictions here
            </p>
            <Link href="/upload">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors">
                <TrendingUp className="w-5 h-5" />
                Analyze Video
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {predictions.map((prediction, index) => {
              const isViolent = prediction.classification === "violence";
              const video = prediction.videoId as Video;

              return (
                <motion.div
                  key={prediction._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "glass-card rounded-xl p-4 border-l-4",
                    isViolent ? "border-l-danger-500" : "border-l-success-500",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center",
                          isViolent ? "bg-danger-500/20" : "bg-success-500/20",
                        )}
                      >
                        {isViolent ? (
                          <ShieldAlert className="w-7 h-7 text-danger-400" />
                        ) : (
                          <Shield className="w-7 h-7 text-success-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className={cn(
                              "text-lg font-semibold capitalize",
                              isViolent
                                ? "text-danger-400"
                                : "text-success-400",
                            )}
                          >
                            {(prediction.classification ?? "unknown").replace(
                              "-",
                              " ",
                            )}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-sm font-medium",
                              isViolent
                                ? "bg-danger-500/10 text-danger-400"
                                : "bg-success-500/10 text-success-400",
                            )}
                          >
                            {formatPercentage(prediction.confidence)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-dark-400">
                          <span className="truncate max-w-xs">
                            {video && typeof video === "object"
                              ? (video.originalName ??
                                video.filename ??
                                "Unknown video")
                              : "Unknown video"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(prediction.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Probability Bar */}
                      <div className="hidden md:block w-40">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-danger-400">
                            V:{" "}
                            {formatPercentage(
                              (prediction.probabilities ?? "undefined")
                                .violence,
                            )}
                          </span>
                          <span className="text-success-400">
                            NV:{" "}
                            {formatPercentage(
                              prediction.probabilities.nonViolence,
                            )}
                          </span>
                        </div>
                        <div className="h-2 bg-dark-700 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-danger-500"
                            style={{
                              width: `${prediction.probabilities.violence * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-success-500"
                            style={{
                              width: `${prediction.probabilities.nonViolence * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/predictions/${prediction._id}`}>
                          <button className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
                            <Eye className="w-5 h-5 text-dark-400 hover:text-primary-400" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(prediction._id)}
                          className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-dark-400 hover:text-danger-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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

interface FilterButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: "primary" | "danger" | "success";
}

function FilterButton({
  children,
  active,
  onClick,
  color = "primary",
}: FilterButtonProps) {
  const colorClasses = {
    primary: active
      ? "bg-primary-500 text-white"
      : "text-dark-400 hover:text-white",
    danger: active
      ? "bg-danger-500 text-white"
      : "text-dark-400 hover:text-danger-400",
    success: active
      ? "bg-success-500 text-white"
      : "text-dark-400 hover:text-success-400",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
        colorClasses[color],
      )}
    >
      {children}
    </button>
  );
}
