"use client";

import React, { useEffect, useState } from "react";
import { Users, DollarSign, Clock, FileCheck } from "lucide-react";

interface WorkspaceMetrics {
  customers: string;
  customersSub: string;
  customersChange: string;
  revenue: string;
  revenueSub: string;
  revenueChange: string;
  approvals: string;
  approvalsSub: string;
  approvalsAlert: boolean;
  approvalsChange: string;
  documents: string;
  documentsSub: string;
  documentsChange: string;
}

const METRICS_MAP: Record<string, WorkspaceMetrics> = {
  "global-ops": {
    customers: "15",
    customersSub: "Across 4 Global Regions",
    customersChange: "+12% QoQ",
    revenue: "$2,840,500",
    revenueSub: "Trailing 12-Month Sales",
    revenueChange: "+8.4% MoM",
    approvals: "1",
    approvalsSub: "Severity-1 Ticket Escalation",
    approvalsAlert: true,
    approvalsChange: "Requires Action",
    documents: "2",
    documentsSub: "Refund Policy & SLA Chunks",
    documentsChange: "Vector Indexed",
  },
  "na-commercial": {
    customers: "8",
    customersSub: "US East & West Regions",
    customersChange: "+15% QoQ",
    revenue: "$1,420,250",
    revenueSub: "North America Regional Sales",
    revenueChange: "+9.2% MoM",
    approvals: "1",
    approvalsSub: "Commercial Contract Override",
    approvalsAlert: true,
    approvalsChange: "Requires Action",
    documents: "2",
    documentsSub: "US Corporate Guidelines",
    documentsChange: "Vector Indexed",
  },
  "emea-distribution": {
    customers: "5",
    customersSub: "Frankfurt, London & Paris",
    customersChange: "+7% QoQ",
    revenue: "$852,150",
    revenueSub: "European Union Sales Volume",
    revenueChange: "+6.8% MoM",
    approvals: "0",
    approvalsSub: "All Regional Actions Approved",
    approvalsAlert: false,
    approvalsChange: "All Clear",
    documents: "2",
    documentsSub: "EU GDPR & Retention Docs",
    documentsChange: "Vector Indexed",
  },
  "apac-cloud": {
    customers: "4",
    customersSub: "Singapore, Tokyo & Sydney",
    customersChange: "+18% QoQ",
    revenue: "$568,100",
    revenueSub: "Asia-Pacific Regional Sales",
    revenueChange: "+11.4% MoM",
    approvals: "0",
    approvalsSub: "Zero Escalations Pending",
    approvalsAlert: false,
    approvalsChange: "All Clear",
    documents: "2",
    documentsSub: "APAC Service Agreements",
    documentsChange: "Vector Indexed",
  },
  "sandbox-ops": {
    customers: "2",
    customersSub: "Isolated Test Accounts",
    customersChange: "Test Tier",
    revenue: "$125,000",
    revenueSub: "Autonomous Ops Test Volume",
    revenueChange: "Staging Active",
    approvals: "0",
    approvalsSub: "Sandbox Approvals Clear",
    approvalsAlert: false,
    approvalsChange: "Staging",
    documents: "2",
    documentsSub: "Sample Operations Docs",
    documentsChange: "Vector Indexed",
  },
};

export function QuickMetricsGrid() {
  const [activeWsId, setActiveWsId] = useState<string>("global-ops");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("enterprise_workspace");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id) setActiveWsId(parsed.id);
      }
    } catch (e) {}

    const handleWsChange = (e: any) => {
      if (e.detail?.id) {
        setActiveWsId(e.detail.id);
      }
    };
    window.addEventListener("workspaceChanged", handleWsChange);
    return () => window.removeEventListener("workspaceChanged", handleWsChange);
  }, []);

  const data = METRICS_MAP[activeWsId] || METRICS_MAP["global-ops"];

  const metrics = [
    {
      label: "Active Enterprise Customers",
      value: data.customers,
      subtext: data.customersSub,
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      change: data.customersChange,
    },
    {
      label: "Enterprise Gross Revenue",
      value: data.revenue,
      subtext: data.revenueSub,
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      change: data.revenueChange,
    },
    {
      label: "Pending Human Approvals",
      value: data.approvals,
      subtext: data.approvalsSub,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      change: data.approvalsChange,
      alert: data.approvalsAlert,
    },
    {
      label: "Indexed Corporate Documents",
      value: data.documents,
      subtext: data.documentsSub,
      icon: <FileCheck className="w-5 h-5 text-purple-600" />,
      change: data.documentsChange,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{m.label}</span>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">{m.icon}</div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{m.value}</div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span className="truncate pr-1">{m.subtext}</span>
              <span className={`font-semibold shrink-0 ${m.alert ? "text-amber-600" : "text-emerald-600"}`}>
                {m.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
