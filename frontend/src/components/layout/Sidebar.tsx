"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  BarChart3,
  FileText,
  FileCheck2,
  ShieldCheck,
  Database,
  Settings,
  Sparkles,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export function Sidebar() {
  const pathname = usePathname();

  const navigation: NavItem[] = [
    { label: "Dashboard", href: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "AI Operations Chat", href: "/chat", icon: <Bot className="w-5 h-5" />, badge: "Agentic" },
    { label: "Business Analytics", href: "/analytics", icon: <BarChart3 className="w-5 h-5" /> },
    { label: "Knowledge Base (RAG)", href: "/knowledge", icon: <Database className="w-5 h-5" /> },
    { label: "Reports Generator", href: "/reports", icon: <FileText className="w-5 h-5" /> },
    { label: "Human Approvals", href: "/approvals", icon: <FileCheck2 className="w-5 h-5" />, badge: "1 Pending" },
    { label: "Security & Audit", href: "/audit", icon: <ShieldCheck className="w-5 h-5" /> },
    { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 min-h-screen flex flex-col border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-semibold text-sm text-white tracking-wide leading-tight">
            Enterprise AI
          </h1>
          <p className="text-xs text-slate-400">Operations Agent</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Core Workflows
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.badge === "Agentic"
                      ? "bg-indigo-500/30 text-indigo-200 border border-indigo-400/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Orchestrator Active</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
