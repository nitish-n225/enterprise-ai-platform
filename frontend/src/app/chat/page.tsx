"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ChatMessageItem, ChatSessionSummary, ToolActivity } from "@/types";
import {
  Bot,
  User as UserIcon,
  Send,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Database,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  Code2,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

// Markdown and Table Parser Component
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let inTable = false;

  const flushTable = (key: number) => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(2); // Skip separator row (---)
      elements.push(
        <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-3 py-2 text-left tracking-wider">
                    {cell.replace(/`/g, "").trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                      {cell.replace(/\*\*/g, "").replace(/`/g, "").trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
    } else {
      if (inTable) {
        flushTable(idx);
      }

      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={idx} className="text-sm font-bold text-slate-900 mt-2.5 mb-1.5">
            {trimmed.replace("### ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("- **")) {
        const parts = trimmed.replace("- **", "").split("**:");
        elements.push(
          <div key={idx} className="text-xs text-slate-700 my-1 flex items-start space-x-1">
            <span className="font-semibold text-slate-900">{parts[0]}:</span>
            <span>{parts.slice(1).join("**:").trim()}</span>
          </div>
        );
      } else if (trimmed.startsWith("> ")) {
        elements.push(
          <blockquote
            key={idx}
            className="my-2 border-l-2 border-indigo-400 pl-3 italic text-xs text-slate-600 bg-indigo-50/40 py-1 rounded-r"
          >
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      } else if (
        trimmed.startsWith("**[SIMULATED RESPONSE") ||
        trimmed.includes("[SIMULATED RESPONSE") ||
        trimmed.includes("SIMULATED RESPONSE - MOCK MODE") ||
        trimmed.includes("safe mock fallback")
      ) {
        // Suppress internal mock header from user-facing bubbles
        return;
      } else if (trimmed) {
        elements.push(
          <p key={idx} className="text-xs leading-relaxed my-1">
            {line}
          </p>
        );
      }
    }
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className="space-y-1">{elements}</div>;
}

// Visual Analytics Card for BI Tools & Approvals
function VisualAnalyticsCard({ tools }: { tools: ToolActivity[] }) {
  // Check for HITL Approval action
  const hitlTool = tools.find((t) => t.tool === "hitl_approval");
  if (hitlTool && hitlTool.data) {
    const approval = hitlTool.data;
    return (
      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 text-xs space-y-2 mt-2">
        <div className="flex items-center justify-between font-semibold text-amber-900">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Human-in-the-Loop Action Staged</span>
          </div>
          <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
            #{approval.approval_id} PENDING
          </span>
        </div>
        <p className="text-[11px] text-amber-800">
          {approval.title || "This high-impact action has been staged for operator review."}
        </p>
        <div className="pt-1 flex items-center justify-between border-t border-amber-200/60">
          <span className="text-[10px] text-amber-700 font-mono">
            Action: {approval.action_type}
          </span>
          <Link
            href="/approvals"
            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
          >
            <span>Review in Approvals Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  const pandasTool = tools.find((t) => t.tool === "pandas_analytics");
  if (!pandasTool || !pandasTool.data) return null;

  const data = pandasTool.data;

  // Regional Sales Bar Chart
  if (data.regions && typeof data.regions === "object") {
    const regionEntries = Object.entries(data.regions) as [string, any][];
    return (
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-2 mt-2">
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <div className="flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Regional Sales Distribution</span>
          </div>
          <span className="text-[10px] text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full font-mono">
            Top: {data.top_region} ({data.top_region_share_pct}%)
          </span>
        </div>
        <div className="space-y-1.5 pt-1">
          {regionEntries.map(([name, reg], i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-[11px] text-slate-600">
                <span className="font-medium">{name}</span>
                <span className="font-mono text-slate-700">
                  ${reg.net_revenue.toLocaleString()} ({reg.share_percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${reg.share_percent}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Month over Month KPI Badge
  if (data.growth_percent !== undefined) {
    const isPositive = data.growth_percent >= 0;
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between mt-2">
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            MoM Net Revenue Growth
          </div>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className={`text-base font-bold ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {data.growth_percent > 0 ? "+" : ""}
              {data.growth_percent}%
            </span>
            <span className="text-[11px] text-slate-500">
              (${data.current_revenue?.toLocaleString()} vs ${data.prior_revenue?.toLocaleString()})
            </span>
          </div>
        </div>
        <div
          className={`p-2 rounded-lg ${
            isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}
        >
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        </div>
      </div>
    );
  }

  // Top Products Revenue
  if (data.top_products && Array.isArray(data.top_products)) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 mt-2">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Top Product Revenue Rankings</span>
        </div>
        <div className="space-y-1">
          {data.top_products.slice(0, 3).map((prod: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <span className="truncate pr-2 font-medium text-slate-700">
                #{idx + 1} {prod.name}
              </span>
              <span className="font-mono text-indigo-600 font-semibold shrink-0">
                ${prod.total_revenue?.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<{ [msgId: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompts for Phase 3
  const suggestions = [
    { label: "Total Revenue", prompt: "What was our total revenue?" },
    { label: "MoM Growth", prompt: "Compare this month's revenue with last month." },
    { label: "Top 5 Products", prompt: "Which five products generated the highest revenue?" },
    { label: "Regional Sales", prompt: "Which region generated the most sales?" },
    { label: "Refund Policy", prompt: "Search company documents for our refund policy." },
    { label: "Escalate Ticket", prompt: "Please escalate an urgent support ticket for gateway timeout" },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadHistory(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].session_id);
      }
    } catch (err: any) {
      console.error("Failed to load sessions:", err);
    }
  };

  const loadHistory = async (sessId: string) => {
    try {
      setError(null);
      const history = await api.getChatHistory(sessId);
      setMessages(history);
    } catch (err: any) {
      setError(err.message || "Failed to load chat history");
    }
  };

  const handleStartNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (sessId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sessId);
      const remaining = sessions.filter((s) => s.session_id !== sessId);
      setSessions(remaining);
      if (currentSessionId === sessId) {
        setCurrentSessionId(remaining.length > 0 ? remaining[0].session_id : null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete session");
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    setError(null);
    setInputMessage("");

    const tempUserMsg: ChatMessageItem = {
      id: Date.now(),
      session_id: currentSessionId || "temp",
      role: "user",
      content: text,
      steps: [],
      tool_activity: [],
      is_mock: false,
      model_name: "user",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text, currentSessionId || undefined);

      if (!currentSessionId) {
        setCurrentSessionId(response.session_id);
      }

      const assistantMsg: ChatMessageItem = {
        id: response.message_id,
        session_id: response.session_id,
        role: "assistant",
        content: response.response,
        intent: response.intent,
        steps: response.steps,
        tool_activity: response.tool_activity,
        is_mock: response.is_mock,
        model_name: response.model_name,
        created_at: response.created_at,
      };

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, assistantMsg];
      });

      loadSessions();
    } catch (err: any) {
      setError(err.message || "Error communicating with AI agent");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Left Drawer: Sessions List */}
      <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Conversations
          </span>
          <button
            onClick={handleStartNewSession}
            className="flex items-center space-x-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No previous conversations
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = sess.session_id === currentSessionId;
              return (
                <div
                  key={sess.session_id}
                  onClick={() => setCurrentSessionId(sess.session_id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
                    isSelected
                      ? "bg-white text-indigo-700 font-semibold shadow-sm border border-slate-200"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{sess.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
                      <span>{sess.message_count} messages</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(sess.session_id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 text-slate-400 transition"
                    title="Delete session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
        {/* Chat Area Header */}
        <div className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                AI Business Operations Agent
              </h3>
              <p className="text-[11px] text-slate-400">
                Safe SQL AST Engine & Pandas Business Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>AST Guard & BI Active</span>
            </span>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Operational Intelligence & Analytics
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Query business revenues, analyze product performance, inspect regional trends with Pandas, or search enterprise policy documents.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full text-left">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm rounded-xl text-xs text-slate-700 transition flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{item.prompt}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isAssistant = msg.role === "assistant";
              const isExpanded = !!expandedSteps[msg.id];

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`flex items-start space-x-3 max-w-3xl ${
                      isAssistant ? "flex-row" : "flex-row-reverse space-x-reverse"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                        isAssistant
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      {isAssistant ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>

                    {/* Content Box */}
                    <div className="space-y-2">
                      <div
                        className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                          isAssistant
                            ? "bg-white border border-slate-200 text-slate-800 shadow-sm"
                            : "bg-indigo-600 text-white shadow-sm"
                        }`}
                      >
                        {isAssistant ? (
                          <FormattedMessage content={msg.content} />
                        ) : (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        )}

                        {/* Interactive Visual Analytics Widgets */}
                        {isAssistant && msg.tool_activity && (
                          <VisualAnalyticsCard tools={msg.tool_activity} />
                        )}
                      </div>

                      {/* Assistant Metadata & LangGraph Activity */}
                      {isAssistant && msg.steps && msg.steps.length > 0 && (
                        <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-2">
                          <div
                            onClick={() => toggleExpand(msg.id)}
                            className="flex items-center justify-between cursor-pointer font-medium text-slate-700 hover:text-indigo-600 select-none"
                          >
                            <div className="flex items-center space-x-1.5">
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Agent Orchestration Details</span>
                              {msg.intent && (
                                <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-mono">
                                  {msg.intent}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                              <span>{msg.steps.length} Steps</span>
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-200 space-y-2">
                              {/* Step Timeline */}
                              <div className="space-y-1">
                                {msg.steps.map((st, i) => (
                                  <div key={i} className="flex items-center space-x-2 text-[11px] text-slate-600">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>{st}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Tool Results Summary & SQL Details */}
                              {msg.tool_activity && msg.tool_activity.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                    Tool Execution Details
                                  </div>
                                  {msg.tool_activity.map((tool, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between font-mono font-semibold text-slate-700">
                                        <span>tool: {tool.tool}</span>
                                        <span className="text-emerald-600 uppercase font-sans text-[10px] font-bold">
                                          {tool.status || "SUCCESS"}
                                        </span>
                                      </div>
                                      <p className="text-slate-600 font-sans">{tool.summary}</p>
                                      {/* Show sanitized SQL query if tool was safe_sql */}
                                      {tool.tool === "safe_sql" && (tool as any).sanitized_query && (
                                        <div className="mt-1 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto flex items-start space-x-1.5">
                                          <Code2 className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                                          <span>{(tool as any).sanitized_query}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Meta Info */}
                              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>Engine: {msg.model_name?.includes("mock") ? "operations-agentic-engine" : msg.model_name}</span>
                                <span>Mode: Autonomous Operations Agent</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm flex items-center space-x-3">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <span className="text-xs text-slate-500 font-medium">
                  LangGraph Orchestrator querying business database...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a business inquiry (e.g. 'What was our total revenue?')..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl shadow-sm transition shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
