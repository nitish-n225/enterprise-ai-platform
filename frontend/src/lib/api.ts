import {
  HealthStatus,
  DatabaseHealth,
  ChatResponse,
  ChatMessageItem,
  ChatSessionSummary,
  DocumentItem,
  DocumentDetail,
  DocumentSearchResult,
  ReportItem,
  ApprovalItem,
  AuditLogItem,
  AuditStats,
  User,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

class ApiService {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to check health: ${res.statusText}`);
    }
    return res.json();
  }

  async getDatabaseHealth(): Promise<DatabaseHealth> {
    const res = await fetch(`${API_BASE_URL}/api/health/db`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to check database health: ${res.statusText}`);
    }
    return res.json();
  }

  async sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        session_id: sessionId || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to execute chat orchestration");
    }
    return res.json();
  }

  async getChatHistory(sessionId?: string): Promise<ChatMessageItem[]> {
    const url = sessionId
      ? `${API_BASE_URL}/api/chat/history?session_id=${encodeURIComponent(sessionId)}`
      : `${API_BASE_URL}/api/chat/history`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to retrieve chat history: ${res.statusText}`);
    }
    return res.json();
  }

  async getChatSessions(): Promise<ChatSessionSummary[]> {
    const res = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to retrieve chat sessions: ${res.statusText}`);
    }
    return res.json();
  }

  async deleteChatSession(sessionId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to delete session: ${res.statusText}`);
    }
    return res.json();
  }

  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch documents: ${res.statusText}`);
    }
    return res.json();
  }

  async getDocument(id: number): Promise<DocumentDetail> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch document #${id}: ${res.statusText}`);
    }
    return res.json();
  }

  async uploadDocument(file: File, description?: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }

    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to upload document");
    }
    return res.json();
  }

  async deleteDocument(id: number): Promise<{ message: string; id: number }> {
    const res = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to delete document");
    }
    return res.json();
  }

  async searchDocuments(query: string, topK: number = 5, documentId?: number): Promise<DocumentSearchResult[]> {
    const res = await fetch(`${API_BASE_URL}/api/documents/search`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        top_k: topK,
        document_id: documentId || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Vector search failed");
    }
    return res.json();
  }

  async getAnalyticsSummary(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/summary`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load analytics summary");
    return res.json();
  }

  async getAnalyticsGrowth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/growth`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load growth metrics");
    return res.json();
  }

  async getAnalyticsTopProducts(limit: number = 5): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/top-products?limit=${limit}`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load top products");
    return res.json();
  }

  async getAnalyticsRegional(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/regional`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load regional data");
    return res.json();
  }

  async getAnalyticsCustomers(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/customers`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load customer cohort data");
    return res.json();
  }

  // Reports
  async getReports(): Promise<ReportItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/reports`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load reports");
    return res.json();
  }

  async generateReport(payload: { report_type: string; file_format: string; title?: string }): Promise<ReportItem> {
    const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to generate report");
    }
    return res.json();
  }

  async deleteReport(id: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete report");
    return res.json();
  }

  getReportDownloadUrl(id: number): string {
    return `${API_BASE_URL}/api/reports/download/${id}`;
  }

  // Human Approvals (HITL)
  async getApprovals(statusFilter?: string): Promise<ApprovalItem[]> {
    const url = statusFilter
      ? `${API_BASE_URL}/api/approvals?status_filter=${encodeURIComponent(statusFilter)}`
      : `${API_BASE_URL}/api/approvals`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load approvals");
    return res.json();
  }

  async reviewApproval(id: number, decision: "APPROVED" | "REJECTED", notes?: string, reviewer: string = "user_admin"): Promise<ApprovalItem> {
    const res = await fetch(`${API_BASE_URL}/api/approvals/${id}/review`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        decision,
        notes,
        reviewer,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to submit review");
    }
    return res.json();
  }

  // Auth & RBAC
  async login(username: string, password: string): Promise<{ access_token: string; token_type: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Authentication failed");
    }
    const data = await res.json();
    if (typeof window !== "undefined") {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
    return data;
  }

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch user profile");
    return res.json();
  }

  // Security & Audit Logs
  async getAuditLogs(action?: string, userId?: string, limit: number = 50): Promise<AuditLogItem[]> {
    const params = new URLSearchParams();
    if (action) params.append("action", action);
    if (userId) params.append("user_id", userId);
    params.append("limit", limit.toString());

    const res = await fetch(`${API_BASE_URL}/api/audit?${params.toString()}`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  }

  async getAuditStats(): Promise<AuditStats> {
    const res = await fetch(`${API_BASE_URL}/api/audit/stats`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch audit stats");
    return res.json();
  }
}

export const api = new ApiService();
