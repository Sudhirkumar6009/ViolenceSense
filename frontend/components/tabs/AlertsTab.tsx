"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCard, LiveAlertBanner } from "@/components/AlertCard";
import { EventModal } from "@/components/EventModal";
import { ViolenceEvent, EventFilters, AlertMessage } from "@/types";
import { streamService } from "@/services/streamApi";
import { useWebSocket } from "@/hooks/useWebSocket";

type StatusFilter = "all" | "pending" | "confirmed" | "dismissed";
type SeverityFilter = "all" | "low" | "medium" | "high" | "critical";

export default function AlertsTab() {
  const [events, setEvents] = useState<ViolenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ViolenceEvent | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [liveAlert, setLiveAlert] = useState<ViolenceEvent | null>(null);

  const { isConnected } = useWebSocket({
    onAlert: useCallback((data: AlertMessage) => {
      if (data.type === "event_start") {
        const newEvent: ViolenceEvent = {
          id: data.event_id,
          stream_id: data.stream_id,
          stream_name: data.stream_name,
          started_at: data.timestamp,
          max_score: data.max_score,
          avg_score: 0,
          status: "PENDING",
          severity: data.severity || "high",
        };
        setLiveAlert(newEvent);
        setTimeout(() => setLiveAlert(null), 10000);
        setEvents((prev) => [newEvent, ...prev]);
      }
    }, []),
  });

  const fetchEvents = useCallback(
    async (reset = false) => {
      try {
        // Use streamService to get events from RTSP service where they are stored
        const filters: { status?: string; limit?: number; offset?: number } = {
          limit: 20,
          offset: reset ? 0 : offset,
        };
        if (statusFilter !== "all") {
          // Map frontend status to backend status
          const statusMap: Record<string, string> = {
            pending: "PENDING",
            confirmed: "ACTION_EXECUTED",
            dismissed: "NO_ACTION_REQUIRED",
          };
          filters.status = statusMap[statusFilter] || statusFilter;
        }
        const response = await streamService.getEvents(filters);
        if (response.success) {
          // Normalize event data to match ViolenceEvent type
          const normalizedEvents: ViolenceEvent[] = response.data.map(
            (e: any) => ({
              id: e.event_id || e.id,
              stream_id: e.stream_id,
              stream_name: e.stream_name,
              started_at: e.start_time || e.started_at || e.timestamp,
              ended_at: e.end_time || e.ended_at,
              max_score: e.max_score || e.max_confidence || e.confidence || 0,
              avg_score: e.avg_score || e.avg_confidence || 0,
              status: (e.status?.toUpperCase() ||
                "PENDING") as ViolenceEvent["status"],
              severity:
                e.severity ||
                (e.max_score >= 0.9
                  ? "critical"
                  : e.max_score >= 0.8
                    ? "high"
                    : "medium"),
              clip_path: e.clip_path,
              thumbnail_path: e.thumbnail_path,
              clip_duration: e.clip_duration,
              duration_seconds: e.duration || e.duration_seconds,
            }),
          );
          if (reset) {
            setEvents(normalizedEvents);
          } else {
            setEvents((prev) => [...prev, ...normalizedEvents]);
          }
          setTotal(response.pagination?.count || normalizedEvents.length);
          setHasMore(
            (response.pagination?.offset || 0) + normalizedEvents.length <
              (response.pagination?.count || 0),
          );
          setError(null);
        } else {
          setError("Failed to fetch events");
        }
      } catch (err: any) {
        setError(err.message || "Failed to connect to RTSP service");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, offset],
  );

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetchEvents(true);
  }, [statusFilter]); // Removed severityFilter since RTSP service doesn't support it

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setOffset((prev) => prev + 20);
  }, [loading, hasMore]);
  useEffect(() => {
    if (offset > 0) fetchEvents(false);
  }, [offset]);

  const handleConfirm = useCallback(async (id: string) => {
    try {
      // Use streamService to mark action executed (confirms violence)
      await streamService.markActionExecuted(id);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "ACTION_EXECUTED" as const } : e,
        ),
      );
    } catch (err) {
      console.error("Failed to confirm:", err);
    }
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      // Use streamService to mark no action required (dismisses/false positive)
      await streamService.markNoActionRequired(id);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, status: "NO_ACTION_REQUIRED" as const } : e,
        ),
      );
    } catch (err) {
      console.error("Failed to dismiss:", err);
    }
  }, []);

  const handleViewClip = useCallback((event: ViolenceEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  }, []);
  const handleEventClick = useCallback((event: ViolenceEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  }, []);

  const pendingCount = events.filter(
    (e) => e.status === "PENDING" || e.status === "NEW",
  ).length;
  const confirmedCount = events.filter(
    (e) => e.status === "ACTION_EXECUTED" || e.status === "CONFIRMED",
  ).length;
  const dismissedCount = events.filter(
    (e) =>
      e.status === "NO_ACTION_REQUIRED" ||
      e.status === "DISMISSED" ||
      e.status === "AUTO_DISMISSED",
  ).length;

  return (
    <div>
      {/* Live Alert Banner */}
      <AnimatePresence>
        {liveAlert && (
          <LiveAlertBanner
            event={liveAlert}
            onConfirm={() => {
              handleConfirm(liveAlert.id);
              setLiveAlert(null);
            }}
            onDismiss={() => {
              handleDismiss(liveAlert.id);
              setLiveAlert(null);
            }}
            onClose={() => setLiveAlert(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-slate-400 mt-1">
            Violence detection events requiring review
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
          <div
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm text-slate-400">
            {isConnected ? "Live Updates" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-white">{total}</p>
          <p className="text-sm text-slate-400">Total Events</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
            {pendingCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            )}
          </div>
          <p className="text-sm text-slate-400">Pending Review</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-green-400">{confirmedCount}</p>
          <p className="text-sm text-slate-400">Confirmed</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-400">{dismissedCount}</p>
          <p className="text-sm text-slate-400">Dismissed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as SeverityFilter)
            }
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <button
          onClick={() => fetchEvents(true)}
          className="ml-auto px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-red-400 font-medium">Connection Error</p>
              <p className="text-red-300/70 text-sm">{error}</p>
            </div>
            <button
              onClick={() => fetchEvents(true)}
              className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No Events Found
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {statusFilter !== "all" || severityFilter !== "all"
              ? "Try adjusting your filters to see more events."
              : "Violence detection events will appear here when detected."}
          </p>
        </motion.div>
      )}

      {/* Events List */}
      {events.length > 0 && (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <AlertCard
                key={event.id}
                event={event}
                onConfirm={handleConfirm}
                onDismiss={handleDismiss}
                onViewClip={handleViewClip}
                onClick={handleEventClick}
              />
            ))}
          </AnimatePresence>
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      <EventModal
        event={selectedEvent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        onConfirm={handleConfirm}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
