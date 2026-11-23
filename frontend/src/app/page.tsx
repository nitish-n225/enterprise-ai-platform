"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HealthStatusCard } from "@/components/dashboard/HealthStatusCard";
import { QuickMetricsGrid } from "@/components/dashboard/QuickMetricsGrid";
import { DEFAULT_WORKSPACES, WorkspaceOption } from "@/components/layout/Header";
import {
  Bot,
  BarChart3,
  Database,
  FileText,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Send,
  Terminal,
  FileSearch,
  Globe,
  CheckCircle2
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [quickQuery, setQuickQuery] = useState("");
  const [activeWs, setActiveWs] = useState<WorkspaceOption>(DEFAULT_WORKSPACES[0]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("enterprise_workspace");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) setActiveWs(parsed);
      }
    } catch (e) {}

    const handleWsChange = (e: any) => {
      if (e.detail?.name) setActiveWs(e.detail);
    };
    window.addEventListener("workspaceChanged", handleWsChange);
    return () => window.removeEventListener("workspaceChanged", handleWsChange);
  }, []);

  const handleDispatchAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(quickQuery.trim())}`);
  };

  const handleChipClick = (prompt: string) => {
    router.push(`/chat?q=${encodeURIComponent(prompt)}`);
  };

  const autonomousAgents = [
    {
      name: "Safe SQL Operations Agent",
      role: "Relational Queries & Orders",
      badge: "AST Verified",
      color: "border-indigo-200 bg-indigo-50/50",
      icon: <Terminal className="w-4 h-4 text-indigo-600" />,
      examplePrompt: "What was our total revenue?",
      status: "Online & Ready",
    },
    {
      name: "Financial Intelligence Agent",
      role: "Pandas MoM & Revenue Trends",
      badge: "Deterministic",
      color: "border-emerald-200 bg-emerald-50/50",
      icon: <BarChart3 className="w-4 h-4 text-emerald-600" />,
      examplePrompt: "Compare this month's revenue with last month.",
      status: "Online & Ready",
    },
    {
      name: "Grounded Knowledge Agent",
      role: "Vector RAG & Policy Search",
      badge: "Cited RAG",
      color: "border-purple-200 bg-purple-50/50",
      icon: <FileSearch className="w-4 h-4 text-purple-600" />,
      examplePrompt: "Search company documents for our refund policy.",
      status: "Online & Ready",
    },
    {
      name: "Governance & Approvals Agent",
      role: "Human-in-the-Loop Supervision",
      badge: "RBAC Guarded",
      color: "border-amber-200 bg-amber-50/50",
      icon: <ShieldCheck className="w-4 h-4 text-amber-600" />,
      examplePrompt: "Please escalate an urgent support ticket for gateway timeout",
      status: "Online & Ready",
    },
  ];

  const quickActions = [
    {
      title: "AI Operations Agent Chat",
      description: "Ask natural language questions across enterprise sales, products, and financial metrics.",
      href: "/chat",
      icon: <Bot className="w-5 h-5 text-indigo-600" />,
      buttonText: "Launch Chat Agent",
    },
    {
      title: "Business Analytics & Safe SQL",
      description: "Query enterprise orders, products, and MoM trends with deterministic safety guardrails.",
      href: "/analytics",
      icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
      buttonText: "View Analytics",
    },
    {
      title: "Knowledge Base (RAG)",
      description: "Inspect uploaded enterprise documentation, refund policies, and SLA contracts with chunk citations.",
      href: "/knowledge",
      icon: <Database className="w-5 h-5 text-purple-600" />,
      buttonText: "Open Knowledge Base",
    },
    {
      title: "Downloadable Reports",
      description: "Generate structured executive summaries and download audit-ready CSV & PDF reports.",
      href: "/reports",
      icon: <FileText className="w-5 h-5 text-sky-600" />,
      buttonText: "Generate Reports",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-7 text-white shadow-md border border-slate-800">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-400/30 mb-3 font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>Agentic AI Operations Platform Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Enterprise AI Business Operations Center
          </h1>
        </div>
      </div>

      {/* Active Workspace Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs gap-2">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span className="text-slate-500 font-medium">Operational Workspace:</span>
          <span className="font-bold text-slate-800">{activeWs.name}</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-semibold border border-indigo-200">
            {activeWs.region}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-emerald-600 font-medium flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeWs.activeAgents} Autonomous Agents Active</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-mono">{activeWs.environment} Tier</span>
        </div>
      </div>

      {/* KPI Cards (Dynamic to Selected Workspace) */}
      <QuickMetricsGrid />

      {/* Autonomous Agents Operations Hub & Quick Dispatcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Autonomous Operations Agents</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Coordinated multi-agent workflow ready to process queries, run analytics, search contracts, or stage approvals.
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 shrink-0 self-start sm:self-auto"
          >
            <Bot className="w-4 h-4" />
            <span>Open Dedicated Agent Chat</span>
          </Link>
        </div>

        {/* Quick Dispatch Input Bar */}
        <form onSubmit={handleDispatchAgent} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Ask the operations agent (e.g. 'What was our total revenue?' or 'Compare MoM sales')..."
              className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition flex items-center space-x-1.5 shrink-0 shadow-sm"
          >
            <span>Dispatch Agent</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Active Agents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {autonomousAgents.map((agent, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border ${agent.color} flex flex-col justify-between space-y-3 transition hover:shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-100">
                    {agent.icon}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold">
                    {agent.badge}
                  </span>
                </div>
                <h4 className="font-semibold text-xs text-slate-900">{agent.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{agent.role}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <div className="flex items-center space-x-1 text-[10px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{agent.status}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleChipClick(agent.examplePrompt)}
                  className="w-full text-left text-[11px] text-indigo-700 hover:text-indigo-900 font-medium bg-white/80 hover:bg-white p-1.5 rounded-lg border border-slate-200/80 truncate flex items-center justify-between transition group cursor-pointer"
                >
                  <span className="truncate pr-1">Run: &ldquo;{agent.examplePrompt}&rdquo;</span>
                  <ArrowRight className="w-3 h-3 text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Health Diagnostics */}
      <HealthStatusCard />

      {/* Quick Access Modules */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Operational Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    {action.icon}
                  </div>
                  <h4 className="font-semibold text-slate-900 text-base">{action.title}</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{action.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <Link
                  href={action.href}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <span>{action.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
