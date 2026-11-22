import React from "react";
import Link from "next/link";
import { HealthStatusCard } from "@/components/dashboard/HealthStatusCard";
import { QuickMetricsGrid } from "@/components/dashboard/QuickMetricsGrid";
import { Bot, BarChart3, Database, FileText, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function HomePage() {
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
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Multi-tool orchestrated intelligence powered by LangGraph, Gemini, Safe SQL AST validation, and grounded Document RAG. Execute complex enterprise queries and trigger safe, audited actions.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <QuickMetricsGrid />

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

