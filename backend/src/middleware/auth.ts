import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import logger from "../utils/logger";
import { getAtlasUserModel } from "../config/atlasAuth";

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

interface AuthUser {
  _id: string;
  email: string;
  username: string;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "No token provided. Authorization denied.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;

    // Get user from database
    const AtlasUser = await getAtlasUserModel();
    const user = await AtlasUser.findById(decoded.id).select("-password");

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Token is not valid. User not found.",
      });
      return;
    }

    // Attach user to request
    (req as any).user = {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: "Token has expired",
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: "Token is not valid",
      });
      return;
    }

    logger.error("Auth middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Server error during authentication",
    });
  }
};

// Optional auth - doesn't fail if no token, just doesn't set user
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.auth.jwtSecret) as JwtPayload;

    const AtlasUser = await getAtlasUserModel();
    const user = await AtlasUser.findById(decoded.id).select("-password");

    if (user) {
      (req as any).user = {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
      };
    }

    next();
  } catch {
    // Silently continue without user
    next();
  }
};

export default { authMiddleware, optionalAuthMiddleware };
