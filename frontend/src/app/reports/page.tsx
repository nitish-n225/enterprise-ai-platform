"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { ReportItem } from "@/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [reportType, setReportType] = useState<string>("executive_summary");
  const [fileFormat, setFileFormat] = useState<string>("pdf");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReports();
      setReports(data);
    } catch (err: any) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setFeedback(null);
      const res = await api.generateReport({
        report_type: reportType,
        file_format: fileFormat,
        title: customTitle.trim() || undefined,
      });

      setFeedback({
        type: "success",
        message: `Successfully generated ${res.file_format.toUpperCase()} report: "${res.title}"`,
      });
      setCustomTitle("");
      await loadReports();

      // Trigger automatic download
      window.open(api.getReportDownloadUrl(res.id), "_blank");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to generate business report",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete report "${title}"?`)) return;
    try {
      await api.deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business Reports Generator
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              ReportLab PDF & CSV
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated generation of publication-ready executive PDFs, detailed sales ledgers, and raw CSV analytics.
          </p>
        </div>
        <button
          onClick={loadReports}
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

      {/* Generator Form Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Generate New Operations Report</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Select report parameters below. Reports are compiled from verified live transactional database records.
        </p>

        <form onSubmit={handleGenerate} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Report Type Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="executive_summary">Executive Summary (KPIs, MoM, Top Products)</option>
                <option value="sales_detailed">Detailed Sales Ledger (Orders Breakdown)</option>
                <option value="regional_breakdown">Regional Performance (Market Shares)</option>
              </select>
            </div>

            {/* Format Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFileFormat("pdf")}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    fileFormat === "pdf"
                      ? "bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>ReportLab PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFileFormat("csv")}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    fileFormat === "csv"
                      ? "bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>RFC CSV Export</span>
                </button>
              </div>
            </div>

            {/* Custom Title Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. 2026 Q1 Executive Operations Review"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-sm transition-colors"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling & Rendering...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Generate & Download Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Reports History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Generated Reports Archive</h2>
          <span className="text-xs text-slate-500">{reports.length} report(s) archived</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading reports archive...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No reports generated yet. Use the generator above to create your first executive PDF or CSV ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Report Type</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Generated At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{r.title}</div>
                      <div className="text-[11px] font-mono text-slate-400">{r.filename}</div>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-700 font-medium">
                      {r.report_type.replace("_", " ")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          r.file_format === "pdf"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {r.file_format}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {(r.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <a
                        href={api.getReportDownloadUrl(r.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => handleDelete(r.id, r.title)}
                        className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-800 font-medium text-[11px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

