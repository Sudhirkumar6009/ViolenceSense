import axios, { AxiosInstance, AxiosProgressEvent } from "axios";
import {
  ApiResponse,
  PaginatedResponse,
  Video,
  Prediction,
  ModelConfig,
  ModelStatusResponse,
  ModelMetricsResponse,
  PredictionStats,
  HealthResponse,
  ModelLoadRequest,
} from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("API Error:", error.response?.data || error.message);
        return Promise.reject(error);
      },
    );
  }

  // ============== Health Endpoints ==============

  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    const response = await this.client.get("/health");
    return response.data;
  }

  // ============== Video Endpoints ==============

  async uploadVideo(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ApiResponse<Video>> {
    const formData = new FormData();
    formData.append("video", file);

    const response = await this.client.post("/videos/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  async getVideos(
    page: number = 1,
    limit: number = 10,
    status?: string,
  ): Promise<PaginatedResponse<Video>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status) {
      params.append("status", status);
    }

    const response = await this.client.get(`/videos?${params.toString()}`);
    return response.data;
  }

  async getVideo(
    id: string,
  ): Promise<ApiResponse<{ video: Video; prediction: Prediction | null }>> {
    const response = await this.client.get(`/videos/${id}`);
    return response.data;
  }

  async deleteVideo(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/videos/${id}`);
    return response.data;
  }

  getVideoStreamUrl(id: string): string {
    return `${API_URL}/videos/${id}/stream`;
  }

  // ============== Model Endpoints ==============

  async loadModel(
    request: ModelLoadRequest,
  ): Promise<ApiResponse<ModelConfig>> {
    const response = await this.client.post("/model/load", request);
    return response.data;
  }

  async getModelStatus(): Promise<ApiResponse<ModelStatusResponse>> {
    const response = await this.client.get("/model/status");
    return response.data;
  }

  async getModelMetrics(): Promise<ApiResponse<ModelMetricsResponse>> {
    const response = await this.client.get("/model/metrics");
    return response.data;
  }

  async getModelConfigs(): Promise<ApiResponse<ModelConfig[]>> {
    const response = await this.client.get("/model/configs");
    return response.data;
  }

  async deleteModelConfig(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/model/configs/${id}`);
    return response.data;
  }

  async unloadModel(): Promise<ApiResponse<void>> {
    const response = await this.client.post("/model/unload");
    return response.data;
  }

  // ============== Inference Endpoints ==============

  async runInference(videoId: string): Promise<ApiResponse<Prediction>> {
    const response = await this.client.post("/inference/predict", { videoId });
    return response.data;
  }

  // ============== Prediction Endpoints ==============

  async getPredictions(
    page: number = 1,
    limit: number = 10,
    classification?: string,
    status?: string,
  ): Promise<PaginatedResponse<Prediction>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (classification) {
      params.append("classification", classification);
    }
    if (status) {
      params.append("status", status);
    }

    const response = await this.client.get(`/predictions?${params.toString()}`);
    return response.data;
  }

  async getPrediction(id: string): Promise<ApiResponse<Prediction>> {
    const response = await this.client.get(`/predictions/${id}`);
    return response.data;
  }

  async getPredictionsByVideo(
    videoId: string,
  ): Promise<ApiResponse<Prediction[]>> {
    const response = await this.client.get(`/predictions/video/${videoId}`);
    return response.data;
  }

  async getPredictionStats(): Promise<ApiResponse<PredictionStats>> {
    const response = await this.client.get("/predictions/stats");
    return response.data;
  }

  async deletePrediction(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/predictions/${id}`);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
