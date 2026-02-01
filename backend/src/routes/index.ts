import { Router } from "express";
import videoRoutes from "./videoRoutes";
import modelRoutes from "./modelRoutes";
import inferenceRoutes from "./inferenceRoutes";
import predictionRoutes from "./predictionRoutes";
import healthRoutes from "./healthRoutes";

const router = Router();

// Mount routes
router.use("/videos", videoRoutes);
router.use("/model", modelRoutes);
router.use("/inference", inferenceRoutes);
router.use("/predictions", predictionRoutes);
router.use("/health", healthRoutes);

export default router;
