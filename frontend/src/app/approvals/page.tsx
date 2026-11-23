"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  RefreshCw,
  User,
  ArrowRight,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { ApprovalItem } from "@/types";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.getApprovals();
      setApprovals(data);
    } catch (err: any) {
      console.error("Failed to load approvals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleReview = async (id: number, decision: "APPROVED" | "REJECTED") => {
    try {
      setSubmittingId(id);
      setFeedback(null);
      const notes = reviewNotes[id] || "";
      const updated = await api.reviewApproval(id, decision, notes, "user_admin");

      setApprovals((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      setFeedback({
        type: "success",
        message: `Action #${id} has been ${decision.toLowerCase()} successfully.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || `Failed to ${decision.toLowerCase()} approval`,
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredApprovals = approvals.filter((item) => {
    if (activeTab === "ALL") return true;
    return item.status === activeTab;
  });

  const pendingCount = approvals.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Human-in-the-Loop Approvals
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              HITL Guardrails Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Supervised operational control: review, authorize, or reject high-impact AI actions (refunds &gt; $500, Sev-1 incidents, contract overrides).
          </p>
        </div>
        <button
          onClick={loadApprovals}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => {
          const count =
            tab === "ALL"
              ? approvals.length
              : approvals.filter((a) => a.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span className="capitalize">{tab.toLowerCase()}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === tab
                    ? "bg-slate-800 text-white"
                    : tab === "PENDING" && pendingCount > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading approval requests...
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
          No approval requests found matching filter &quot;{activeTab}&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((req) => {
            let parsedPayload: any = {};
            try {
              parsedPayload = JSON.parse(req.payload_json);
            } catch (e) {
              parsedPayload = { raw: req.payload_json };
            }

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
                  req.status === "PENDING"
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-slate-200"
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{req.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        req.action_type === "ISSUE_REFUND"
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : req.action_type === "CREATE_SUPPORT_TICKET"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : req.action_type === "MODIFY_DISCOUNT"
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {req.action_type.replace(/_/g, " ")}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{req.title}</h3>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      req.status === "PENDING"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : req.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-rose-100 text-rose-800 border border-rose-300"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        req.status === "PENDING"
                          ? "bg-amber-500 animate-pulse"
                          : req.status === "APPROVED"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <span>{req.status}</span>
                  </span>
                </div>

                {/* Description & Payload */}
                <div className="py-3 text-xs text-slate-700 space-y-2">
                  <p className="leading-relaxed">{req.description}</p>

                  {/* Formatted Payload Inspection */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                      Action Payload Parameters
                    </div>
                    {Object.entries(parsedPayload).map(([k, v]) => (
                      <div key={k} className="flex">
                        <span className="text-slate-400 w-36 shrink-0">{k}:</span>
                        <span className="text-slate-800 font-medium truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer / Review Form */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    Requested by <span className="font-medium text-slate-600">{req.requested_by}</span> on{" "}
                    {new Date(req.created_at).toLocaleString()}
                  </div>

                  {req.status === "PENDING" ? (
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Resolution justification..."
                        value={reviewNotes[req.id] || ""}
                        onChange={(e) =>
                          setReviewNotes({ ...reviewNotes, [req.id]: e.target.value })
                        }
                        className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
                      />
                      <button
                        onClick={() => handleReview(req.id, "APPROVED")}
                        disabled={submittingId === req.id}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReview(req.id, "REJECTED")}
                        disabled={submittingId === req.id}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-medium text-xs shadow-sm transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Resolved as <strong className="text-slate-800">{req.status}</strong> by{" "}
                      <span className="font-medium">{req.reviewed_by}</span>
                      {req.resolved_at && ` on ${new Date(req.resolved_at).toLocaleDateString()}`}
                      {req.resolution_notes && (
                        <span className="italic ml-1">({req.resolution_notes})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

