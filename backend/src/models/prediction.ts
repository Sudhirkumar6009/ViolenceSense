import mongoose, { Document, Schema } from "mongoose";

export interface IPrediction extends Document {
  _id: mongoose.Types.ObjectId;
  videoId: mongoose.Types.ObjectId;
  modelId: mongoose.Types.ObjectId;
  classification: "violence" | "non-violence";
  confidence: number;
  probabilities: {
    violence: number;
    nonViolence: number;
  };
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    inferenceTime?: number;
  };
  frameAnalysis?: {
    totalFrames: number;
    violentFrames: number;
    nonViolentFrames: number;
    frameScores?: number[];
  };
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const PredictionSchema = new Schema<IPrediction>(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },
    modelId: {
      type: Schema.Types.ObjectId,
      ref: "ModelConfig",
      required: true,
    },
    classification: {
      type: String,
      enum: ["violence", "non-violence"],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    probabilities: {
      violence: {
        type: Number,
        min: 0,
        max: 1,
      },
      nonViolence: {
        type: Number,
        min: 0,
        max: 1,
      },
    },
    metrics: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1Score: Number,
      inferenceTime: Number,
    },
    frameAnalysis: {
      totalFrames: Number,
      violentFrames: Number,
      nonViolentFrames: Number,
      frameScores: [Number],
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    error: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "predictions",
  },
);

PredictionSchema.index({ videoId: 1, createdAt: -1 });
PredictionSchema.index({ status: 1 });
PredictionSchema.index({ classification: 1 });

export default mongoose.model<IPrediction>("Prediction", PredictionSchema);
