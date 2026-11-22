# Project Plan: Enterprise AI Business Operations Agent

## 1. Executive Summary & Objective
**Enterprise AI Business Operations Agent** is a production-grade, portfolio-quality Agentic AI application designed for enterprise business operations. It combines:
- A stateful **LangGraph** orchestration workflow with structured planning, tool selection, error recovery, and loop prevention.
- **FastAPI** backend with enterprise security: JWT authentication, RBAC, input validation, audit logging, and prompt injection defense.
- Safe read-only **Text-to-SQL** engine with AST parsing, parameterized query constraints, and strict execution guardrails over synthetic enterprise business data (Customers, Products, Orders, Order Items, Sales).
- **RAG Knowledge Base** with document ingestion (PDF, TXT), chunking, vector embeddings, similarity search, and source attribution.
- **Pandas Business Analytics Engine** for automated financial summaries, MoM trend calculations, top-performer rankings, and anomaly detection.
- **Downloadable Business Reporting** (CSV and PDF generation) with executive summaries and metrics.
- **Human-in-the-Loop (HITL) Approval Workflow** for high-impact actions (e.g., ticket creation, sensitive data exports).
- Modern **Next.js 14 / React / TypeScript / Tailwind CSS** dashboard with responsive SaaS layouts, tool execution timelines, and activity feeds.

---

## 2. Environment & Tool Assessment
- **Operating System:** Windows 11 AMD64
- **Python:** 3.14.7 (FastAPI, SQLAlchemy, Pandas, LangGraph, Google-GenAI, SQLGlot, Pytest installed)
- **Node.js:** v24.14.0 | **npm:** 11.9.0
- **Git:** 2.52.0 (Initialized in workspace)
- **Database:** SQLite WAL (development) and PostgreSQL with pgvector (production)

---

## 3. Architecture Blueprint

```
+-----------------------------------------------------------------------------------+
|                           Frontend (Next.js 14 SaaS UI)                           |
|  - Dashboard  - AI Operations Chat  - Agent Live Activity  - SQL & BI Analytics  |
|  - RAG Docs   - PDF/CSV Reports     - HITL Approvals       - Audit Logs & Settings|
+-----------------------------------------+-----------------------------------------+
                                          | REST / JSON (JWT Auth)
                                          v
+-----------------------------------------------------------------------------------+
|                        Backend (FastAPI Enterprise API)                           |
|  - Auth & RBAC (Admin, Analyst, Viewer)   - Rate Limiter & Security Headers       |
|  - Audit Logging Service                  - Document Ingestion & Chunking         |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       LangGraph Workflow Orchestrator                             |
|                                                                                   |
|   [User Input]                                                                    |
|        │                                                                          |
|        ▼                                                                          |
|   [1. Request Classifier & Intent Analyzer]                                       |
|        │                                                                          |
|        ▼                                                                          |
|   [2. Task Planner & Tool Selector]                                               |
|        │                                                                          |
|        ├──► (Safe SQL Engine: SQLGlot AST, Whitelisted Tables, Clamped LIMIT 100) |
|        ├──► (Pandas BI Engine: MoM Trend, Revenue Aggs, Top Products, Regional)   |
|        ├──► (RAG Tool: Document Chunk Retrieval & Citation)                       |
|        └──► (HITL Action Tool: Pending Approval Queue)                           |
|        │                                                                          |
|        ▼                                                                          |
|   [3. Tool Result Validator & Loop Prevention] ──(Retry limit reached?)──────────┐|
|        │                                                                          │|
|        ▼                                                                          ▼|
|   [4. Response Synthesizer & Source Attributor]                    [Fallback / Err]|
+-----------------------------------------+-----------------------------------------+
```

---

## 4. Phase-by-Phase Implementation Status

### [x] Phase 1: Project Setup, FastAPI Backend, Database & Health Checks (Completed)
- [x] Initialized Git repository and directory layout (`/backend`, `/frontend`).
- [x] Backend core: `config.py` (Pydantic Settings), `database.py` with SQLite WAL + foreign keys.
- [x] Base models: Users, Customers, Products, Orders, Order Items, Sales Records, Documents, Chunks, Approvals, Audit Logs.
- [x] Enterprise synthetic seeder: 3 users, 15 products, 15 customers, 120 orders, 48 monthly sales aggregates, 2 indexed policies.
- [x] Health check endpoints (`/api/health`, `/api/health/db`).
- [x] Next.js 14 frontend setup with TypeScript, Tailwind CSS, layout, header, sidebar, and health status card.
- [x] Backend tests for health check and database models (9 passed).

### [x] Phase 2: Gemini Integration, Chat Interface & LangGraph Agent (Completed)
- [x] Official `google-genai` SDK integration with environment configuration (`GEMINI_API_KEY`, `GEMINI_MODEL`, `MOCK_AI`).
- [x] Explicit Safe Mock Mode: transparently flags simulated execution (`is_mock=True`, `mock-operations-agent`) when API key is missing.
- [x] Cyclical LangGraph orchestrator: Request Classification -> Task Planning -> Tool Dispatch -> Result Validation -> Response Synthesis.
- [x] Guardrails: Max 5 iterations limit, loop prevention, error recovery.
- [x] Persistent chat models: `ChatSession` and `ChatMessage` with session cascading and step logs.
- [x] API endpoints: `POST /api/chat`, `GET /api/chat/history`, `GET /api/chat/sessions`, `DELETE /api/chat/sessions/{id}`.
- [x] Modern responsive Chat UI with active LangGraph execution timeline, tool breakdown drawer, suggestion pills, and session switching.
- [x] Comprehensive test suite: 21 passing tests covering Gemini configuration, mock mode, intent classification, agent workflow, iteration limits, chat endpoints, and session persistence.

### [x] Phase 3: Business Database, Safe SQL Engine & Pandas Analytics (Completed)
- [x] Reliable Business Data Service layer (`backend/app/services/business_data.py`) querying Customers, Products, Orders, OrderItems, SalesRecords.
- [x] AST-verified Safe Text-to-SQL Engine (`backend/app/agent/safe_sql.py`) using SQLGlot:
  - Whitelist schema tables: `customers`, `products`, `orders`, `order_items`, `sales_records`.
  - Rejection of all DDL/DML mutation statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `EXEC`).
  - Rejection of multiple statements.
  - Rejection of sensitive/system tables (`users`, `audit_logs`, `sqlite_master`, etc.).
  - Automatic `LIMIT 100` clamping and 5.0-second execution timeouts.
- [x] Deterministic Pandas Analytics Engine (`backend/app/services/analytics.py`):
  - Total enterprise gross & net revenue calculation.
  - Month-over-Month (MoM) growth % with division-by-zero & single-period safety.
  - Top 5 products by revenue and volume sold.
  - Regional sales distribution and market share %.
  - Customer cohort spending by tier (Enterprise, Mid-Market, SMB).
- [x] Frontend Chat UI enhancements:
  - Custom markdown table parser with zebra striping.
  - Interactive visual analytics cards (Regional sales distribution bars, MoM growth badge, Top products ranking).
  - Sanitized SQL query viewer showing the exact AST-verified query executed.
- [x] Comprehensive test suite: 39 tests passing across Phase 1, Phase 2, and Phase 3.

### [ ] Phase 4: Document Upload, Vector Embeddings & RAG Knowledge Base (Upcoming)
- File upload UI (PDF, TXT, Markdown).
- Ingestion pipeline with chunking and vector embeddings.
- Semantic search viewer and document chunk citations.

### [ ] Phase 5: Downloadable Reports & Human Approval Workflow
- Report generation (ReportLab PDF & CSV download).
- Interactive Human-in-the-Loop approval dashboard (Approve/Reject staged actions).

### [ ] Phase 6: Enterprise Security, Authentication, RBAC & Audit Logging
- User login UI with JWT authentication.
- RBAC permissions on endpoints (Admin, Analyst, Viewer).
- Security audit log inspection dashboard.

### [ ] Phase 7: Verification, Testing, Docker & Deployment Readiness
- Multi-container `docker-compose.yml`.
- End-to-end integration testing and final documentation.
