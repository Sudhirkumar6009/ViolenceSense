"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Play, Clock, Radio } from "lucide-react";
import { AlertMessage } from "@/types";

interface ToastNotification {
  id: string;
  alert: AlertMessage;
  timestamp: Date;
}

interface ViolenceAlertToastProps {
  alerts: AlertMessage[];
  onDismiss?: (eventId: string) => void;
  onViewHistory?: () => void;
}

export default function ViolenceAlertToast({
  alerts,
  onDismiss,
  onViewHistory,
}: ViolenceAlertToastProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Add new alerts as toasts
  useEffect(() => {
    if (alerts.length === 0) return;
    const latest = alerts[0];
    if (!latest) return;

    // Only show toast for violence_alert and event_start
    if (latest.type !== "violence_alert" && latest.type !== "event_start")
      return;

    const id = `${latest.event_id}_${latest.type}_${Date.now()}`;

    // Avoid duplicate toasts for same event+type
    setToasts((prev) => {
      const exists = prev.some(
        (t) =>
          t.alert.event_id === latest.event_id && t.alert.type === latest.type,
      );
      if (exists) return prev;
      return [{ id, alert: latest, timestamp: new Date() }, ...prev].slice(
        0,
        5,
      );
    });
  }, [alerts]);

  // Auto-dismiss toasts after 15 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      setToasts((prev) => {
        const now = Date.now();
        return prev.filter((t) => now - t.timestamp.getTime() < 15000);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  const dismissToast = useCallback(
    (id: string, eventId: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      onDismiss?.(eventId);
    },
    [onDismiss],
  );

  // Play audio alert
  useEffect(() => {
    if (toasts.length > 0) {
      try {
        // Use Web Audio API for alert sound
        const ctx = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.value = 0.15;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        // Audio not available
      }
    }
  }, [toasts.length]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <div className="bg-red-950/95 backdrop-blur-lg border border-red-500/50 rounded-xl shadow-2xl shadow-red-500/20 overflow-hidden">
              {/* Red pulsing top bar */}
              <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-300">
                        {toast.alert.type === "violence_alert"
                          ? "Violence Alert — Clip Ready"
                          : "Violence Detected"}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Radio className="w-3 h-3 text-red-400" />
                        <span className="text-xs text-slate-400">
                          {toast.alert.stream_name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => dismissToast(toast.id, toast.alert.event_id)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-2">
                  {toast.alert.message && (
                    <p className="text-xs text-slate-300">
                      {toast.alert.message}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {(toast.alert.max_confidence || toast.alert.confidence) && (
                      <span className="flex items-center gap-1">
                        <span className="text-red-400 font-medium">
                          {(
                            (toast.alert.max_confidence ||
                              toast.alert.confidence ||
                              0) * 100
                          ).toFixed(0)}
                          %
                        </span>
                        confidence
                      </span>
                    )}
                    {toast.alert.clip_duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {toast.alert.clip_duration.toFixed(0)}s clip
                      </span>
                    )}
                  </div>

                  {/* Confidence bar */}
                  {(toast.alert.max_confidence || toast.alert.confidence) && (
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all"
                        style={{
                          width: `${(toast.alert.max_confidence || toast.alert.confidence || 0) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      onViewHistory?.();
                      dismissToast(toast.id, toast.alert.event_id);
                    }}
                    className="flex-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    View in History
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
