import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "./index";
import logger from "../utils/logger";

// User interface
export interface IAtlasUser extends Document {
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  provider: "local" | "google";
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const userSchema = new Schema<IAtlasUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Cached connection and model
let atlasConnection: mongoose.Connection | null = null;
let UserModel: Model<IAtlasUser> | null = null;

// Get or create Atlas connection
export const getAtlasConnection = async (): Promise<mongoose.Connection> => {
  if (atlasConnection && atlasConnection.readyState === 1) {
    return atlasConnection;
  }

  const atlasUri = config.auth.mongodbAtlasUri;
  if (!atlasUri) {
    throw new Error("MongoDB Atlas URI not configured for authentication");
  }

  logger.info("Connecting to MongoDB Atlas for authentication...");

  atlasConnection = mongoose.createConnection(atlasUri);

  atlasConnection.on("connected", () => {
    logger.info("Connected to MongoDB Atlas for authentication");
  });

  atlasConnection.on("error", (err) => {
    logger.error("MongoDB Atlas connection error:", err);
  });

  atlasConnection.on("disconnected", () => {
    logger.warn("MongoDB Atlas disconnected");
    UserModel = null;
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("MongoDB Atlas connection timeout"));
    }, 10000);

    atlasConnection!.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });

    atlasConnection!.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return atlasConnection;
};

// Get User model
export const getAtlasUserModel = async (): Promise<Model<IAtlasUser>> => {
  if (UserModel && atlasConnection?.readyState === 1) {
    return UserModel;
  }

  const connection = await getAtlasConnection();

  // Check if model already registered
  if (connection.models.User) {
    UserModel = connection.models.User as Model<IAtlasUser>;
    return UserModel;
  }

  // Register model
  UserModel = connection.model<IAtlasUser>("User", userSchema);
  return UserModel;
};

// Hash password utility
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Compare password utility
export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export default {
  getAtlasConnection,
  getAtlasUserModel,
  hashPassword,
  comparePassword,
};
