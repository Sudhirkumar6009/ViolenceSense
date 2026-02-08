"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileTab() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Your Profile</h1>
        <p className="text-slate-400">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-cyan-500 to-blue-600"></div>

        {/* Profile Info */}
        <div className="px-8 pb-8">
          <div className="flex items-end gap-6 -mt-12 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl border-4 border-slate-900 shadow-lg">
              {user.username?.charAt(0).toUpperCase() ||
                user.email?.charAt(0).toUpperCase() ||
                "U"}
            </div>
            <div className="pb-2">
              <h2 className="text-2xl font-bold text-white">{user.username}</h2>
              <p className="text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Username
              </label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-slate-100">
                {user.username}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Email
              </label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-slate-100">
                {user.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Provider
              </label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-slate-100 flex items-center gap-2">
                {user.provider === "google" ? (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Account ID
              </label>
              <div className="px-4 py-3 bg-slate-800 rounded-xl text-slate-500 text-sm font-mono truncate">
                {user.id}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Account Actions
        </h3>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <span className="text-slate-200">Change Password</span>
            </div>
            <svg
              className="w-5 h-5 text-slate-500 group-hover:text-slate-300"
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
          <button className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-slate-200">Export Data</span>
            </div>
            <svg
              className="w-5 h-5 text-slate-500 group-hover:text-slate-300"
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
          <button className="w-full flex items-center justify-between px-4 py-3 text-left bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors group">
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="text-red-400">Delete Account</span>
            </div>
            <svg
              className="w-5 h-5 text-red-500 group-hover:text-red-400"
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
      </div>
    </div>
  );
}
