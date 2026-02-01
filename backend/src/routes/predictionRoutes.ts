import { Router } from "express";
import { inferenceController } from "../controllers";

const router = Router();

/**
 * @route   GET /api/v1/predictions
 * @desc    Get all predictions with pagination
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10)
 * @query   classification - Filter by classification (violence/non-violence)
 * @query   status - Filter by status (pending/running/completed/failed)
 * @access  Public
 */
router.get("/", inferenceController.getAllPredictions);

/**
 * @route   GET /api/v1/predictions/stats
 * @desc    Get prediction statistics
 * @access  Public
 */
router.get("/stats", inferenceController.getPredictionStats);

/**
 * @route   GET /api/v1/predictions/video/:videoId
 * @desc    Get all predictions for a specific video
 * @access  Public
 */
router.get("/video/:videoId", inferenceController.getPredictionsByVideo);

/**
 * @route   GET /api/v1/predictions/:id
 * @desc    Get prediction by ID
 * @access  Public
 */
router.get("/:id", inferenceController.getPredictionById);

/**
 * @route   DELETE /api/v1/predictions/:id
 * @desc    Delete a prediction
 * @access  Public
 */
router.delete("/:id", inferenceController.deletePrediction);

export default router;
