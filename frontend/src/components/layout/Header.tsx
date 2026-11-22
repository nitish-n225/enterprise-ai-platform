"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HealthStatus } from "@/types";
import { Shield, Bell, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export function Header() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const data = await api.getHealth();
      setHealth(data);
      setError(null);
    } catch (err: any) {
      setError("Backend Offline");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
          Workspace
        </span>
        <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
          Global Operations (Production Demo)
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Backend & DB Health Indicator */}
        <div className="flex items-center space-x-2 text-xs border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-full">
          {loading && !health ? (
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          ) : error ? (
            <div className="flex items-center space-x-1.5 text-rose-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FastAPI & DB Connected</span>
            </div>
          )}
        </div>

        {/* User Role Badge */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-bold">
            AD
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold text-slate-800">Admin User</div>
            <div className="text-[10px] text-slate-500 flex items-center space-x-1">
              <Shield className="w-2.5 h-2.5 text-indigo-500" />
              <span>Full Role (Admin)</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
