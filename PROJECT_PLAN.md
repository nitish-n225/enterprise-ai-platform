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

### [x] Phase 4: Document Upload, Vector Embeddings & RAG Knowledge Base (Completed)
- [x] Secure Multi-Format Document Ingestion System (`backend/app/services/document_processor.py`):
  - Supported formats: PDF (`pypdf`), DOCX (`python-docx`), and TXT.
  - Magic byte header inspection (`%PDF-`, `PK\x03\x04`) preventing disguised executable uploads.
  - Path traversal defense (`os.path.basename` and sanitized internal storage paths).
  - Configurable 15 MB file size limit enforcement.
  - SHA-256 content hashing for exact duplicate upload detection (returns HTTP 409 Conflict).
  - Scanned PDF OCR warning detection for image-only pages.
  - Normalized whitespace, encoding sanitization, and sliding-window chunking with configurable overlap.
  - Page-level source attribution (`page_number`, `chunk_index`).
- [x] Dual-Backend Embedding & Vector Search Architecture (`backend/app/services/embeddings.py`, `backend/app/services/vector_store.py`):
  - Official `google-genai` integration using Google embedding model `text-embedding-004` (768 dimensions).
  - Deterministic 768-dim mock embedding provider powered by SimHash signed random projections and stop-word filtering for zero-network testing.
  - Vector similarity search engine with support for PostgreSQL + pgvector and SQLite NumPy-accelerated cosine similarity.
  - Configurable similarity thresholding (`SIMILARITY_THRESHOLD = 0.20`) and top-K chunk retrieval.
  - Grounded RAG agent tool (`EnterpriseTools.search_knowledge_base`) enforcing clean refusals and insufficient evidence detection on non-matching queries.
- [x] Knowledge Base & Document Management API:
  - `POST /api/documents/upload` - Secure multipart upload and synchronous vector indexing.
  - `GET /api/documents` - List all registered enterprise documents with chunk counts, file sizes, and status.
  - `GET /api/documents/{id}` - Inspect individual document metadata and chunk excerpts.
  - `GET /api/documents/{id}/status` - Document indexing status polling.
  - `POST /api/documents/search` - Semantic vector search endpoint with similarity scores.
  - `DELETE /api/documents/{id}` - Permanent document and vector chunk deletion.
  - `GET /api/analytics/*` - Dedicated Business Intelligence endpoints (`summary`, `growth`, `top-products`, `regional`, `customers`).
- [x] Modern Next.js Frontend Knowledge Base & Business Analytics:
  - Document Upload zone with drag-and-drop, 15MB client-side validation, and guardrail notifications.
  - Document Repository table with status pills (`indexed`, `processing`, `failed`), file sizes, chunk counts, and SHA-256 hashes.
  - Document Chunk Inspector modal for inspecting page numbers, token counts, and full chunk texts.
  - Interactive Semantic Search Inspector (Playground) for testing natural language queries against vector embeddings with similarity score progress bars.
  - Full Business Analytics dashboard (`/analytics`) with KPI cards, MoM growth banner, top products ranking, and regional sales distribution.
- [x] Comprehensive test suite: 51 passing tests covering PDF/DOCX/TXT text extraction, magic byte validation, duplicate detection, path traversal safety, scanned OCR warnings, vector search similarity, RAG tool citations, and end-to-end RAG workflows.

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
