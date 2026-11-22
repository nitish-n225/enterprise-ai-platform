export interface HealthStatus {
  status: string;
  app_name: string;
  version: string;
  environment: string;
  timestamp: string;
  uptime_seconds: number;
  services: {
    database: string;
    ai_engine: string;
  };
}

export interface DatabaseHealth {
  status: string;
  database_type: string;
  connected: boolean;
  details: {
    table_count: number;
    tables: string[];
    url_masked: string;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  full_name?: string;
  is_active: boolean;
}

export interface ApprovalRequestItem {
  id: number;
  action_type: string;
  title: string;
  description: string;
  payload_json: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_by: string;
  reviewed_by?: string;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ToolActivity {
  tool: string;
  status: string;
  summary: string;
  data?: any;
  error?: string | null;
}

export interface ChatResponse {
  session_id: string;
  message_id: number;
  response: string;
  intent: string;
  steps: string[];
  tool_activity: ToolActivity[];
  is_mock: boolean;
  model_name: string;
  latency_ms: number;
  created_at: string;
}

export interface ChatMessageItem {
  id: number;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  intent?: string;
  steps: string[];
  tool_activity: ToolActivity[];
  is_mock: boolean;
  model_name: string;
  created_at: string;
}

export interface ChatSessionSummary {
  session_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}
