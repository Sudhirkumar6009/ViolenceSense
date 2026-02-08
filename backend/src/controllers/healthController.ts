import { Request, Response } from "express";
import mongoose from "mongoose";
import { mlService } from "../services";
import config from "../config";
import logger from "../utils/logger";
import database from "../config/database";

class HealthController {
  // GET /api/v1/health - API health check with detailed database status
  async checkHealth(req: Request, res: Response): Promise<void> {
    try {
      // MongoDB health check
      const mongoHealth = await database.healthCheck();
      const mongoStatus =
        mongoHealth.status === "healthy" ? "connected" : "disconnected";

      // ML Service health check
      const mlServiceStatus = await mlService.healthCheck();

      // Check if using local or remote MongoDB
      const isLocalMongo =
        config.mongodb.uri.includes("localhost") ||
        config.mongodb.uri.includes("127.0.0.1");

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
              type: isLocalMongo ? "LOCAL" : "REMOTE",
              latency: `${mongoHealth.latency}ms`,
              host: mongoHealth.details?.host || "unknown",
              database: mongoHealth.details?.name || config.mongodb.dbName,
            },
            mlService: {
              status: mlServiceStatus ? "connected" : "disconnected",
              url: config.mlService.url,
            },
            rtspService: {
              url: config.rtspService.url,
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
