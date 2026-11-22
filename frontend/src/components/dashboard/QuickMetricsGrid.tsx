import React from "react";
import { Users, DollarSign, Clock, FileCheck, ArrowUpRight } from "lucide-react";

export function QuickMetricsGrid() {
  const metrics = [
    {
      label: "Active Enterprise Customers",
      value: "15",
      subtext: "Across 4 Global Regions",
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      change: "+12% QoQ",
    },
    {
      label: "Simulated Gross Revenue",
      value: "$2,840,500",
      subtext: "Trailing 12-Month Sales",
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      change: "+8.4% MoM",
    },
    {
      label: "Pending Human Approvals",
      value: "1",
      subtext: "Severity-1 Ticket Escalation",
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      change: "Requires Action",
      alert: true,
    },
    {
      label: "Seeded Operations Documents",
      value: "2",
      subtext: "Refund Policy & SLA Chunks",
      icon: <FileCheck className="w-5 h-5 text-purple-600" />,
      change: "Vector Indexed",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{m.label}</span>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">{m.icon}</div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{m.value}</div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500">
              <span>{m.subtext}</span>
              <span className={`font-semibold ${m.alert ? "text-amber-600" : "text-emerald-600"}`}>
                {m.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

