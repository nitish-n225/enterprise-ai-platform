"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HealthStatus, DatabaseHealth } from "@/types";
import { Server, Database, Cpu, Activity, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export function HealthStatusCard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [h, dbH] = await Promise.all([api.getHealth(), api.getDatabaseHealth()]);
      setHealth(h);
      setDbHealth(dbH);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to contact backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-800">System Infrastructure Status</h2>
          <p className="text-xs text-slate-500">FastAPI Backend, SQLAlchemy Database & LangGraph Diagnostics</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error ? (
        <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Connection Warning</h4>
            <p className="text-xs mt-0.5">{error}</p>
            <p className="text-xs mt-1 text-rose-600">Ensure the backend API service is online and healthy.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* API Server Node */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API Gateway</span>
              <Server className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg font-bold text-slate-800">
                {health?.status === "healthy" ? "Online" : "Degraded"}
              </span>
              <span className="text-xs text-emerald-600 font-medium">HTTP 200</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <div>Uptime: <span className="font-mono text-slate-700">{health?.uptime_seconds ?? "--"}s</span></div>
              <div>Env: <span className="font-medium text-slate-700">{health?.environment ?? "--"}</span></div>
            </div>
          </div>

          {/* Database Node */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Relational DB</span>
              <Database className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg font-bold text-slate-800">
                {dbHealth?.connected ? "Connected" : "Disconnected"}
              </span>
              <span className="text-xs text-slate-600 uppercase font-mono">{dbHealth?.database_type}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <div>Tables: <span className="font-medium text-slate-700">{dbHealth?.details.table_count ?? "--"} tables loaded</span></div>
              <div>Target: <span className="font-mono text-[11px] text-slate-700">{dbHealth?.details.url_masked ?? "--"}</span></div>
            </div>
          </div>

          {/* AI Orchestrator Node */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">AI Engine</span>
              <Cpu className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-lg font-bold text-slate-800">
                {health?.services.ai_engine === "gemini_ready" ? "Google Gemini Active" : "Autonomous Operations Engine"}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              <div>Orchestration: <span className="font-medium text-indigo-700">LangGraph</span></div>
              <div>RAG Pipeline: <span className="font-medium text-slate-700">Vector Embeddings Ready</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
