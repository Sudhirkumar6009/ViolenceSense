"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Brain,
  Loader2,
  ArrowRight,
  CheckCircle,
  Upload,
} from "lucide-react";
import { Navbar, VideoUpload, PredictionResult } from "@/components";
import { apiService } from "@/services/api";
import { Prediction } from "@/types";
import { useAppStore } from "@/hooks/useStore";

export default function UploadPage() {
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showNotification } = useAppStore();

  const handleUploadComplete = async (videoId: string, fileName?: string) => {
    setUploadedVideoId(videoId);
    setUploadedFileName(fileName || "video");
    setPrediction(null);
    setError(null);

    // Automatically start analysis after upload
    setIsAnalyzing(true);

    try {
      const response = await apiService.runInference(videoId);

      if (response.success && response.data) {
        setPrediction(response.data);
        showNotification("success", "Analysis completed successfully!");
      } else {
        throw new Error(response.error || "Analysis failed");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || "Analysis failed";
      setError(errorMessage);
      showNotification("error", errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedVideoId) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await apiService.runInference(uploadedVideoId);

      if (response.success && response.data) {
        setPrediction(response.data);
        showNotification("success", "Analysis completed successfully!");
      } else {
        throw new Error(response.error || "Analysis failed");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || "Analysis failed";
      setError(errorMessage);
      showNotification("error", errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setUploadedVideoId(null);
    setUploadedFileName(null);
    setPrediction(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Video Analysis</h1>
          <p className="text-dark-400">
            Upload a video file to detect violent content using AI
          </p>
        </motion.div>

        {/* Upload Section - Only show if no video uploaded yet */}
        {!uploadedVideoId && !prediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </motion.div>
        )}

        {/* Error State - Show after analysis fails */}
        {uploadedVideoId && !prediction && !isAnalyzing && error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-8 text-center mb-8"
          >
            <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl text-danger-400 mb-6">
              {error}
            </div>

            {/* Retry Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-3 px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg shadow-lg glow-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              <Brain className="w-7 h-7" />
              Retry Analysis
              <ArrowRight className="w-6 h-6" />
            </button>

            {/* Upload Another Button */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-dark-400 hover:text-white transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload a different video
            </button>
          </motion.div>
        )}

        {/* Analysis Processing Animation */}
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-12 text-center"
          >
            <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
              <Brain className="w-10 h-10 text-primary-400" />
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              {uploadedFileName
                ? `Analyzing: ${uploadedFileName}`
                : "Analyzing Video Content"}
            </h3>
            <p className="text-dark-400 mb-6">
              Our AI model is processing your video for violence detection...
            </p>

            <div className="flex justify-center gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-primary-400">16</div>
                <div className="text-sm text-dark-500">Frames</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-400">
                  224×224
                </div>
                <div className="text-sm text-dark-500">Resolution</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary-400">
                  VideoMAE
                </div>
                <div className="text-sm text-dark-500">Model</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PredictionResult prediction={prediction} />

            <div className="text-center mt-8">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-medium transition-colors"
              >
                <Video className="w-5 h-5" />
                Analyze Another Video
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
