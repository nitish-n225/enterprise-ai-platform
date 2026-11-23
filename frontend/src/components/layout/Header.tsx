"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { HealthStatus } from "@/types";
import {
  Shield,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Globe,
  Building2,
  Check,
  Plus,
  CheckCircle2,
  X
} from "lucide-react";

export interface WorkspaceOption {
  id: string;
  name: string;
  region: string;
  environment: "Production" | "Staging";
  activeAgents: number;
  badge: string;
}

export const DEFAULT_WORKSPACES: WorkspaceOption[] = [
  {
    id: "global-ops",
    name: "Global Operations (Production)",
    region: "Global Multi-Region",
    environment: "Production",
    activeAgents: 4,
    badge: "Primary",
  },
  {
    id: "na-commercial",
    name: "North America Commercial",
    region: "us-east & us-west",
    environment: "Production",
    activeAgents: 4,
    badge: "US",
  },
  {
    id: "emea-distribution",
    name: "EMEA Retail & Distribution",
    region: "eu-central-1 (Frankfurt)",
    environment: "Production",
    activeAgents: 3,
    badge: "EU",
  },
  {
    id: "apac-cloud",
    name: "APAC Enterprise Cloud",
    region: "ap-southeast-1 (Singapore)",
    environment: "Production",
    activeAgents: 4,
    badge: "APAC",
  },
  {
    id: "sandbox-ops",
    name: "Autonomous Ops Sandbox",
    region: "Isolated Staging",
    environment: "Staging",
    activeAgents: 4,
    badge: "Lab",
  },
];

export function Header() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workspace state
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>(DEFAULT_WORKSPACES);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceOption>(DEFAULT_WORKSPACES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

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

    // Initialize workspace from localStorage
    try {
      const saved = localStorage.getItem("enterprise_workspace");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          setActiveWorkspace(parsed);
        }
      }
    } catch (e) {}

    // Listen for external workspace changes
    const handleExternalChange = (e: any) => {
      if (e.detail && e.detail.name) {
        setActiveWorkspace(e.detail);
      }
    };
    window.addEventListener("workspaceChanged", handleExternalChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("workspaceChanged", handleExternalChange);
    };
  }, []);

  const handleSelectWorkspace = (ws: WorkspaceOption) => {
    setActiveWorkspace(ws);
    setIsDropdownOpen(false);
    try {
      localStorage.setItem("enterprise_workspace", JSON.stringify(ws));
      window.dispatchEvent(new CustomEvent("workspaceChanged", { detail: ws }));
    } catch (e) {}

    setToastMessage(`Switched operational workspace to "${ws.name}"`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const newWs: WorkspaceOption = {
      id: `ws-${Date.now()}`,
      name: newWorkspaceName.trim(),
      region: "Custom Enterprise Cluster",
      environment: "Production",
      activeAgents: 4,
      badge: "Custom",
    };

    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    setActiveWorkspace(newWs);
    setNewWorkspaceName("");
    setIsCreatingWorkspace(false);
    setIsDropdownOpen(false);

    try {
      localStorage.setItem("enterprise_workspace", JSON.stringify(newWs));
      window.dispatchEvent(new CustomEvent("workspaceChanged", { detail: newWs }));
    } catch (e) {}

    setToastMessage(`Created and activated workspace "${newWs.name}"`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Interactive Workspace Dropdown */}
      <div className="relative flex items-center space-x-3">
        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
          Workspace
        </span>

        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex items-center space-x-2 text-sm font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition shadow-sm cursor-pointer select-none"
          title="Click to switch or manage operational workspaces"
        >
          <Globe className="w-4 h-4 text-indigo-600" />
          <span className="max-w-[200px] sm:max-w-xs truncate">{activeWorkspace.name}</span>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">
            {activeWorkspace.badge}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180 text-indigo-600" : ""
            }`}
          />
        </button>

        {/* Click-outside backdrop */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40 bg-transparent cursor-default"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-0 sm:left-12 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Switch Operational Workspace</p>
                <p className="text-[10px] text-slate-500">
                  Select tenant scope, regional clusters & active agents
                </p>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                {workspaces.length} Available
              </span>
            </div>

            {/* Workspaces List */}
            <div className="max-h-64 overflow-y-auto py-1 space-y-1">
              {workspaces.map((ws) => {
                const isSelected = ws.id === activeWorkspace.id;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => handleSelectWorkspace(ws)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border border-indigo-200 text-slate-900"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate flex items-center space-x-1.5">
                          <span>{ws.name}</span>
                          {isSelected && (
                            <span className="text-[9px] bg-indigo-600 text-white font-mono px-1 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                          <span>{ws.region}</span>
                          <span>•</span>
                          <span>{ws.activeAgents} Agents Active</span>
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                        {ws.environment}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Add Custom Workspace Form */}
            {isCreatingWorkspace ? (
              <form onSubmit={handleCreateWorkspace} className="mt-2 pt-2 border-t border-slate-100 p-2 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>New Workspace Name</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingWorkspace(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    placeholder="e.g. EU Commercial Branch"
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
                  >
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingWorkspace(true)}
                  className="flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">
                  Multi-Tenant Scope
                </span>
              </div>
            )}
          </div>
        )}

        {/* Temporary Switch Toast */}
        {toastMessage && (
          <div className="absolute left-0 -bottom-9 bg-slate-900 text-white text-xs px-3 py-1 rounded-md shadow-md flex items-center space-x-1.5 z-40 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
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
