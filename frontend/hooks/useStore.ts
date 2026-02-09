import { create } from "zustand";
import { Video, Prediction, ModelStatusResponse, Stream } from "@/types";

interface AppState {
  // Video state
  selectedVideo: Video | null;
  setSelectedVideo: (video: Video | null) => void;

  // Prediction state
  currentPrediction: Prediction | null;
  setCurrentPrediction: (prediction: Prediction | null) => void;

  // Model state
  modelStatus: ModelStatusResponse | null;
  setModelStatus: (status: ModelStatusResponse | null) => void;

  // UI state
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  uploadProgress: number;
  setUploadProgress: (value: number) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;

  // Notifications
  notification: { type: "success" | "error" | "info"; message: string } | null;
  showNotification: (
    type: "success" | "error" | "info",
    message: string,
  ) => void;
  clearNotification: () => void;

  // Streams cache (persists across tab switches)
  streams: Stream[];
  streamsLoaded: boolean;
  streamsError: string | null;
  setStreams: (streams: Stream[]) => void;
  setStreamsError: (error: string | null) => void;
  updateStreamStatus: (streamId: string, status: Stream["status"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Video state
  selectedVideo: null,
  setSelectedVideo: (video) => set({ selectedVideo: video }),

  // Prediction state
  currentPrediction: null,
  setCurrentPrediction: (prediction) => set({ currentPrediction: prediction }),

  // Model state
  modelStatus: null,
  setModelStatus: (status) => set({ modelStatus: status }),

  // UI state
  isUploading: false,
  setIsUploading: (value) => set({ isUploading: value }),
  uploadProgress: 0,
  setUploadProgress: (value) => set({ uploadProgress: value }),
  isProcessing: false,
  setIsProcessing: (value) => set({ isProcessing: value }),

  // Notifications
  notification: null,
  showNotification: (type, message) => set({ notification: { type, message } }),
  clearNotification: () => set({ notification: null }),

  // Streams cache
  streams: [],
  streamsLoaded: false,
  streamsError: null,
  setStreams: (streams) =>
    set({ streams, streamsLoaded: true, streamsError: null }),
  setStreamsError: (error) => set({ streamsError: error }),
  updateStreamStatus: (streamId, status) =>
    set((state) => ({
      streams: state.streams.map((s) =>
        String(s.id) === String(streamId) ? { ...s, status } : s,
      ),
    })),
}));
