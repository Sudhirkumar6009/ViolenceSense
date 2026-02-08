"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  Clock,
  Radio,
  Trash2,
  Bell,
  BellOff,
} from "lucide-react";
import { AlertMessage } from "@/types";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertMessage[];
  pendingCount: number;
  onClearPending: () => void;
  onDismiss: (eventId: string) => void;
  onViewHistory: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  alerts,
  pendingCount,
  onClearPending,
  onDismiss,
  onViewHistory,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  // Clear pending when opened
  useEffect(() => {
    if (isOpen && pendingCount > 0) {
      onClearPending();
    }
  }, [isOpen, pendingCount, onClearPending]);

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const severityColor = (severity?: string) => {
    switch (severity) {
      case "critical":
        return "border-l-red-500 bg-red-500/10";
      case "high":
        return "border-l-orange-500 bg-orange-500/10";
      case "medium":
        return "border-l-yellow-500 bg-yellow-500/10";
      default:
        return "border-l-blue-500 bg-blue-500/10";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Notifications
              </h3>
              {alerts.length > 0 && (
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {alerts.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <BellOff className="w-8 h-8 mb-2" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">
                  Alerts will appear here when violence is detected
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {alerts.slice(0, 20).map((alert, i) => (
                  <div
                    key={`${alert.event_id}-${i}`}
                    className={`px-4 py-3 border-l-2 hover:bg-slate-800/50 transition-colors cursor-pointer ${severityColor(alert.severity)}`}
                    onClick={() => {
                      onViewHistory();
                      onClose();
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 truncate">
                            {alert.message ||
                              `Violence detected on ${alert.stream_name}`}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Radio className="w-3 h-3" />
                              {alert.stream_name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {formatTimeAgo(alert.timestamp)}
                            </span>
                            {(alert.max_confidence || alert.confidence) && (
                              <span className="text-xs text-red-400 font-medium">
                                {(
                                  (alert.max_confidence ||
                                    alert.confidence ||
                                    0) * 100
                                ).toFixed(0)}
                                %
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(alert.event_id);
                        }}
                        className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {alerts.length > 0 && (
            <div className="border-t border-slate-800 px-4 py-2 flex justify-between items-center">
              <button
                onClick={() => {
                  onViewHistory();
                  onClose();
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all in History
              </button>
              <button
                onClick={() => {
                  alerts.forEach((a) => onDismiss(a.event_id));
                }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
