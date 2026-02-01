import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import ModelConfig from "../models/ModelConfig";
import mlService from "../services/mlService";
import logger from "../utils/logger";

class ModelController {
  // POST /api/v1/model/load - Load a model
  async loadModel(req: Request, res: Response): Promise<void> {
    try {
      const { modelPath, architecture, name, description } = req.body;

      if (!modelPath) {
        res.status(400).json({
          success: false,
          error: "Model path is required",
        });
        return;
      }

      // Validate model file exists
      if (!fs.existsSync(modelPath)) {
        res.status(400).json({
          success: false,
          error: `Model file not found at path: ${modelPath}`,
        });
        return;
      }

      // Validate file extension
      const ext = path.extname(modelPath).toLowerCase();
      if (
        ext !== ".pth" &&
        ext !== ".pt" &&
        ext !== ".keras" &&
        ext !== ".h5"
      ) {
        res.status(400).json({
          success: false,
          error: "Invalid model file. Expected .pth, .pt, .keras, or .h5 file",
        });
        return;
      }

      // Deactivate current active model
      await ModelConfig.updateMany(
        { isActive: true },
        { isActive: false, isLoaded: false },
      );

      // Load model through ML service
      const loadResult = await mlService.loadModel({
        modelPath,
        architecture: architecture || "videomae",
      });

      if (!loadResult.success) {
        res.status(500).json({
          success: false,
          error: loadResult.error || "Failed to load model",
        });
        return;
      }

      // Create or update model config
      let modelConfig = await ModelConfig.findOne({ modelPath });

      if (modelConfig) {
        modelConfig.isActive = true;
        modelConfig.isLoaded = true;
        modelConfig.loadedAt = new Date();
        if (loadResult.modelInfo) {
          modelConfig.inputSize = loadResult.modelInfo.inputSize;
          modelConfig.classes = loadResult.modelInfo.classes;
        }
        await modelConfig.save();
      } else {
        modelConfig = new ModelConfig({
          name: name || `Model_${Date.now()}`,
          description: description || "Violence detection model",
          modelPath,
          architecture: architecture || "videomae",
          version: "1.0.0",
          inputSize: loadResult.modelInfo?.inputSize || {
            frames: 16,
            height: 224,
            width: 224,
          },
          classes: loadResult.modelInfo?.classes || [
            "violence",
            "non-violence",
          ],
          isActive: true,
          isLoaded: true,
          loadedAt: new Date(),
        });
        await modelConfig.save();
      }

      logger.info(`Model loaded successfully: ${modelPath}`);

      res.json({
        success: true,
        data: {
          id: modelConfig._id,
          name: modelConfig.name,
          modelPath: modelConfig.modelPath,
          architecture: modelConfig.architecture,
          inputSize: modelConfig.inputSize,
          classes: modelConfig.classes,
          loadedAt: modelConfig.loadedAt,
        },
        message: "Model loaded successfully",
      });
    } catch (error: any) {
      logger.error("Error loading model:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/model/status - Get model status
  async getModelStatus(req: Request, res: Response): Promise<void> {
    try {
      const activeModel = await ModelConfig.findOne({ isActive: true });
      const mlStatus = await mlService.getModelStatus();

      res.json({
        success: true,
        data: {
          hasActiveModel: !!activeModel,
          model: activeModel
            ? {
                id: activeModel._id,
                name: activeModel.name,
                modelPath: activeModel.modelPath,
                architecture: activeModel.architecture,
                isLoaded: activeModel.isLoaded,
                loadedAt: activeModel.loadedAt,
              }
            : null,
          mlService: mlStatus,
        },
      });
    } catch (error: any) {
      logger.error("Error getting model status:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/model/metrics - Get model metrics
  async getModelMetrics(req: Request, res: Response): Promise<void> {
    try {
      const activeModel = await ModelConfig.findOne({ isActive: true });

      if (!activeModel) {
        res.status(404).json({
          success: false,
          error: "No active model found",
        });
        return;
      }

      const mlMetrics = await mlService.getModelMetrics();

      res.json({
        success: true,
        data: {
          model: {
            id: activeModel._id,
            name: activeModel.name,
          },
          performance: activeModel.performance || {},
          mlMetrics: mlMetrics || {},
        },
      });
    } catch (error: any) {
      logger.error("Error getting model metrics:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // GET /api/v1/model/configs - Get all model configurations
  async getAllModelConfigs(req: Request, res: Response): Promise<void> {
    try {
      const models = await ModelConfig.find().sort({ createdAt: -1 });

      res.json({
        success: true,
        data: models,
      });
    } catch (error: any) {
      logger.error("Error fetching model configs:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // DELETE /api/v1/model/configs/:id - Delete model configuration
  async deleteModelConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const model = await ModelConfig.findById(id);

      if (!model) {
        res.status(404).json({
          success: false,
          error: "Model configuration not found",
        });
        return;
      }

      if (model.isActive) {
        await mlService.unloadModel();
      }

      await ModelConfig.findByIdAndDelete(id);

      logger.info(`Model config deleted: ${model.name}`);

      res.json({
        success: true,
        message: "Model configuration deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting model config:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // POST /api/v1/model/unload - Unload current model
  async unloadModel(req: Request, res: Response): Promise<void> {
    try {
      await ModelConfig.updateMany(
        { isActive: true },
        { isActive: false, isLoaded: false },
      );
      await mlService.unloadModel();

      logger.info("Model unloaded successfully");

      res.json({
        success: true,
        message: "Model unloaded successfully",
      });
    } catch (error: any) {
      logger.error("Error unloading model:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new ModelController();
