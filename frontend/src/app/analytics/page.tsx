"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Globe2,
  RefreshCw,
  Award,
} from "lucide-react";
import { api } from "@/lib/api";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<any>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any>(null);
  const [regional, setRegional] = useState<any>(null);
  const [customers, setCustomers] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, growRes, prodRes, regRes, custRes] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getAnalyticsGrowth(),
        api.getAnalyticsTopProducts(5),
        api.getAnalyticsRegional(),
        api.getAnalyticsCustomers(),
      ]);

      setSummary(sumRes);
      setGrowth(growRes);
      setTopProducts(prodRes);
      setRegional(regRes);
      setCustomers(custRes);
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to load business analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Business Intelligence & Analytics
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Pandas Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial computations, MoM growth metrics, and customer cohort segmentation.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary ? `$${summary.total_gross_revenue.toLocaleString()}` : "..."}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Net: {summary ? `$${summary.total_net_revenue.toLocaleString()}` : "..."}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Orders</span>
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary ? summary.total_orders : "..."}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Processed transactions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Avg Order Value (AOV)</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary ? `$${summary.average_order_value.toLocaleString()}` : "..."}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Per completed order</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>MoM Net Growth</span>
            {growth && growth.growth_percent >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <p
            className={`mt-2 text-2xl font-bold ${
              growth && growth.growth_percent >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {growth ? `${growth.growth_percent >= 0 ? "+" : ""}${growth.growth_percent}%` : "..."}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {growth ? `${growth.current_month} vs ${growth.prior_month}` : "Loading..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top-Selling Products by Revenue</span>
            </h2>
            <span className="text-xs text-slate-400">Top 5</span>
          </div>

          <div className="mt-4 space-y-3">
            {topProducts?.top_products?.map((prod: any, idx: number) => {
              const maxRev = topProducts.top_products[0].total_revenue;
              const pct = maxRev > 0 ? (prod.total_revenue / maxRev) * 100 : 0;
              return (
                <div key={prod.sku} className="text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-800">
                    <span className="truncate max-w-[240px]">
                      {idx + 1}. {prod.name}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${prod.total_revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                    <span>{prod.category}</span>
                    <span>{prod.units_sold} units</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Globe2 className="w-4 h-4 text-blue-600" />
              <span>Regional Sales & Market Share</span>
            </h2>
            <span className="text-xs text-slate-400">Global Coverage</span>
          </div>

          <div className="mt-4 space-y-3">
            {regional?.regions &&
              Object.entries(regional.regions).map(([regionName, regData]: [string, any]) => (
                <div key={regionName} className="text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-800">
                    <span>{regionName}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      ${regData.net_revenue.toLocaleString()} ({regData.share_percent}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                    <span>{regData.order_count} orders recorded</span>
                    <span>Gross: ${regData.gross_revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${regData.share_percent}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Customer Tiers Breakdown */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Customer Tier Cohorts</span>
          </h2>
          <span className="text-xs text-slate-400">{customers?.total_customers || 0} Total Accounts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {customers?.tiers &&
            Object.entries(customers.tiers).map(([tierName, tierData]: [string, any]) => (
              <div key={tierName} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs capitalize">{tierName} Tier</span>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    {tierData.order_count} orders
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-slate-500">Total Spend</p>
                  <p className="text-lg font-bold text-slate-900">${tierData.total_spend.toLocaleString()}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500">
                  <span>Avg Order Value</span>
                  <span className="font-medium text-slate-800">${tierData.avg_order_value.toLocaleString()}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

