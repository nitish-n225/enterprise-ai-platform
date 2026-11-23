"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Eye,
  X,
  User,
  Activity,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { AuditLogItem, AuditStats } from "@/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [searchUser, setSearchUser] = useState<string>("");
  const [activeLogDetail, setActiveLogDetail] = useState<AuditLogItem | null>(null);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const [logsData, statsData] = await Promise.all([
        api.getAuditLogs(selectedAction || undefined, searchUser.trim() || undefined, 100),
        api.getAuditStats(),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedAction]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditData();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Security & Operational Audit Log
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Immutable Ledger
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete compliance trail recording user logins, document uploads, reports generation, and Human-in-the-Loop approval decisions.
          </p>
        </div>
        <button
          onClick={fetchAuditData}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Total Audited Events</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats ? stats.total_events : "..."}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Logins Recorded</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats?.actions_breakdown?.USER_LOGIN || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>HITL Approvals</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats?.actions_breakdown?.HITL_APPROVED || 0}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Reports Generated</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {stats?.actions_breakdown?.REPORT_GENERATED || 0}
          </p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="flex-1 flex items-center space-x-2 w-full">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Search by User ID (e.g. admin, analyst, system)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-slate-500 text-xs shrink-0 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Action:</span>
          </span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full sm:w-48 text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
            <option value="REPORT_GENERATED">REPORT_GENERATED</option>
            <option value="HITL_APPROVED">HITL_APPROVED</option>
            <option value="HITL_REJECTED">HITL_REJECTED</option>
            <option value="DATABASE_SEED">DATABASE_SEED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Activity Ledger</h2>
          <span className="text-xs text-slate-500">{logs.length} record(s)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No audit records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{log.user_id || "anonymous"}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{log.user_role || "none"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          log.action.includes("APPROVED") || log.action === "USER_LOGIN"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : log.action.includes("FAILED") || log.action.includes("REJECTED")
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px] truncate max-w-xs">
                      {log.endpoint}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {log.resource_type ? `${log.resource_type} #${log.resource_id || ""}` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                          log.status_code < 300
                            ? "bg-emerald-100 text-emerald-800"
                            : log.status_code < 400
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {log.status_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.details_json ? (
                        <button
                          onClick={() => setActiveLogDetail(log)}
                          className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details JSON Modal */}
      {activeLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-slate-500">
                  Event #{activeLogDetail.id}
                </span>
                <span className="font-semibold text-sm text-slate-900">
                  {activeLogDetail.action}
                </span>
              </div>
              <button
                onClick={() => setActiveLogDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>User:</span>
                <span className="font-semibold text-slate-900">{activeLogDetail.user_id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Timestamp:</span>
                <span className="font-mono">{new Date(activeLogDetail.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Endpoint:</span>
                <span className="font-mono">{activeLogDetail.endpoint}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IP Address:</span>
                <span className="font-mono">{activeLogDetail.ip_address || "127.0.0.1"}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Structured Payload JSON
              </label>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto max-h-48">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(activeLogDetail.details_json || "{}"), null, 2);
                  } catch {
                    return activeLogDetail.details_json;
                  }
                })()}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveLogDetail(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

