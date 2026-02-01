import mongoose from "mongoose";
import config from "./index";
import logger from "../utils/logger";
import { initGridFS } from "./gridfs";

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

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

    try {
      const options: mongoose.ConnectOptions = {
        dbName: config.mongodb.dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        w: "majority",
      };

      logger.info(`Connecting to MongoDB Atlas...`);
      logger.info(`Database: ${config.mongodb.dbName}`);

      await mongoose.connect(config.mongodb.uri, options);

      this.isConnected = true;
      logger.info(
        `✅ MongoDB Atlas connected successfully to ${config.mongodb.dbName}`,
      );

      // Initialize GridFS for video storage
      initGridFS();
      logger.info(`✅ GridFS initialized for video storage`);

      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error:", error);
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      logger.error("Failed to connect to MongoDB:", error);
      throw error;
    }
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
}

export default Database.getInstance();
