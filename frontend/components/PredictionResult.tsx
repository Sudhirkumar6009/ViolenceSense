"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  Activity,
  Clock,
  Target,
  Zap,
  BarChart2,
  TrendingUp,
} from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";
import { Prediction } from "@/types";

interface PredictionResultProps {
  prediction: Prediction;
}

export default function PredictionResult({
  prediction,
}: PredictionResultProps) {
  const isViolent = prediction.classification === "violence";
  const confidencePercentage = prediction.confidence * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full"
    >
      {/* Main Classification Card */}
      <div
        className={cn(
          "glass-card rounded-2xl p-8 mb-6 border-2",
          isViolent
            ? "border-danger-500/50 glow-danger"
            : "border-success-500/50 glow-success",
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={cn(
                "w-20 h-20 rounded-2xl flex items-center justify-center",
                isViolent ? "bg-danger-500/20" : "bg-success-500/20",
              )}
            >
              {isViolent ? (
                <ShieldAlert className="w-10 h-10 text-danger-400" />
              ) : (
                <Shield className="w-10 h-10 text-success-400" />
              )}
            </motion.div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                {isViolent ? "Violence Detected" : "Non-Violent Content"}
              </h2>
              <p
                className={cn(
                  "text-lg",
                  isViolent ? "text-danger-400" : "text-success-400",
                )}
              >
                {isViolent
                  ? "This video contains violent content"
                  : "This video appears to be safe"}
              </p>
            </div>
          </div>

          {/* Confidence Badge */}
          <div
            className={cn(
              "px-6 py-3 rounded-xl",
              isViolent ? "bg-danger-500/20" : "bg-success-500/20",
            )}
          >
            <div className="text-sm text-dark-400 mb-1">Confidence</div>
            <div
              className={cn(
                "text-3xl font-bold",
                isViolent ? "text-danger-400" : "text-success-400",
              )}
            >
              {confidencePercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-dark-400">Classification Confidence</span>
            <span
              className={isViolent ? "text-danger-400" : "text-success-400"}
            >
              {formatPercentage(prediction.confidence)}
            </span>
          </div>
          <div className="h-3 bg-dark-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                isViolent ? "bg-danger-500" : "bg-success-500",
              )}
            />
          </div>
        </div>

        {/* Probability Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-danger-500/10 rounded-xl border border-danger-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-danger-400" />
              <span className="text-sm text-dark-400">
                Violence Probability
              </span>
            </div>
            <div className="text-2xl font-bold text-danger-400">
              {formatPercentage(prediction.probabilities.violence)}
            </div>
          </div>
          <div className="p-4 bg-success-500/10 rounded-xl border border-success-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-success-400" />
              <span className="text-sm text-dark-400">
                Non-Violence Probability
              </span>
            </div>
            <div className="text-2xl font-bold text-success-400">
              {formatPercentage(prediction.probabilities.nonViolence)}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      {prediction.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {prediction.metrics.accuracy !== undefined && (
            <MetricCard
              icon={Target}
              label="Accuracy"
              value={formatPercentage(prediction.metrics.accuracy)}
              color="primary"
            />
          )}
          {prediction.metrics.precision !== undefined && (
            <MetricCard
              icon={Zap}
              label="Precision"
              value={formatPercentage(prediction.metrics.precision)}
              color="primary"
            />
          )}
          {prediction.metrics.recall !== undefined && (
            <MetricCard
              icon={TrendingUp}
              label="Recall"
              value={formatPercentage(prediction.metrics.recall)}
              color="primary"
            />
          )}
          {prediction.metrics.inferenceTime !== undefined && (
            <MetricCard
              icon={Clock}
              label="Inference Time"
              value={`${prediction.metrics.inferenceTime.toFixed(2)}s`}
              color="primary"
            />
          )}
        </div>
      )}

      {/* Frame Analysis */}
      {prediction.frameAnalysis && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">Frame Analysis</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-dark-800/50 rounded-xl">
              <div className="text-2xl font-bold text-white mb-1">
                {prediction.frameAnalysis.totalFrames}
              </div>
              <div className="text-sm text-dark-400">Total Frames</div>
            </div>
            <div className="text-center p-4 bg-danger-500/10 rounded-xl border border-danger-500/20">
              <div className="text-2xl font-bold text-danger-400 mb-1">
                {prediction.frameAnalysis.violentFrames}
              </div>
              <div className="text-sm text-dark-400">Violent Frames</div>
            </div>
            <div className="text-center p-4 bg-success-500/10 rounded-xl border border-success-500/20">
              <div className="text-2xl font-bold text-success-400 mb-1">
                {prediction.frameAnalysis.nonViolentFrames}
              </div>
              <div className="text-sm text-dark-400">Non-Violent Frames</div>
            </div>
          </div>

          {/* Frame Score Visualization */}
          {prediction.frameAnalysis.frameScores && (
            <div>
              <div className="text-sm text-dark-400 mb-2">
                Frame-by-Frame Violence Score
              </div>
              <div className="flex gap-1 h-12">
                {prediction.frameAnalysis.frameScores.map((score, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ height: 0 }}
                    animate={{ height: `${score * 100}%` }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    className={cn(
                      "flex-1 rounded-t-sm",
                      score > 0.5 ? "bg-danger-500" : "bg-success-500",
                    )}
                    title={`Frame ${idx + 1}: ${(score * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "primary" | "success" | "danger";
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    primary: "text-primary-400 bg-primary-500/10 border-primary-500/20",
    success: "text-success-400 bg-success-500/10 border-success-500/20",
    danger: "text-danger-400 bg-danger-500/10 border-danger-500/20",
  };

  return (
    <div className={cn("p-4 rounded-xl border", colorClasses[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", `text-${color}-400`)} />
        <span className="text-sm text-dark-400">{label}</span>
      </div>
      <div className={cn("text-xl font-bold", `text-${color}-400`)}>
        {value}
      </div>
    </div>
  );
}
