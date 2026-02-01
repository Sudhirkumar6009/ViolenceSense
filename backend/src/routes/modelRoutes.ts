import { Router } from "express";
import { modelController } from "../controllers";

const router = Router();

/**
 * @route   POST /api/v1/model/load
 * @desc    Load a model from specified path
 * @body    modelPath - Path to .pth model file (required)
 * @body    architecture - Model architecture (videomae/timesformer/slowfast/resnet3d/i3d/custom)
 * @body    name - Model name (optional)
 * @body    description - Model description (optional)
 * @access  Public
 */
router.post("/load", modelController.loadModel);

/**
 * @route   GET /api/v1/model/status
 * @desc    Get current model status
 * @access  Public
 */
router.get("/status", modelController.getModelStatus);

/**
 * @route   GET /api/v1/model/metrics
 * @desc    Get model performance metrics
 * @access  Public
 */
router.get("/metrics", modelController.getModelMetrics);

/**
 * @route   GET /api/v1/model/configs
 * @desc    Get all model configurations
 * @access  Public
 */
router.get("/configs", modelController.getAllModelConfigs);

/**
 * @route   DELETE /api/v1/model/configs/:id
 * @desc    Delete a model configuration
 * @access  Public
 */
router.delete("/configs/:id", modelController.deleteModelConfig);

/**
 * @route   POST /api/v1/model/unload
 * @desc    Unload current model
 * @access  Public
 */
router.post("/unload", modelController.unloadModel);

export default router;
