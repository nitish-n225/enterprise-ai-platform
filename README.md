# Enterprise AI Business Operations Agent

A production-grade, portfolio-ready Agentic AI business operations platform built with **FastAPI**, **LangGraph**, **Google Gemini**, **SQLGlot**, **Pandas**, **SQLAlchemy**, and **Next.js 14**.

---

## Architecture Overview

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

## Core Capabilities & Engineering Guardrails

### 1. AST-Verified Safe Text-to-SQL Engine (`SafeSQLEngine`)
- **AST Parsing:** Queries are tokenized and parsed using **SQLGlot 30.26**.
- **Whitelist Table Enforcement:** Strictly permits queries only on operational tables: `customers`, `products`, `orders`, `order_items`, `sales_records`.
- **Sensitive Table Shielding:** Queries targeting `users`, `audit_logs`, `chat_sessions`, `chat_messages`, or system catalogs (`sqlite_master`, `information_schema`) are rejected immediately.
- **Statement Guardrails:** Rejects mutating operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `TRUNCATE`, `EXEC`) and blocks multiple semicolon-separated statements.
- **Row Clamping & Timeouts:** Automatically clamps queries to `LIMIT 100` and enforces a 5.0s query timeout.

### 2. Deterministic Pandas Business Intelligence Engine
- **Revenue Summaries:** Gross revenue, net revenue, total orders, and Average Order Value (AOV).
- **Month-over-Month (MoM) Growth:** Compares the most recent month to the prior month with delta values, percentage growth, and division-by-zero guards.
- **Top Product Rankings:** Aggregates order item volume and revenue by SKU and category.
- **Regional Distribution:** Computes market share percentages across North America, Europe, Asia-Pacific, and LATAM.
- **Customer Cohorts:** Analyzes customer spend and order volume across Enterprise, Mid-Market, and SMB tiers.

### 3. LangGraph Cyclical Orchestration
- State machine pipeline: Request Classification -> Task Planning -> Tool Dispatch -> Result Validation -> Response Synthesis.
- Hard safety ceiling of **5 iterations maximum** with automatic loop detection.

### 4. Vector RAG & Document Knowledge Base
- **Multi-Format Ingestion:** Ingests PDF (`pypdf`), DOCX (`python-docx`), and TXT files up to 15MB.
- **Security Guardrails:** Validates file magic headers (`%PDF-`, `PK\x03\x04`), sanitizes path traversal, checks SHA-256 for duplicate rejection (HTTP 409), and flags scanned PDFs requiring OCR.
- **768-Dim Embeddings:** Official Google GenAI SDK embedding model `text-embedding-004` with a deterministic SimHash signed random projection mock fallback for zero-network testing.
- **Vector Storage:** Dual architecture supporting PostgreSQL with native `pgvector` for production and NumPy-accelerated cosine similarity for local SQLite.
- **Grounded Citations:** RAG retrieval tool (`knowledge_search`) returns page numbers, chunk excerpts, and enforces clean refusal on irrelevant questions without hallucination.

### 5. Downloadable Reports & Human-in-the-Loop Approvals
- **ReportLab PDF Generator:** Two-pass `NumberedCanvas` producing publication-grade executive summaries, sales ledgers, and regional market distribution PDFs with dynamic pagination ("Page X of Y"), enterprise tables, and KPI metric ribbons.
- **CSV Data Exports:** RFC 4180-compliant comma-separated values generator for raw transactional orders, regional performance, and product catalogues.
- **Human-in-the-Loop (HITL) Governance:** Intercepts high-impact actions (refunds > $500, Sev-1 incident tickets, contract discount overrides > 20%), stages an `ApprovalRequest` into a `PENDING` queue, and logs operator decisions (`APPROVED` / `REJECTED`) into the immutable audit ledger.

### 6. Authentication, RBAC & Security Audit Ledger
- **JWT & Bcrypt Security:** Salted password hashing with `bcrypt` and HMAC-SHA256 JWT access tokens via `PyJWT`.
- **Role-Based Access Control (RBAC):** Tiered permissions across `admin` (unrestricted), `analyst` (queries, analytics, reports), and `viewer` (read-only executive access).
- **Compliance Audit Logging:** Immutable security ledger capturing user logins, failed attempts, document operations, report generations, and HITL authorization decisions with client IP and JSON payloads.

### 7. Enterprise SaaS UI (Next.js 14)
- **AI Operations Chat:** Real-time Markdown table parser, interactive visual analytics cards (Regional bars, MoM growth badge, Top products ranking, HITL Action alert card), SQL query viewer, and persistent session drawer.
- **Knowledge Base (`/knowledge`):** Document upload zone with 15MB drag-and-drop validation, document repository with status pills and SHA-256 hashes, chunk inspector modal, and interactive vector search playground.
- **Business Analytics (`/analytics`):** Real-time financial KPI cards, MoM growth trend banner, top products ranking, regional market share distribution, and customer tier cohorts.
- **Reports Generator (`/reports`):** Interactive report generator supporting Executive Summary, Detailed Sales, and Regional Performance in both styled PDF and raw CSV, with instant browser downloads and historical archive.
- **Human Approvals (`/approvals`):** Status-filtered review inbox (Pending, Approved, Rejected) with payload inspection, review notes input, and one-click Approve/Reject authorizations.
- **Audit Ledger (`/audit`):** Statistical activity ribbon, action type filters, user search, and structured JSON detail inspector drawer.
- **Settings & Governance (`/settings`):** Infrastructure parameters inspector and interactive RBAC Role Simulator (instant toggle between Admin, Analyst, and Viewer with active privileges matrix).

---

## Verified Database Metrics (Phase 3 Live Execution)

| User Inquiry | Classified Intent | Tool Executed | Actual Database Result |
|---|---|---|---|
| *"What was our total revenue?"* | `SQL_QUERY` | `safe_sql` | **Gross: $11,996,072.66** \| **Net: $10,334,705.72** across 2,539 recorded orders |
| *"Compare this month's revenue with last month."* | `BI_ANALYTICS` | `pandas_analytics` | **+10.12% MoM net increase** ($965,315.52 vs $876,634.91, delta: +$88,680.61) |
| *"Which five products generated the highest revenue?"* | `SQL_QUERY` | `safe_sql` | 1. Custom Architecture Consulting ($731,500)<br>2. High-Availability Storage Rack ($709,500)<br>3. Autonomous Workflow Automator ($684,800)<br>4. Security Audit & Hardening ($627,200)<br>5. Endpoint Zero-Trust Guard ($603,060) |
| *"Which region generated the most sales?"* | `SQL_QUERY` | `safe_sql` | **North America** ($2,840,581.63 net, 692 orders), followed by Europe ($2.67M), Asia-Pacific ($2.61M), LATAM ($2.21M) |

---

## Quickstart Guide

### 1. Environment Setup
```bash
cp .env.example .env
```
*(To use live Google Gemini, configure `GEMINI_API_KEY` in `.env`. If left empty, the application automatically runs in Safe Mock Mode).*

### 2. Run the Backend API
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/health`

### 3. Run the Frontend UI
```powershell
cd frontend
npm run dev
```
- Open `http://localhost:3000/chat` to test queries.

---

## Running Automated Tests

Run the complete backend test suite (62 tests):
```powershell
python -m pytest backend/tests -v
```

**Test Suite Coverage:**
- `test_auth_and_rbac.py`: Bcrypt login, invalid credentials rejection, JWT profile retrieval, admin user listing, analyst 403 Forbidden enforcement, and audit ledger querying.
- `test_reports_and_approvals.py`: PDF `%PDF-` generation, CSV RFC 4180 export, report download endpoint with headers, chat agent approval staging, and review authorization lifecycle.
- `test_document_processing.py`: PDF/DOCX/TXT text extraction, magic byte header verification, path traversal sanitization, SHA-256 duplicate detection, OCR warning on image-only PDFs.
- `test_vector_rag.py`: 768-dim embeddings, vector similarity search, grounded citation extraction, and non-matching query refusal.
- `test_phase4_e2e.py`: End-to-end multi-step RAG flow via TestClient, including document listing, semantic vector search, agent RAG chat with citations, refusal of irrelevant queries, and business analytics integration.
- `test_safe_sql.py`: Rejection of `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, multiple queries, sensitive tables (`users`, `sqlite_master`), limit clamping, and query execution.
- `test_analytics.py`: Calculation of total revenue, MoM growth %, top products, regional shares, customer cohorts, and edge cases.
- `test_agent_workflow.py`: LangGraph state machine, SQL flow, RAG flow, and 5-iteration limit.
- `test_chat_api.py`: `/api/chat` and `/api/chat/history` request validation, sanitization, and session persistence.
- `test_gemini_config.py`: Gemini client config, mock mode detection, and prompt injection defense.
- `test_health.py` & `test_database.py`: Health checks and synthetic database seeder verification.
