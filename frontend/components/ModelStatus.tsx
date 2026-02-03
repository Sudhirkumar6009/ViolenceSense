"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Zap,
  BarChart2,
  HardDrive,
} from "lucide-react";
import { cn, formatPercentage } from "@/lib/utils";
import { ModelStatusResponse, ModelMetricsResponse } from "@/types";

interface ModelStatusProps {
  status: ModelStatusResponse | null;
  metrics?: ModelMetricsResponse | null;
}

export default function ModelStatus({ status, metrics }: ModelStatusProps) {
  if (!status) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <Cpu className="w-12 h-12 text-dark-500 mx-auto mb-3" />
        <p className="text-dark-400">Loading model status...</p>
      </div>
    );
  }

  const hasActiveModel = status.hasActiveModel;
  const model = status.model;
  const mlService = status.mlService;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Model Status Card */}
      <div
        className={cn(
          "glass-card rounded-2xl p-6 border-2",
          hasActiveModel ? "border-success-500/30" : "border-dark-600",
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                hasActiveModel ? "bg-success-500/20" : "bg-dark-700",
              )}
            >
              <Cpu
                className={cn(
                  "w-7 h-7",
                  hasActiveModel ? "text-success-400" : "text-dark-400",
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {hasActiveModel ? "Model Active" : "No Model Loaded"}
              </h3>
              <p
                className={cn(
                  "text-sm",
                  hasActiveModel ? "text-success-400" : "text-dark-400",
                )}
              >
                {hasActiveModel
                  ? "Ready for inference"
                  : "Load a model to start analysis"}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              hasActiveModel
                ? "bg-success-500/10 text-success-400"
                : "bg-dark-700 text-dark-400",
            )}
          >
            {hasActiveModel ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Online</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Offline</span>
              </>
            )}
          </div>
        </div>

        {model && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-dark-800/50 rounded-xl">
              <div className="text-sm text-dark-400 mb-1">Model Name</div>
              <div className="font-medium text-white">{model.name}</div>
            </div>
            <div className="p-4 bg-dark-800/50 rounded-xl">
              <div className="text-sm text-dark-400 mb-1">Architecture</div>
              <div className="font-medium text-white capitalize">
                {model.architecture}
              </div>
            </div>
            <div className="p-4 bg-dark-800/50 rounded-xl col-span-2">
              <div className="text-sm text-dark-400 mb-1">Model Path</div>
              <div className="font-mono text-sm text-primary-400 break-all">
                {model.modelPath}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GPU Status Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <HardDrive className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">GPU Status</h3>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
              mlService.gpuAvailable
                ? "bg-success-500/10 text-success-400"
                : "bg-dark-700 text-dark-400",
            )}
          >
            {mlService.gpuAvailable ? (
              <>
                <CheckCircle className="w-4 h-4" />
                GPU Available
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                CPU Only
              </>
            )}
          </div>
        </div>

        {mlService.gpuMemory && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Memory Usage</span>
              <span className="text-white">
                {(mlService.gpuMemory.used / 1024 / 1024 / 1024).toFixed(2)} GB
                / {(mlService.gpuMemory.total / 1024 / 1024 / 1024).toFixed(2)}{" "}
                GB
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500"
                style={{
                  width: `${(mlService.gpuMemory.used / mlService.gpuMemory.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics Card */}
      {metrics && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart2 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">
              Performance Metrics
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.performance?.accuracy !== undefined && (
              <MetricItem
                icon={Target}
                label="Accuracy"
                value={formatPercentage(metrics.performance.accuracy)}
              />
            )}
            {metrics.performance?.precision !== undefined && (
              <MetricItem
                icon={Zap}
                label="Precision"
                value={formatPercentage(metrics.performance.precision)}
              />
            )}
            {metrics.performance?.recall !== undefined && (
              <MetricItem
                icon={BarChart2}
                label="Recall"
                value={formatPercentage(metrics.performance.recall)}
              />
            )}
            {metrics.performance?.avgInferenceTime !== undefined && (
              <MetricItem
                icon={Clock}
                label="Avg. Time"
                value={`${metrics.performance.avgInferenceTime.toFixed(2)}s`}
              />
            )}
          </div>

          {metrics.performance?.totalPredictions !== undefined && (
            <div className="mt-4 p-4 bg-dark-800/50 rounded-xl text-center">
              <div className="text-2xl font-bold text-primary-400">
                {metrics.performance.totalPredictions}
              </div>
              <div className="text-sm text-dark-400">Total Predictions</div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function MetricItem({ icon: Icon, label, value }: MetricItemProps) {
  return (
    <div className="p-4 bg-dark-800/50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-primary-400" />
        <span className="text-sm text-dark-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
