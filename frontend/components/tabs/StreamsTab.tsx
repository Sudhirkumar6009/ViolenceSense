"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StreamCard } from "@/components/StreamCard";
import { StreamForm } from "@/components/StreamForm";
import { Stream, StreamCreateRequest, StreamStatusMessage } from "@/types";
import { streamService } from "@/services/streamApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAppStore } from "@/hooks/useStore";

export default function StreamsTab() {
  // Use global store for streams to persist across tab switches
  const {
    streams,
    streamsLoaded,
    streamsError,
    setStreams,
    setStreamsError,
    updateStreamStatus,
  } = useAppStore();

  const [loading, setLoading] = useState(!streamsLoaded); // Only show loading if never loaded
  const [formOpen, setFormOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<Stream | null>(null);

  // Handle real-time stream status updates
  const handleStreamStatus = useCallback(
    (statusData: StreamStatusMessage) => {
      updateStreamStatus(String(statusData.stream_id), statusData.status);
    },
    [updateStreamStatus],
  );

  const { scores, isConnected, connect } = useWebSocket({
    onStreamStatus: handleStreamStatus,
  });

  const fetchStreams = useCallback(async () => {
    try {
      const response = await streamService.getStreams();
      if (response.success && response.data) {
        setStreams(response.data);
      } else {
        setStreamsError(response.error || "Failed to fetch streams");
      }
    } catch (err: any) {
      setStreamsError(err.message || "Failed to connect to RTSP service");
    } finally {
      setLoading(false);
    }
  }, [setStreams, setStreamsError]);

  useEffect(() => {
    // Always fetch on mount to get latest data, but don't show loading if we have cached data
    fetchStreams();
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, [fetchStreams]);

  const handleStart = useCallback(
    async (id: string) => {
      try {
        // Optimistically update status to "starting"
        updateStreamStatus(id, "starting");

        await streamService.startStream(id);

        // Poll more frequently for a few seconds to catch the "running" status
        let pollCount = 0;
        const quickPoll = setInterval(async () => {
          pollCount++;
          await fetchStreams();
          if (pollCount >= 5) {
            clearInterval(quickPoll);
          }
        }, 1000);
      } catch (err: any) {
        console.error("Failed to start stream:", err);
        await fetchStreams();
      }
    },
    [fetchStreams, updateStreamStatus],
  );

  const handleStop = useCallback(
    async (id: string) => {
      try {
        // Optimistically update status to "stopping"
        updateStreamStatus(id, "stopping");

        await streamService.stopStream(id);
        await fetchStreams();
      } catch (err: any) {
        console.error("Failed to stop stream:", err);
        await fetchStreams();
      }
    },
    [fetchStreams, updateStreamStatus],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await streamService.deleteStream(id);
        await fetchStreams();
      } catch (err: any) {
        console.error("Failed to delete stream:", err);
      }
    },
    [fetchStreams],
  );

  const handleEdit = useCallback((stream: Stream) => {
    setEditingStream(stream);
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: StreamCreateRequest) => {
      if (editingStream) {
        await streamService.updateStream(editingStream.id, data);
      } else {
        await streamService.createStream(data);
      }
      setEditingStream(null);
      await fetchStreams();
    },
    [editingStream, fetchStreams],
  );

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingStream(null);
  }, []);

  // Count streams by status
  const runningCount = streams.filter(
    (s) => s.status === "running" || s.status === "online",
  ).length;
  const stoppedCount = streams.filter(
    (s) => s.status === "stopped" || s.status === "offline",
  ).length;
  const errorCount = streams.filter((s) => s.status === "error").length;

// Show all streams (not just running ones) so users can start stopped streams
  const visibleStreams = streams;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Streams</h1>
          <p className="text-slate-400 mt-1">
            Manage RTSP camera feeds for violence detection
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => !isConnected && connect()}
            className={`flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg transition-colors ${!isConnected ? "hover:bg-slate-700 cursor-pointer" : ""}`}
            title={
              isConnected
                ? "Connected to real-time updates"
                : "Click to reconnect"
            }
          >
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"}`}
            />
            <span className="text-sm text-slate-400">
              {isConnected ? "Live" : "Disconnected - Click to reconnect"}
            </span>
          </button>
          <button
            onClick={() => setFormOpen(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
          >
            Add Stream
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-white">{streams.length}</p>
          <p className="text-sm text-slate-400">Total Streams</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-green-400">{runningCount}</p>
          <p className="text-sm text-slate-400">Running</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-slate-400">{stoppedCount}</p>
          <p className="text-sm text-slate-400">Stopped</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-3xl font-bold text-red-400">{errorCount}</p>
          <p className="text-sm text-slate-400">Errors</p>
        </div>
      </div>

      {/* Error */}
      {streamsError && (
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
              <p className="text-red-300/70 text-sm">{streamsError}</p>
            </div>
            <button
              onClick={fetchStreams}
              className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && streams.length === 0 && !streamsError && (
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No Streams Configured
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Add your first RTSP camera stream to start detecting violence in
            real-time.
          </p>
          <button
            onClick={() => setFormOpen(true)}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
          >
            Add Your First Stream
          </button>
        </motion.div>
      )}

      {/* Grid */}
      {!loading && visibleStreams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {visibleStreams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                score={scores.get(String(stream.id))}
                onStart={handleStart}
                onStop={handleStop}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <StreamForm
        stream={editingStream}
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
