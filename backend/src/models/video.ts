import mongoose, { Document, Schema } from "mongoose";

export interface IVideo extends Document {
  _id: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  gridfsId: mongoose.Types.ObjectId; // GridFS file ID
  size: number;
  mimetype: string;
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  fps?: number;
  status: "uploaded" | "processing" | "completed" | "failed";
  uploadedAt: Date;
  processedAt?: Date;
  metadata?: Record<string, any>;
}

const VideoSchema = new Schema<IVideo>(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    gridfsId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
    },
    resolution: {
      width: Number,
      height: Number,
    },
    fps: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed"],
      default: "uploaded",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: "videos",
  },
);

VideoSchema.index({ status: 1, uploadedAt: -1 });

export default mongoose.model<IVideo>("Video", VideoSchema);
