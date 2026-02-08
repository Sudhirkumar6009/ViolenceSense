"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Video,
  Brain,
  ArrowRight,
  CheckCircle,
  Upload,
  ShieldAlert,
  Shield,
} from "lucide-react";
import { VideoUpload } from "@/components";
import { apiService } from "@/services/api";
import { Prediction } from "@/types";
import { useAppStore } from "@/hooks/useStore";
import { cn, formatPercentage } from "@/lib/utils";

export default function UploadTab() {
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showNotification } = useAppStore();

  const handleUploadComplete = (videoId: string, fileName?: string) => {
    setUploadedVideoId(videoId);
    setUploadedFileName(fileName || "video");
    setPrediction(null);
    setError(null);
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

  const isViolent = prediction?.classification === "violence";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Violence Detection
        </h1>
        <p className="text-slate-400">
          Upload a video and detect violent content using AI
        </p>
      </motion.div>

      {/* Step 1: Upload */}
      {!uploadedVideoId && !prediction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <VideoUpload onUploadComplete={handleUploadComplete} />
        </motion.div>
      )}

      {/* Step 2: Uploaded - Predict */}
      {uploadedVideoId && !prediction && !isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">
                Video Uploaded Successfully!
              </h3>
              <p className="text-sm text-slate-400">{uploadedFileName}</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-3 px-10 py-5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            <Brain className="w-7 h-7" />
            Predict Violence
            <ArrowRight className="w-6 h-6" />
          </button>

          <p className="text-slate-500 text-sm mb-6">
            Click to analyze this video for violent content
          </p>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload a different video
          </button>
        </motion.div>
      )}

      {/* Analyzing */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center"
        >
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
            <Brain className="w-10 h-10 text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Predicting Violence...
          </h3>
          <p className="text-slate-400 mb-2">{uploadedFileName}</p>
          <p className="text-slate-500 mb-6">
            AI model is analyzing video frames for violent content
          </p>
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">16</div>
              <div className="text-sm text-slate-500">Frames</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">224×224</div>
              <div className="text-sm text-slate-500">Resolution</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">VideoMAE</div>
              <div className="text-sm text-slate-500">Model</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 3: Result */}
      {prediction && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div
            className={cn(
              "bg-slate-900 border-2 rounded-2xl p-8 text-center",
              isViolent ? "border-red-500/50" : "border-green-500/50",
            )}
          >
            <div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6",
                isViolent ? "bg-red-500/20" : "bg-green-500/20",
              )}
            >
              {isViolent ? (
                <ShieldAlert className="w-12 h-12 text-red-400" />
              ) : (
                <Shield className="w-12 h-12 text-green-400" />
              )}
            </div>

            <h2
              className={cn(
                "text-3xl font-bold mb-2",
                isViolent ? "text-red-400" : "text-green-400",
              )}
            >
              {isViolent ? "VIOLENCE DETECTED" : "NON-VIOLENT"}
            </h2>
            <p className="text-slate-400 mb-4">{uploadedFileName}</p>

            <div className="mb-6">
              <p className="text-sm text-slate-500 mb-2">Confidence</p>
              <p
                className={cn(
                  "text-4xl font-bold",
                  isViolent ? "text-red-400" : "text-green-400",
                )}
              >
                {formatPercentage(prediction.confidence)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
              <div className="bg-red-500/10 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-1">Violence</p>
                <p className="text-xl font-bold text-red-400">
                  {formatPercentage(prediction.probabilities?.violence || 0)}
                </p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4">
                <p className="text-sm text-slate-400 mb-1">Non-Violence</p>
                <p className="text-xl font-bold text-green-400">
                  {formatPercentage(prediction.probabilities?.nonViolence || 0)}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-colors"
            >
              <Video className="w-5 h-5" />
              Analyze Another Video
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
