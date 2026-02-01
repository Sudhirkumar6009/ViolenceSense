import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import logger from "../utils/logger";

let gridFSBucket: GridFSBucket | null = null;

export const initGridFS = (): GridFSBucket => {
  if (gridFSBucket) {
    return gridFSBucket;
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection not established");
  }

  gridFSBucket = new GridFSBucket(db, {
    bucketName: "videos",
  });

  logger.info("GridFS bucket initialized for video storage");
  return gridFSBucket;
};

export const getGridFSBucket = (): GridFSBucket => {
  if (!gridFSBucket) {
    return initGridFS();
  }
  return gridFSBucket;
};

export default { initGridFS, getGridFSBucket };
