"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Search,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<{ [msgId: number]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompts
  const suggestions = [
    { label: "Total Sales", prompt: "What were our total sales this month?" },
    { label: "MoM Growth", prompt: "Compare this month's sales with last month." },
    { label: "Top Products", prompt: "Find the top five products by revenue." },
    { label: "Refund Policy", prompt: "Search company documents for our refund policy." },
    { label: "Escalate Ticket", prompt: "Please escalate an urgent support ticket for gateway timeout" },
  ];

  // Fetch sessions on load
  useEffect(() => {
    loadSessions();
  }, []);

  // When session changes, load messages
  useEffect(() => {
    if (currentSessionId) {
      loadHistory(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Scroll to bottom when messages update
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

    // Optimistically add user message
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

      // Add assistant message
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
        // Replace or append
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, assistantMsg];
      });

      // Reload sessions list to update titles/timestamps
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
                LangGraph State Machine with Multi-Tool Deterministic Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Mock Engine Active</span>
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
                How can I assist your operations?
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Ask about company revenues, query orders, search refund and SLA policies, or stage high-impact actions for human approval.
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
                        <div className="whitespace-pre-wrap">{msg.content}</div>
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

                              {/* Tool Results Summary */}
                              {msg.tool_activity && msg.tool_activity.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                    Tool Execution Details
                                  </div>
                                  {msg.tool_activity.map((tool, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white p-2 rounded-lg border border-slate-200 text-[11px] space-y-1"
                                    >
                                      <div className="flex items-center justify-between font-mono font-semibold text-slate-700">
                                        <span>tool: {tool.tool}</span>
                                        <span className="text-emerald-600 uppercase font-sans text-[10px]">
                                          {tool.status}
                                        </span>
                                      </div>
                                      <p className="text-slate-500 font-sans">{tool.summary}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Meta Info */}
                              <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>Engine: {msg.model_name}</span>
                                <span>{msg.is_mock ? "Mode: Safe Mock" : "Mode: Gemini"}</span>
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
                  LangGraph Orchestrator executing workflow...
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
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
              placeholder="Ask a business inquiry (e.g. 'What were our total sales this month?')..."
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

