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

