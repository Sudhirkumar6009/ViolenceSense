import { Router } from "express";
import { inferenceController } from "../controllers";

const router = Router();

/**
 * @route   POST /api/v1/inference/predict
 * @desc    Run inference on a video
 * @body    videoId - ID of uploaded video (required)
 * @access  Public
 */
router.post("/predict", inferenceController.predict.bind(inferenceController));

export default router;
