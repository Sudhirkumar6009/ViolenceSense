import mongoose from "mongoose";
import config from "./index";
import logger from "../utils/logger";
import { initGridFS } from "./gridfs";

class Database {
  private static instance: Database;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 5000;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info("MongoDB is already connected");
      return;
    }

    await this.connectWithRetry();
  }

  private async connectWithRetry(): Promise<void> {
    try {
      // Determine if local or Atlas connection
      const isLocal =
        config.mongodb.uri.includes("localhost") ||
        config.mongodb.uri.includes("127.0.0.1");

      const options: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: isLocal ? 5000 : 10000,
        socketTimeoutMS: 45000,
        ...(isLocal ? {} : { retryWrites: true, w: "majority" }),
      };

      logger.info(`Connecting to ${isLocal ? "LOCAL" : "REMOTE"} MongoDB...`);
      logger.info(`URI: ${this.maskUri(config.mongodb.uri)}`);

      await mongoose.connect(config.mongodb.uri, options);

      this.isConnected = true;
      this.connectionRetries = 0;
      logger.info(
        `✅ MongoDB connected successfully (${isLocal ? "LOCAL" : "REMOTE"})`,
      );

      // Initialize GridFS for video storage
      initGridFS();
      logger.info(`✅ GridFS initialized for video storage`);

      // Setup connection event handlers
      this.setupConnectionHandlers();
    } catch (error) {
      this.connectionRetries++;
      logger.error(
        `Failed to connect to MongoDB (attempt ${this.connectionRetries}/${this.maxRetries}):`,
        error,
      );

      if (this.connectionRetries < this.maxRetries) {
        logger.info(
          `Retrying connection in ${this.retryDelay / 1000} seconds...`,
        );
        await this.delay(this.retryDelay);
        return this.connectWithRetry();
      }

      throw new Error(
        `MongoDB connection failed after ${this.maxRetries} attempts`,
      );
    }
  }

  private setupConnectionHandlers(): void {
    mongoose.connection.on("error", (error) => {
      logger.error("MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      this.isConnected = false;
      // Auto-reconnect for local connections
      if (config.mongodb.uri.includes("localhost")) {
        setTimeout(() => this.connectWithRetry(), this.retryDelay);
      }
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      this.isConnected = true;
    });
  }

  private maskUri(uri: string): string {
    // Mask password in URI for logging
    return uri.replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1****$2");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info("MongoDB disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting from MongoDB:", error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async healthCheck(): Promise<{
    status: string;
    latency: number;
    details: any;
  }> {
    const start = Date.now();
    try {
      if (!this.isConnected) {
        return {
          status: "disconnected",
          latency: 0,
          details: { error: "Not connected" },
        };
      }

      // Ping the database
      await mongoose.connection.db?.admin().ping();
      const latency = Date.now() - start;

      return {
        status: "healthy",
        latency,
        details: {
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState,
        },
      };
    } catch (error) {
      return {
        status: "error",
        latency: Date.now() - start,
        details: { error: String(error) },
      };
    }
  }
}

export default Database.getInstance();
