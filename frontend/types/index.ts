// Video Types
export interface Video {
  _id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  duration?: number;
  resolution?: {
    width: number;
    height: number;
  };
  fps?: number;
  status: "uploaded" | "processing" | "completed" | "failed";
  uploadedAt: string;
  processedAt?: string;
  metadata?: Record<string, any>;
}

// Prediction Types
export interface Prediction {
  _id: string;
  videoId: string | Video;
  modelId: string | ModelConfig;
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
  createdAt: string;
  completedAt?: string;
}

// Model Configuration Types
export interface ModelConfig {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
  loadedAt?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Model Status Response
export interface ModelStatusResponse {
  hasActiveModel: boolean;
  model: {
    id: string;
    name: string;
    modelPath: string;
    architecture: string;
    isLoaded: boolean;
    loadedAt?: string;
  } | null;
  mlService: {
    isLoaded: boolean;
    currentModel?: {
      path: string;
      architecture: string;
      loadedAt: string;
    };
    gpuAvailable: boolean;
    gpuMemory?: {
      total: number;
      used: number;
      free: number;
    };
  };
}

// Model Metrics Response
export interface ModelMetricsResponse {
  model: {
    id: string;
    name: string;
  };
  performance: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    avgInferenceTime?: number;
    totalPredictions?: number;
  };
  mlMetrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    confusionMatrix?: {
      truePositive: number;
      trueNegative: number;
      falsePositive: number;
      falseNegative: number;
    };
    totalPredictions?: number;
    avgInferenceTime?: number;
  };
}

// Prediction Stats
export interface PredictionStats {
  total: number;
  violent: number;
  nonViolent: number;
  completed: number;
  failed: number;
  avgConfidence: number;
  avgInferenceTime: number;
}

// Health Check Response
export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  services: {
    api: {
      status: string;
      version: string;
      environment: string;
    };
    mongodb: {
      status: string;
      host: string;
    };
    mlService: {
      status: string;
      url: string;
    };
  };
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
}

// Upload Progress
export interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
}

// Inference Request
export interface InferenceRequest {
  videoId: string;
}

// Model Load Request
export interface ModelLoadRequest {
  modelPath: string;
  architecture?: string;
  name?: string;
  description?: string;
}
