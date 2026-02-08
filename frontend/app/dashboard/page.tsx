"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts } from "@/hooks/useWebSocket";
import DashboardSidebar, { TabId } from "@/components/DashboardSidebar";
import ViolenceAlertToast from "@/components/ViolenceAlertToast";
import NotificationPanel from "@/components/NotificationPanel";
import {
  DashboardOverview,
  UploadTab,
  StreamsTab,
  VideosTab,
  AlertsTab,
  HistoryTab,
  ProfileTab,
  SettingsTab,
} from "@/components/tabs";

// Tab titles & icons for header
const tabMeta: Record<TabId, { subtitle: string }> = {
  dashboard: { subtitle: "Overview of your activity" },
  upload: { subtitle: "Analyze videos for violence" },
  streams: { subtitle: "Monitor RTSP camera feeds" },
  videos: { subtitle: "All uploaded videos" },
  alerts: { subtitle: "Violence detection events" },
  history: { subtitle: "All prediction results" },
  profile: { subtitle: "Your account information" },
  settings: { subtitle: "System configuration" },
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [notifOpen, setNotifOpen] = useState(false);
  const { alerts, pendingCount, clearPending, dismissAlert } = useAlerts();

  const goToHistory = useCallback(() => {
    setActiveTab("history");
    setNotifOpen(false);
  }, []);

  // Set initial tab from URL search params (e.g. /dashboard?tab=streams)
  useEffect(() => {
    const tab = searchParams.get("tab") as TabId | null;
    if (tab && tab in tabMeta) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const meta = tabMeta[activeTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="ml-64 min-h-screen transition-all duration-300">
        {/* Header */}
        <header className="bg-slate-950 border-b border-slate-800 px-8 py-4 flex justify-between items-center sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              {meta.subtitle}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors relative"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>
              <NotificationPanel
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                alerts={alerts}
                pendingCount={pendingCount}
                onClearPending={clearPending}
                onDismiss={dismissAlert}
                onViewHistory={goToHistory}
              />
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === "dashboard" && (
            <DashboardOverview onTabChange={setActiveTab} />
          )}
          {activeTab === "upload" && <UploadTab />}
          {activeTab === "streams" && <StreamsTab />}
          {activeTab === "videos" && <VideosTab onTabChange={setActiveTab} />}
          {activeTab === "alerts" && <AlertsTab />}
          {activeTab === "history" && <HistoryTab onTabChange={setActiveTab} />}
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </main>

      {/* Violence Alert Toasts */}
      <ViolenceAlertToast
        alerts={alerts}
        onDismiss={dismissAlert}
        onViewHistory={goToHistory}
      />
    </div>
  );
}
