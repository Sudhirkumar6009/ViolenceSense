"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { streamService } from "@/services/streamApi";
import type { TabId } from "@/components/DashboardSidebar";
import type { ViolenceEvent } from "@/types";

// Stats Card Component
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-800 flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
        <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
      </div>
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center ${gradient}`}
      >
        {icon}
      </div>
    </div>
  );
}

// Quick Action Card
function QuickActionCard({
  title,
  description,
  icon,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-800 hover:border-slate-700 transition-all group"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient} mb-4 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-slate-100">{title}</h3>
      <p className="text-slate-400 text-sm mt-1">{description}</p>
    </button>
  );
}

interface DashboardOverviewProps {
  onTabChange: (tab: TabId) => void;
}

export default function DashboardOverview({
  onTabChange,
}: DashboardOverviewProps) {
  const { user } = useAuth();
  const [streamEvents, setStreamEvents] = useState<ViolenceEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    alertsGenerated: 0,
    streamsActive: 0,
    thisMonth: 0,
  });
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);

  const fetchStreamEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const response = await streamService.getEvents({ limit: 5 });
      if (response.success && response.data) {
        setStreamEvents(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch stream events:", error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    setStats({
      totalVideos: 12,
      alertsGenerated: 47,
      streamsActive: 3,
      thisMonth: 8,
    });
  }, []);

  useEffect(() => {
    fetchStreamEvents();
  }, [fetchStreamEvents]);

  const handleActionExecuted = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      const response = await streamService.markActionExecuted(eventId);
      if (response.success) {
        await fetchStreamEvents();
      }
    } catch (error) {
      console.error("Failed to update event:", error);
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleNoActionRequired = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      const response = await streamService.markNoActionRequired(eventId);
      if (response.success) {
        await fetchStreamEvents();
      }
    } catch (error) {
      console.error("Failed to update event:", error);
    } finally {
      setUpdatingEventId(null);
    }
  };

  const formatEventTime = (isoString?: string) => {
    if (!isoString) return "Unknown time";
    return new Date(isoString).toLocaleString();
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: "Pending",
        className: "bg-yellow-500/20 text-yellow-400",
      },
      ACTION_EXECUTED: {
        label: "Action Executed!",
        className: "bg-green-500/20 text-green-400",
      },
      NO_ACTION_REQUIRED: {
        label: "No Action Required!",
        className: "bg-slate-700 text-slate-300",
      },
      CONFIRMED: {
        label: "Confirmed",
        className: "bg-red-500/20 text-red-400",
      },
      DISMISSED: {
        label: "Dismissed",
        className: "bg-slate-700 text-slate-400",
      },
      AUTO_DISMISSED: {
        label: "Auto Dismissed",
        className: "bg-slate-700 text-slate-500",
      },
    };
    return (
      statusMap[status] || {
        label: status.replace("_", " "),
        className: "bg-slate-800 text-slate-400",
      }
    );
  };

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-100">
          Welcome back, {user?.username || "User"}! 👋
        </h2>
        <p className="text-slate-400 mt-1">
          Here&apos;s an overview of your violence detection activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Videos"
          value={stats.totalVideos}
          subtitle="All time"
          gradient="bg-gradient-to-br from-cyan-400 to-cyan-500"
          icon={
            <svg
              className="w-7 h-7 text-white"
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
          }
        />
        <StatsCard
          title="Alerts Generated"
          value={stats.alertsGenerated}
          subtitle="Violence detected"
          gradient="bg-gradient-to-br from-purple-400 to-purple-500"
          icon={
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Active Streams"
          value={stats.streamsActive}
          subtitle="Currently monitoring"
          gradient="bg-gradient-to-br from-pink-400 to-rose-500"
          icon={
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
              />
            </svg>
          }
        />
        <StatsCard
          title="This Month"
          value={stats.thisMonth}
          subtitle="Videos analyzed"
          gradient="bg-gradient-to-br from-orange-400 to-orange-500"
          icon={
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">
              Recent Stream History
            </h3>
            <button
              onClick={() => onTabChange("history")}
              className="text-cyan-400 text-sm font-medium hover:text-cyan-300 flex items-center gap-1"
            >
              View all
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm">
            {isLoadingEvents ? (
              <div className="p-6 space-y-4">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-4 animate-pulse"
                  >
                    <div className="w-24 h-14 bg-slate-800 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-800 rounded w-40" />
                      <div className="h-3 bg-slate-800 rounded w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : streamEvents.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 text-slate-600">
                  <svg
                    className="w-full h-full"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-slate-300 font-medium mb-2">
                  No stream history yet
                </h4>
                <p className="text-slate-500 text-sm mb-4">
                  Start a live stream to see detections here
                </p>
                <button
                  onClick={() => onTabChange("streams")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                  Start Stream
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {streamEvents.map((event) => {
                  const eventTime = event.started_at || event.start_time;
                  const statusInfo = getStatusDisplay(event.status);
                  const isUpdating = updatingEventId === event.id;
                  const isPending = event.status === "PENDING";

                  return (
                    <div key={event.id} className="p-4 flex items-center gap-4">
                      <div className="w-28 h-16 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {event.thumbnail_path ? (
                          <img
                            src={streamService.getThumbnailUrl(
                              event.thumbnail_path,
                            )}
                            alt="Event thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-6 h-6 text-slate-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-100 font-medium truncate">
                          {event.stream_name ||
                            `Stream ${String(event.stream_id).slice(0, 8)}`}
                        </p>
                        <p className="text-slate-500 text-sm">
                          {formatEventTime(eventTime)}
                        </p>
                      </div>
                      {isPending ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-400 mr-2">
                            Action taken?
                          </span>
                          <button
                            onClick={() => handleActionExecuted(event.id)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? "..." : "Yes"}
                          </button>
                          <button
                            onClick={() => handleNoActionRequired(event.id)}
                            disabled={isUpdating}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? "..." : "No"}
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-4">
            <QuickActionCard
              title="Upload Video"
              description="Analyze a new video"
              onClick={() => onTabChange("upload")}
              gradient="bg-gradient-to-br from-cyan-400 to-cyan-500"
              icon={
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
            />
            <QuickActionCard
              title="Add Stream"
              description="Monitor live RTSP"
              onClick={() => onTabChange("streams")}
              gradient="bg-gradient-to-br from-cyan-400 to-blue-500"
              icon={
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                  />
                </svg>
              }
            />
            <QuickActionCard
              title="View Alerts"
              description="See all detections"
              onClick={() => onTabChange("alerts")}
              gradient="bg-gradient-to-br from-blue-400 to-indigo-500"
              icon={
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
