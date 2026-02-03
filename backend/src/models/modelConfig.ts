import mongoose, { Document, Schema } from "mongoose";

export interface IModelConfig extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  modelPath: string;
  architecture: string;
  version: string;
  inputSize: {
    frames: number;
    height: number;
    width: number;
  };
  classes: string[];
  isActive: boolean;
  isLoaded: boolean;
  performance?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    avgInferenceTime?: number;
    totalPredictions?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  loadedAt?: Date;
}

const ModelConfigSchema = new Schema<IModelConfig>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
    },
    modelPath: {
      type: String,
      required: true,
    },
    architecture: {
      type: String,
      required: true,
      enum: [
        "videomae",
        "timesformer",
        "slowfast",
        "resnet3d",
        "i3d",
        "keras-cnn",
        "custom",
      ],
    },
    version: {
      type: String,
      required: true,
      default: "1.0.0",
    },
    inputSize: {
      frames: {
        type: Number,
        default: 16,
      },
      height: {
        type: Number,
        default: 224,
      },
      width: {
        type: Number,
        default: 224,
      },
    },
    classes: {
      type: [String],
      default: ["violence", "non-violence"],
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isLoaded: {
      type: Boolean,
      default: false,
    },
    performance: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1Score: Number,
      avgInferenceTime: Number,
      totalPredictions: Number,
    },
    loadedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "model_configs",
  },
);

ModelConfigSchema.index({ isActive: 1 });
ModelConfigSchema.index({ architecture: 1 });

export default mongoose.model<IModelConfig>("ModelConfig", ModelConfigSchema);
