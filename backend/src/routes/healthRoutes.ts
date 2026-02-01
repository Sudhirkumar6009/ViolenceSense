import { Router } from "express";
import { healthController } from "../controllers";

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Get API health status
 * @access  Public
 */
router.get("/", healthController.checkHealth);

/**
 * @route   GET /api/v1/health/ready
 * @desc    Readiness probe
 * @access  Public
 */
router.get("/ready", healthController.checkReady);

/**
 * @route   GET /api/v1/health/live
 * @desc    Liveness probe
 * @access  Public
 */
router.get("/live", healthController.checkLive);

export default router;
