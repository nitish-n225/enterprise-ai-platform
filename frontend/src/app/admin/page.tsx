"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { User, ApprovalItem, HealthStatus } from "@/types";
import {
  Shield,
  Users,
  Key,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  Settings,
  AlertCircle,
  Check,
  X,
  ExternalLink,
  FileText,
  Database,
  UserCheck,
  RefreshCw,
  Sparkles
} from "lucide-react";

export default function AdminPortalPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeRole, setActiveRole] = useState<"admin" | "analyst" | "viewer">("admin");
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      await api.ensureSession();
      const [uList, appList, h] = await Promise.all([
        api.getUsers().catch(() => [
          { id: 1, username: "admin", email: "admin@enterprise-ai.local", role: "admin", is_active: true, full_name: "Enterprise Administrator" },
          { id: 2, username: "analyst", email: "analyst@enterprise-ai.local", role: "analyst", is_active: true, full_name: "Operations Analyst" },
          { id: 3, username: "viewer", email: "viewer@enterprise-ai.local", role: "viewer", is_active: true, full_name: "Executive Viewer" },
        ] as User[]),
        api.getApprovals("pending").catch(() => []),
        api.getHealth().catch(() => null),
      ]);
      setUsers(uList);
      setApprovals(appList);
      setHealth(h);

      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.role) setActiveRole(parsed.role);
        } catch (e) {}
      }
    } catch (err: any) {
      console.error("Admin portal load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleSwitch = async (role: "admin" | "analyst" | "viewer") => {
    try {
      setActionFeedback(null);
      const res = await api.login(role, `${role}123`);
      setActiveRole(role);
      setActionFeedback(`Active session successfully switched to ${role.toUpperCase()} (${res.user.email}). Bearer token refreshed.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(`Role switch failed: ${err.message}`);
    }
  };

  const handleReviewAction = async (id: number, status: "APPROVED" | "REJECTED") => {
    try {
      setProcessingId(id);
      await api.reviewApproval(id, status, `Reviewed and ${status.toLowerCase()} via Admin Portal Console.`);
      setActionFeedback(`Action #${id} has been marked as ${status}. Audit log recorded.`);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(`Failed to update approval: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const roleCapabilities: Record<string, string[]> = {
    admin: ["Full Database Read & Query", "Vector Document Ingestion", "Approve/Reject High-Impact Actions", "System Settings & RBAC"],
    analyst: ["Safe SQL Query Generation", "Pandas MoM Financial Analytics", "Stage Actions into Approval Queue", "Security Audit Viewing"],
    viewer: ["Natural Language Chat Inquiries", "Dashboard & Financial Reporting", "Read-Only Knowledge Citations"],
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-7 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-400/30 mb-2 font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Enterprise Security & Administration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Admin Portal & Governance Console
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Manage system identities, enforce role-based access control (RBAC), review supervised approval queues, and inspect audit compliance.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/settings"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-medium">{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-indigo-400 hover:text-indigo-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin KPI Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Users</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{users.length}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
            <span className="text-indigo-600 font-semibold">3 Active Roles</span>
            <span>(Admin, Analyst, Viewer)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{approvals.length}</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
            <span className={approvals.length > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {approvals.length > 0 ? "Requires Review" : "All Clear"}
            </span>
            <span>• Human-in-the-Loop</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Role</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900 uppercase font-mono">{activeRole}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>JWT Bearer Authenticated</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">API Health Status</span>
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {health?.status === "healthy" ? "Online" : "Connecting"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            FastAPI • SQLite / PostgreSQL Engine
          </div>
        </div>
      </div>

      {/* Role-Based Access Control (RBAC) Switcher & User Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>System User Directory & Access Governance</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or switch active user credentials to test permissions and endpoint authorization.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {(["admin", "analyst", "viewer"] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleRoleSwitch(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition flex items-center space-x-1.5 ${
                  activeRole === r
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{r}</span>
                {activeRole === r && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Enterprise Capabilities</th>
                <th className="p-4 text-right">Switch Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = u.role === activeRole;
                return (
                  <tr key={u.id} className={isCurrent ? "bg-indigo-50/40" : "hover:bg-slate-50/60"}>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{u.full_name || u.username}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase ${
                          u.role === "admin"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : u.role === "analyst"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 text-emerald-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>Active</span>
                      </span>
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="space-y-0.5">
                        {(roleCapabilities[u.role] || []).slice(0, 2).map((cap, cIdx) => (
                          <div key={cIdx} className="text-slate-600 truncate flex items-center space-x-1">
                            <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
                            <span>{cap}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {isCurrent ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-semibold border border-emerald-200">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Active Session</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRoleSwitch(u.role as any)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-md transition"
                        >
                          Switch
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Human Approvals Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Human-in-the-Loop Actions</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-impact operations staged by autonomous agents awaiting administrator sign-off.
            </p>
          </div>
          <Link
            href="/approvals"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View Full Queue</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {approvals.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            <p className="font-semibold text-slate-800">No Pending Approvals</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All staged operational actions have been reviewed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approvals.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-slate-900">{req.title}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      {req.action_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{req.description}</p>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Requested by: <span className="font-mono">{req.requested_by}</span> • Reference: #{req.id}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    disabled={processingId === req.id}
                    onClick={() => handleReviewAction(req.id, "APPROVED")}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    disabled={processingId === req.id}
                    onClick={() => handleReviewAction(req.id, "REJECTED")}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/audit"
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div>
            <div className="p-2 w-fit rounded-lg bg-indigo-50 text-indigo-600 mb-2">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 group-hover:text-indigo-600 transition">
              Security & Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Inspect tamper-evident operational logs, IP tracking, and AST SQL safety blocks.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
            <span>Open Audit Console</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/knowledge"
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div>
            <div className="p-2 w-fit rounded-lg bg-purple-50 text-purple-600 mb-2">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 group-hover:text-purple-600 transition">
              Knowledge Base & RAG Index
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload PDF/DOCX policy documents, manage chunks, and inspect vector similarity scores.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-purple-600 font-semibold">
            <span>Inspect Vector Store</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/settings"
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between group"
        >
          <div>
            <div className="p-2 w-fit rounded-lg bg-slate-50 text-slate-600 mb-2">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 group-hover:text-slate-800 transition">
              Platform & LLM Parameters
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Configure active Gemini LLM models, vector chunking thresholds, and API secrets.
            </p>
          </div>
          <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700 font-semibold">
            <span>System Settings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
