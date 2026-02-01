"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Shield,
  Upload,
  BarChart3,
  Video,
  Brain,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Videos", href: "/videos", icon: Video },
  { name: "Predictions", href: "/predictions", icon: Brain },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="glass-card border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg glow-primary">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-success-500 rounded-full animate-pulse" />
            </motion.div>
            <div>
              <span className="text-xl font-bold text-gradient">
                ViolenceSense
              </span>
              <div className="flex items-center space-x-1 text-xs text-dark-400">
                <Activity className="w-3 h-3" />
                <span>AI-Powered</span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.name} href={item.href}>
                  <motion.div
                    className={cn(
                      "relative px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors",
                      isActive
                        ? "text-primary-400"
                        : "text-dark-400 hover:text-white hover:bg-white/5",
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 bg-primary-500/10 border border-primary-500/30 rounded-lg -z-10"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-success-500/10 border border-success-500/30">
              <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              <span className="text-xs text-success-400 font-medium">
                System Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
