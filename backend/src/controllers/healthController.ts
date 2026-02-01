import { Request, Response } from "express";
import mongoose from "mongoose";
import { mlService } from "../services";
import config from "../config";
import logger from "../utils/logger";

class HealthController {
  // GET /api/v1/health - API health check
  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      const mongoStatus =
        mongoose.connection.readyState === 1 ? "connected" : "disconnected";
      const mlServiceStatus = await mlService.healthCheck();

      const isHealthy = mongoStatus === "connected";

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          status: isHealthy ? "healthy" : "unhealthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            api: {
              status: "running",
              version: "1.0.0",
              environment: config.nodeEnv,
            },
            mongodb: {
              status: mongoStatus,
              host: config.mongodb.uri.split("@")[1] || "localhost",
            },
            mlService: {
              status: mlServiceStatus ? "connected" : "disconnected",
              url: config.mlService.url,
            },
          },
          memory: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          },
        },
      });
    } catch (error: any) {
      logger.error("Health check failed:", error);
      res.status(503).json({
        success: false,
        data: {
          status: "unhealthy",
          error: error.message,
        },
      });
    }
  }

  // GET /api/v1/health/ready - Readiness probe
  async checkReady(req: Request, res: Response): Promise<void> {
    try {
      const mongoReady = mongoose.connection.readyState === 1;

      if (mongoReady) {
        res.status(200).json({
          success: true,
          message: "Service is ready",
        });
      } else {
        res.status(503).json({
          success: false,
          message: "Service is not ready",
        });
      }
    } catch (error: any) {
      res.status(503).json({
        success: false,
        message: "Service is not ready",
        error: error.message,
      });
    }
  }

  // GET /api/v1/health/live - Liveness probe
  async checkLive(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: "Service is alive",
    });
  }
}

export default new HealthController();
