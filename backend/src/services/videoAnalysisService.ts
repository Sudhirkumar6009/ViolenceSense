import { Video, IVideo, Prediction, ModelConfig } from "../models";
import mlService, { InferenceResponse } from "./mlService";
import logger from "../utils/logger";
import mongoose from "mongoose";

export interface AnalysisResult {
  success: boolean;
  prediction?: {
    id: string;
    classification: string;
    confidence: number;
    probabilities: {
      violence: number;
      nonViolence: number;
    };
    metrics?: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1Score?: number;
      inferenceTime?: number;
    };
    frameAnalysis?: {
      totalFrames: number;
      violentFrames: number;
      nonViolentFrames: number;
    };
  };
  error?: string;
}

class VideoAnalysisService {
  async analyzeVideo(videoId: string): Promise<AnalysisResult> {
    try {
      // Find the video
      const video = await Video.findById(videoId);
      if (!video) {
        return {
          success: false,
          error: "Video not found",
        };
      }

      // Get active model config
      const activeModel = await ModelConfig.findOne({ isActive: true });
      if (!activeModel) {
        return {
          success: false,
          error: "No active model configured. Please load a model first.",
        };
      }

      // Update video status to processing
      video.status = "processing";
      await video.save();

      // Create prediction record
      const prediction = new Prediction({
        videoId: video._id,
        modelId: activeModel._id,
        status: "running",
      });
      await prediction.save();

      // Run inference
      logger.info(`Starting inference for video: ${video.filename}`);
      const inferenceResult: InferenceResponse = await mlService.runInference({
        videoPath: video.path,
        modelPath: activeModel.modelPath,
        architecture: activeModel.architecture,
        numFrames: activeModel.inputSize.frames,
      });

      if (!inferenceResult.success) {
        prediction.status = "failed";
        prediction.error = inferenceResult.error || "Inference failed";
        await prediction.save();

        video.status = "failed";
        await video.save();

        return {
          success: false,
          error: inferenceResult.error || "Inference failed",
        };
      }

      // Update prediction with results
      prediction.classification = inferenceResult.classification;
      prediction.confidence = inferenceResult.confidence;
      prediction.probabilities = inferenceResult.probabilities;
      prediction.metrics = {
        inferenceTime: inferenceResult.metrics.inferenceTime,
      };

      if (inferenceResult.frameAnalysis) {
        prediction.frameAnalysis = inferenceResult.frameAnalysis;
      }

      prediction.status = "completed";
      prediction.completedAt = new Date();
      await prediction.save();

      // Update video status
      video.status = "completed";
      video.processedAt = new Date();
      await video.save();

      // Update model performance stats
      await this.updateModelPerformance(activeModel._id, inferenceResult);

      logger.info(`Analysis completed for video: ${video.filename}`);

      return {
        success: true,
        prediction: {
          id: prediction._id.toString(),
          classification: prediction.classification,
          confidence: prediction.confidence,
          probabilities: prediction.probabilities,
          metrics: prediction.metrics,
          frameAnalysis: prediction.frameAnalysis
            ? {
                totalFrames: prediction.frameAnalysis.totalFrames,
                violentFrames: prediction.frameAnalysis.violentFrames,
                nonViolentFrames: prediction.frameAnalysis.nonViolentFrames,
              }
            : undefined,
        },
      };
    } catch (error: any) {
      logger.error("Video analysis failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async updateModelPerformance(
    modelId: mongoose.Types.ObjectId,
    result: InferenceResponse,
  ): Promise<void> {
    try {
      const model = await ModelConfig.findById(modelId);
      if (!model) return;

      const totalPredictions = (model.performance?.totalPredictions || 0) + 1;
      const currentAvgTime = model.performance?.avgInferenceTime || 0;
      const newAvgTime =
        (currentAvgTime * (totalPredictions - 1) +
          result.metrics.inferenceTime) /
        totalPredictions;

      await ModelConfig.findByIdAndUpdate(modelId, {
        $set: {
          "performance.totalPredictions": totalPredictions,
          "performance.avgInferenceTime": newAvgTime,
        },
      });
    } catch (error) {
      logger.error("Failed to update model performance:", error);
    }
  }

  async getVideoWithPrediction(videoId: string) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        return null;
      }

      const prediction = await Prediction.findOne({ videoId: video._id })
        .sort({ createdAt: -1 })
        .populate("modelId", "name architecture");

      return {
        video,
        prediction,
      };
    } catch (error) {
      logger.error("Failed to get video with prediction:", error);
      return null;
    }
  }
}

export default new VideoAnalysisService();
