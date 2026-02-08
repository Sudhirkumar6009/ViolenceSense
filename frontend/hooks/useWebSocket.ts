/**
 * ViolenceSense - WebSocket Hook
 * ==============================
 * Real-time updates for inference scores and alerts.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketMessage, InferenceScoreMessage, AlertMessage } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

interface UseWebSocketOptions {
  onScore?: (data: InferenceScoreMessage) => void;
  onAlert?: (data: AlertMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface WebSocketState {
  isConnected: boolean;
  lastScore: InferenceScoreMessage | null;
  lastAlert: AlertMessage | null;
  scores: Map<string, InferenceScoreMessage>;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onScore,
    onAlert,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastScore: null,
    lastAlert: null,
    scores: new Map(),
  });

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to ViolenceSense");
        reconnectAttemptsRef.current = 0;
        setState((prev) => ({ ...prev, isConnected: true }));
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          // Normalize: backend may send {type, data:{...}} or flat {type, ...}
          const message: WebSocketMessage = raw.data
            ? raw
            : { type: raw.type, data: raw };

          switch (message.type) {
            case "inference_score":
              const scoreData = message.data as InferenceScoreMessage;
              if (!scoreData?.stream_id) break;
              setState((prev) => {
                const newScores = new Map(prev.scores);
                newScores.set(String(scoreData.stream_id), scoreData);
                return {
                  ...prev,
                  lastScore: scoreData,
                  scores: newScores,
                };
              });
              onScore?.(scoreData);
              break;

            case "event_start":
            case "event_end":
            case "violence_alert":
            case "alert":
              const alertData = message.data as AlertMessage;
              if (!alertData) break;
              // Attach the message type so consumers know what kind of alert it is
              alertData.type = alertData.type || (message.type as any);
              setState((prev) => ({ ...prev, lastAlert: alertData }));
              onAlert?.(alertData);
              break;

            case "ping":
              // Respond with pong
              ws.send(JSON.stringify({ type: "pong" }));
              break;

            default:
              // Silently ignore unknown types (stream_status, etc.)
              break;
          }
        } catch (error) {
          // Ignore parse errors for plain text messages like "pong"
        }
      };

      ws.onclose = (event) => {
        console.log("[WS] Disconnected:", event.code, event.reason);
        wsRef.current = null;
        setState((prev) => ({ ...prev, isConnected: false }));
        onDisconnect?.();

        // Auto-reconnect with exponential backoff, up to max attempts
        if (autoReconnect && event.code !== 1000) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay =
              reconnectInterval * Math.pow(2, reconnectAttemptsRef.current);
            reconnectAttemptsRef.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(
                `[WS] Reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}...`,
              );
              connect();
            }, delay);
          } else {
            console.warn(
              `[WS] RTSP service unreachable after ${MAX_RECONNECT_ATTEMPTS} attempts. Real-time features disabled. Start the RTSP service and refresh to reconnect.`,
            );
          }
        }
      };

      ws.onerror = () => {
        // Suppress verbose error logging — onclose handles reconnect logic
      };
    } catch (error) {
      console.error("[WS] Failed to connect:", error);
    }
  }, [
    onScore,
    onAlert,
    onConnect,
    onDisconnect,
    autoReconnect,
    reconnectInterval,
  ]);

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setState((prev) => ({ ...prev, isConnected: false }));
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Subscribe to specific stream
  const subscribeToStream = useCallback(
    (streamId: string) => {
      send({ type: "subscribe", stream_id: streamId });
    },
    [send],
  );

  // Unsubscribe from stream
  const unsubscribeFromStream = useCallback(
    (streamId: string) => {
      send({ type: "unsubscribe", stream_id: streamId });
    },
    [send],
  );

  // Get score for specific stream
  const getStreamScore = useCallback(
    (streamId: string): InferenceScoreMessage | undefined => {
      return state.scores.get(streamId);
    },
    [state.scores],
  );

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected: state.isConnected,
    lastScore: state.lastScore,
    lastAlert: state.lastAlert,
    scores: state.scores,
    connect,
    disconnect,
    send,
    subscribeToStream,
    unsubscribeFromStream,
    getStreamScore,
  };
}

// Hook for stream-specific scores
export function useStreamScore(streamId: string) {
  const [score, setScore] = useState<InferenceScoreMessage | null>(null);

  const handleScore = useCallback(
    (data: InferenceScoreMessage) => {
      if (data.stream_id === streamId) {
        setScore(data);
      }
    },
    [streamId],
  );

  const ws = useWebSocket({
    onScore: handleScore,
  });

  return {
    score,
    isConnected: ws.isConnected,
  };
}

// Hook for alerts only
export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const handleAlert = useCallback((data: AlertMessage) => {
    setAlerts((prev) => [data, ...prev].slice(0, 100)); // Keep last 100 alerts
    setPendingCount((prev) => prev + 1);
  }, []);

  const ws = useWebSocket({
    onAlert: handleAlert,
  });

  const clearPending = useCallback(() => {
    setPendingCount(0);
  }, []);

  const dismissAlert = useCallback((eventId: string) => {
    setAlerts((prev) => prev.filter((a) => a.event_id !== eventId));
  }, []);

  return {
    alerts,
    pendingCount,
    isConnected: ws.isConnected,
    clearPending,
    dismissAlert,
  };
}
