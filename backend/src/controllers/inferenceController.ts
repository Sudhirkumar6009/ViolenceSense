import { Request, Response } from "express";
import { Prediction, Video, ModelConfig } from "../models";
import { videoAnalysisService, mlService } from "../services";
import logger from "../utils/logger";
import config from "../config";

class InferenceController {
  // POST /api/v1/inference/predict - Run inference on a video
  async predict(req: Request, res: Response): Promise<void> {
    try {
      logger.info(`Inference request body: ${JSON.stringify(req.body)}`);
      const { videoId } = req.body;

      if (!videoId) {
        logger.warn(
          `Missing videoId in request body: ${JSON.stringify(req.body)}`,
        );
        res.status(400).json({
          success: false,
          error: "Video ID is required",
        });
        return;
      }

      // Check if video exists
      const video = await Video.findById(videoId);
      if (!video) {
        res.status(404).json({
          success: false,
          error: "Video not found",
        });
        return;
      }

      // Check if model is loaded, if not try to load from env config
      let activeModel = await ModelConfig.findOne({ isActive: true });
      if (!activeModel) {
        // Try to use default model from environment
        const modelPath = config.model.defaultPath;
        const architecture = config.model.architecture;

        if (!modelPath) {
          res.status(400).json({
            success: false,
            error: "No model configured. Please contact administrator.",
          });
          return;
        }

        // Check ML service and load model
        const mlStatus = await mlService.getModelStatus();
        if (!mlStatus.isLoaded) {
          logger.info("Auto-loading model for inference...");
          const loadResult = await mlService.loadModel({
            modelPath,
            architecture,
          });
          if (!loadResult.success) {
            res.status(500).json({
              success: false,
              error: "Failed to load model. Please try again later.",
            });
            return;
          }
        }

        // Create model config in database so videoAnalysisService can find it
        activeModel = await ModelConfig.create({
          name: "Default Model",
          modelPath,
          architecture,
          inputSize: { frames: 16, height: 224, width: 224 },
          classes: ["violence", "non-violence"],
          isActive: true,
          isLoaded: true,
          loadedAt: new Date(),
        });
        logger.info("Created model config for default model");
      }

      // Run analysis
      const result = await videoAnalysisService.analyzeVideo(videoId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
        });
        return;
      }

      logger.info(`Inference completed for video: ${videoId}`);

      res.json({
        success: true,
        data: result.prediction,
        message: "Inference completed successfully",
      });
    } catch (error: any) {
      logger.error("Error running inference:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/predictions - Get all predictions
  async getAllPredictions(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const classification = req.query.classification as string;
      const status = req.query.status as string;

      const query: any = {};
      if (classification) {
        query.classification = classification;
      }
      if (status) {
        query.status = status;
      }

      const total = await Prediction.countDocuments(query);
      const predictions = await Prediction.find(query)
        .populate("videoId", "filename originalName")
        .populate("modelId", "name architecture")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        success: true,
        data: predictions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      logger.error("Error fetching predictions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/predictions/:id - Get prediction by ID
  async getPredictionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const prediction = await Prediction.findById(id)
        .populate("videoId")
        .populate("modelId");

      if (!prediction) {
        res.status(404).json({
          success: false,
          error: "Prediction not found",
        });
        return;
      }

      res.json({
        success: true,
        data: prediction,
      });
    } catch (error: any) {
      logger.error("Error fetching prediction:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // DELETE /api/v1/predictions/:id - Delete prediction
  async deletePrediction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const prediction = await Prediction.findByIdAndDelete(id);

      if (!prediction) {
        res.status(404).json({
          success: false,
          error: "Prediction not found",
        });
        return;
      }

      logger.info(`Prediction deleted: ${id}`);

      res.json({
        success: true,
        message: "Prediction deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting prediction:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/predictions/video/:videoId - Get predictions for a video
  async getPredictionsByVideo(req: Request, res: Response): Promise<void> {
    try {
      const { videoId } = req.params;
      const predictions = await Prediction.find({ videoId })
        .populate("modelId", "name architecture")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: predictions,
      });
    } catch (error: any) {
      logger.error("Error fetching predictions by video:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/predictions/stats - Get prediction statistics
  async getPredictionStats(req: Request, res: Response): Promise<void> {
    try {
      const totalPredictions = await Prediction.countDocuments();
      const violentCount = await Prediction.countDocuments({
        classification: "violence",
      });
      const nonViolentCount = await Prediction.countDocuments({
        classification: "non-violence",
      });
      const completedCount = await Prediction.countDocuments({
        status: "completed",
      });
      const failedCount = await Prediction.countDocuments({ status: "failed" });

      // Calculate average confidence
      const avgConfidenceResult = await Prediction.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, avgConfidence: { $avg: "$confidence" } } },
      ]);

      // Calculate average inference time
      const avgInferenceTimeResult = await Prediction.aggregate([
        {
          $match: {
            status: "completed",
            "metrics.inferenceTime": { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgInferenceTime: { $avg: "$metrics.inferenceTime" },
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          total: totalPredictions,
          violent: violentCount,
          nonViolent: nonViolentCount,
          completed: completedCount,
          failed: failedCount,
          avgConfidence: avgConfidenceResult[0]?.avgConfidence || 0,
          avgInferenceTime: avgInferenceTimeResult[0]?.avgInferenceTime || 0,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching prediction stats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new InferenceController();
