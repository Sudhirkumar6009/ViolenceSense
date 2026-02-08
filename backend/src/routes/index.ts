import { Router } from "express";
import videoRoutes from "./videoRoutes";
import modelRoutes from "./modelRoutes";
import inferenceRoutes from "./inferenceRoutes";
import predictionRoutes from "./predictionRoutes";
import healthRoutes from "./healthRoutes";
import eventRoutes from "./eventRoutes";
import authRoutes from "./authRoutes";

const router = Router();

// Auth routes (public)
router.use("/auth", authRoutes);

// Mount routes
router.use("/videos", videoRoutes);
router.use("/model", modelRoutes);
router.use("/inference", inferenceRoutes);
router.use("/predictions", predictionRoutes);
router.use("/health", healthRoutes);

// Event and stream management routes (PostgreSQL-backed)
router.use("/", eventRoutes);

export default router;
