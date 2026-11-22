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
- **Python:** 3.14.7 (FastAPI, SQLAlchemy, Pandas, LangGraph, Google-GenAI, Pytest installed)
- **Node.js:** v24.14.0 | **npm:** 11.9.0
- **Git:** 2.52.0 (Initialized in workspace)
- **Docker:** Not detected on host PATH; application designed with dual-engine persistence (PostgreSQL + pgvector for containerized production, SQLite WAL for zero-config local development and testing) and full Docker Compose configuration.

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
|        ├──► (Safe SQL Tool: Read-Only, AST Sanitized, Row Limit)                  |
|        ├──► (RAG Tool: Document Chunk Retrieval & Citation)                       |
|        ├──► (Pandas BI Tool: MoM, Aggregations, Anomaly Detection)                |
|        └──► (HITL Action Tool: Pending Approval Queue)                           |
|        │                                                                          |
|        ▼                                                                          |
|   [3. Tool Result Validator & Loop Prevention] ──(Retry limit reached?)──────────┐|
|        │                                                                          │|
|        ▼                                                                          ▼|
|   [4. Response Synthesizer & Source Attributor]                    [Fallback / Err]|
+-----------------------------------------+-----------------------------------------+
                                          |
                   +----------------------+----------------------+
                   |                                             |
                   v                                             v
+-------------------------------------+       +-------------------------------------+
|        Data Layer & Persistence     |       |          AI & LLM Provider          |
| - Relational DB: SQLite / PostgreSQL|       | - Google Gemini 2.5 / 1.5 Flash     |
| - Vector Store: FAISS / pgvector    |       | - Structured Outputs & Function Call|
| - Audit Logs, Orders, Approvals     |       | - Transparent Safe Mock Mode Fallback|
+-------------------------------------+       +-------------------------------------+
```

---

## 4. Phase-by-Phase Implementation Roadmap

### Phase 1: Project Setup, FastAPI Backend, Database & Health Checks (Current)
- Initialize Git repository and directory structure (`/backend`, `/frontend`).
- Backend core: `config.py`, database setup with SQLAlchemy (supporting SQLite WAL for local run and PostgreSQL for production), base models, migration/init scripts.
- Health check endpoints (`/api/health`, `/api/health/db`).
- Backend synthetic data seeder for baseline tables.
- Frontend setup: Next.js app with Tailwind CSS, TypeScript, layout navigation, and API service client.
- Automated tests for Phase 1 backend health and database initialization.

### Phase 2: Gemini Integration, Chat Interface & LangGraph Orchestrator
- Gemini API client setup with environment-based configuration and safe mock fallback mode when key is absent.
- LangGraph stateful graph:
  - State definition (`messages`, `intent`, `plan`, `tool_calls`, `tool_results`, `iteration_count`, `approved_actions`).
  - Request classifier node.
  - Plan and tool dispatch node.
  - Tool execution node.
  - Response synthesis node.
  - Guardrails: Max 5 iterations, execution timeout, loop detection.
- Frontend Chat interface with live tool status badges, execution timings, and structured markdown outputs.

### Phase 3: Business Database, Safe SQL Engine & Pandas Analytics
- Schema & synthetic data generation:
  - `customers` (500+ records)
  - `products` (5 categories, 50+ items)
  - `orders` (1,000+ orders across 12 months)
  - `order_items` (line items with quantities, discounts, unit prices)
  - `sales_records` (daily materialized summaries)
- Safe SQL execution tool:
  - Enforce single statement SELECT only via SQLGlot AST validation.
  - Block DDL/DML (INSERT, UPDATE, DELETE, DROP, ALTER, EXEC, etc.).
  - Maximum row limit (default 100).
  - Enforce execution timeouts.
- Pandas Analytics Tool:
  - Revenue summaries, MoM growth rates, customer retention, top-5 products, anomaly detection in sales spikes.
- Frontend Business Analytics Dashboard with charts, KPI cards, and dynamic SQL query viewer.

### Phase 4: Document Upload, Vector Embeddings & RAG Knowledge Base
- Document parsing for PDF (`pypdf`) and TXT/Markdown.
- Text chunking with overlap (500 tokens, 50 token overlap).
- Embeddings pipeline: Gemini text-embedding / local sentence-transformer fallback.
- Vector search with similarity threshold and top-k retrieval.
- Strict prompt grounding: Agent cites document name and excerpt, refusing to hallucinate missing facts.
- Frontend Knowledge Base UI with document upload, chunk preview, and semantic search inspector.

### Phase 5: Downloadable Reports & Human-in-the-Loop Approval Workflow
- Business Report Generator:
  - PDF generation (`reportlab`) and CSV export.
  - Automated report formatting: Executive summary, data period, key metrics table, sources & limitations.
- Human Approval System:
  - Actions requiring approval (ticket creation, customer refunds, data modifications).
  - Two-phase execution: Agent stages action as `PENDING_APPROVAL` with structured payload -> Admin approves/rejects via UI -> Agent executes confirmed action.
- Frontend Reports page and Approval Requests management dashboard.

### Phase 6: Enterprise Security, Authentication, RBAC & Audit Logging
- User models and roles (`ADMIN`, `OPERATIONS_ANALYST`, `AUDITOR`).
- Password hashing with bcrypt, JWT token generation and refresh.
- FastAPI dependency-based RBAC on sensitive endpoints.
- Comprehensive Audit Log model: User, IP, timestamp, action type, tool name, execution status, security flags.
- Prompt injection and jailbreak filter on agent input.
- Frontend Login page, protected routes, and Audit Log viewer.

### Phase 7: Verification, Testing, Docker & Deployment Readiness
- Backend integration and unit test suite with `pytest` covering all routes, LangGraph states, SQL safety, and RAG.
- Frontend component tests.
- Multi-container `docker-compose.yml` (PostgreSQL with pgvector, FastAPI backend, Next.js frontend).
- Complete documentation: `README.md`, `ARCHITECTURE.md`, `.env.example`, API reference, and video demo guide.
