"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Database,
  Cpu,
  Layers,
  Sparkles,
  Key,
  CheckCircle2,
  Lock,
  UserCheck,
  Server,
} from "lucide-react";
import { api } from "@/lib/api";
import { HealthStatus } from "@/types";

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [activeRole, setActiveRole] = useState<"admin" | "analyst" | "viewer">("admin");
  const [activeUser, setActiveUser] = useState<string>("admin");
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setActiveRole(u.role || "admin");
        setActiveUser(u.username || "admin");
      } catch (e) {}
    }
  }, []);

  const handleSimulateRoleSwitch = async (role: "admin" | "analyst" | "viewer") => {
    try {
      setLoginFeedback(null);
      const res = await api.login(role, `${role}123`);
      setActiveRole(role);
      setActiveUser(role);
      setLoginFeedback(`Switched active operational session to ${role.toUpperCase()} (${res.user.email}). Bearer token refreshed.`);
    } catch (err: any) {
      setLoginFeedback(`Switch failed: ${err.message}`);
    }
  };

  const rolePermissions = {
    admin: [
      "AST-Verified Read-Only Text-to-SQL Execution",
      "Deterministic Pandas Financial Analytics",
      "Vector RAG Knowledge Search & Grounded Citations",
      "Document Ingestion & File Deletion",
      "ReportLab PDF & CSV Compilation & Downloads",
      "Human-in-the-Loop Review (Approve/Reject Actions)",
      "Security & Compliance Audit Trail Inspection",
      "User Management & System Settings",
    ],
    analyst: [
      "AST-Verified Read-Only Text-to-SQL Execution",
      "Deterministic Pandas Financial Analytics",
      "Vector RAG Knowledge Search & Grounded Citations",
      "ReportLab PDF & CSV Compilation & Downloads",
      "Stage High-Impact Actions into Approval Queue",
      "Security Audit Log Viewing",
    ],
    viewer: [
      "AI Operations Chat (Natural Language Inquiries)",
      "Executive Dashboard & Analytics Visualization",
      "Read-Only Knowledge Base Querying",
      "Download Existing Reports",
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Settings & Governance
          </h1>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 border border-slate-200 font-mono">
            v1.0.0
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Infrastructure parameters, active AI models, vector search thresholds, and role-based access control (RBAC).
        </p>
      </div>

      {loginFeedback && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600" />
          <span>{loginFeedback}</span>
        </div>
      )}

      {/* Role-Based Access Control (RBAC) Tester */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Role-Based Access Control (RBAC) Simulator</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Switch between seeded enterprise identities to test authorization and endpoint policies.
            </p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-slate-400">Current Role:</span>
            <span className="font-semibold text-indigo-600 uppercase font-mono px-2 py-0.5 bg-indigo-50 rounded border border-indigo-200">
              {activeRole}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["admin", "analyst", "viewer"] as const).map((role) => (
            <button
              key={role}
              onClick={() => handleSimulateRoleSwitch(role)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeRole === role
                  ? "bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500 text-slate-900"
                  : "bg-white border-slate-200 hover:border-indigo-300 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-xs capitalize">
                <span>{role} Role</span>
                {activeRole === role && <UserCheck className="w-4 h-4 text-indigo-600" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {role === "admin"
                  ? "Full operational control, approvals, audits, and configuration"
                  : role === "analyst"
                  ? "SQL queries, Pandas BI, RAG search, report exports"
                  : "Read-only executive analytics & chat"}
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                User: {role} / {role}123
              </div>
            </button>
          ))}
        </div>

        {/* Permissions Granted Matrix */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-slate-700 block mb-2">
            Privileges Active for &quot;{activeRole.toUpperCase()}&quot;:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {rolePermissions[activeRole].map((perm, i) => (
              <div
                key={i}
                className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-slate-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform & AI Engine Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI & Vector Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2 pb-2 border-b border-slate-200">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>AI Provider & Vector Architecture</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Primary LLM Provider:</span>
              <span className="font-semibold text-slate-900">Google Gemini (google-genai SDK)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Active Model:</span>
              <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                gemini-2.5-flash / safe-mock
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">LangGraph Execution Loop Limit:</span>
              <span className="font-mono font-semibold text-slate-900">5 Max Iterations</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Embedding Model:</span>
              <span className="font-mono font-semibold text-slate-900">text-embedding-004 (768D)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Vector Search Minimum Threshold:</span>
              <span className="font-mono font-semibold text-slate-900">0.20 Cosine Similarity</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Prompt Injection Filter:</span>
              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Database & Storage Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2 pb-2 border-b border-slate-200">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Database & Document Storage</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Database Engine:</span>
              <span className="font-semibold text-slate-900">
                {health?.services?.database || "SQLite (WAL Mode) / PostgreSQL"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">SQL Engine AST Parser:</span>
              <span className="font-semibold text-slate-900">SQLGlot 30.26 (Read-Only)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Max Result Rows Clamping:</span>
              <span className="font-mono font-semibold text-slate-900">LIMIT 100</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Max Document Upload Size:</span>
              <span className="font-mono font-semibold text-slate-900">15 Megabytes</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Allowed Upload Formats:</span>
              <span className="font-semibold text-slate-900">PDF, DOCX, TXT</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Audit Logging Storage:</span>
              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Synchronous SQLite / Postgres</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

