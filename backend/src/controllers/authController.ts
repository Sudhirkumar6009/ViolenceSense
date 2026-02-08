import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config";
import logger from "../utils/logger";
import {
  getAtlasUserModel,
  hashPassword,
  comparePassword,
  IAtlasUser,
} from "../config/atlasAuth";

// Generate JWT token
const generateToken = (user: {
  _id: any;
  email: string;
  username: string;
}): string => {
  const options: SignOptions = {
    expiresIn: config.auth.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    },
    config.auth.jwtSecret,
    options,
  );
};

// Register new user
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: "Please provide username, email, and password",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long",
      });
      return;
    }

    const AtlasUser = await getAtlasUserModel();

    // Check if user already exists
    const existingUser = await AtlasUser.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "email" : "username";
      res.status(400).json({
        success: false,
        error: `User with this ${field} already exists`,
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await AtlasUser.create({
      username,
      email,
      password: hashedPassword,
      provider: "local",
      isVerified: false,
    });

    // Generate token
    const token = generateToken({
      _id: user._id,
      email: user.email,
      username: user.username,
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider,
        },
        token,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    next(error);
  }
};

// Login user
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
      return;
    }

    const AtlasUser = await getAtlasUserModel();

    // Find user and include password field
    const user = await AtlasUser.findOne({ email }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Check if user has a password (might be Google-only account)
    if (!user.password) {
      res.status(401).json({
        success: false,
        error: "Please login with Google",
      });
      return;
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
      return;
    }

    // Generate token
    const token = generateToken({
      _id: user._id,
      email: user.email,
      username: user.username,
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider,
        },
        token,
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          provider: user.provider,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth callback handler
export const googleCallback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = (req as any).user as IAtlasUser;

    if (!user) {
      res.redirect(`${config.cors.origin}/login?error=auth_failed`);
      return;
    }

    const token = generateToken({
      _id: user._id,
      email: user.email,
      username: user.username,
    });

    // Redirect to frontend with token
    res.redirect(`${config.cors.origin}/auth/callback?token=${token}`);
  } catch (error) {
    logger.error("Google callback error:", error);
    res.redirect(`${config.cors.origin}/login?error=auth_failed`);
  }
};

// Logout (client-side handles token removal)
export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
};

export default {
  register,
  login,
  getCurrentUser,
  googleCallback,
  logout,
};
