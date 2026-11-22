# Enterprise AI Business Operations Agent

A production-grade, portfolio-ready Agentic AI business operations platform built with **FastAPI**, **LangGraph**, **Google Gemini**, **SQLAlchemy**, and **Next.js 14**.

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
```

---

## Key Features Implemented

### 1. LangGraph Workflow Orchestration
- Multi-node cyclical state machine:
  1. **Request Classification:** Determines query intent (`SQL_QUERY`, `BI_ANALYTICS`, `KNOWLEDGE_SEARCH`, `HITL_ACTION`, `GENERAL_QUERY`).
  2. **Task Planning:** Formulates structured execution plan.
  3. **Tool Dispatch:** Selects and invokes tools safely with thread-safe DB contexts.
  4. **Result Validation:** Checks outputs, prevents infinite loops, and enforces a hard **5-iteration maximum**.
  5. **Response Synthesis:** Generates grounded, cited answers formatted in clean markdown.

### 2. Dual-Engine AI Integration (Gemini + Transparent Safe Mock Mode)
- **Official `google-genai` SDK:** Interfaces with Google Gemini 2.5 / 1.5 Flash via `GEMINI_API_KEY`.
- **Transparent Safe Mock Mode:** When no API key is provided or `MOCK_AI=true`, the system runs a realistic deterministic mock mode (`is_mock=True`, `model_name="mock-operations-agent"`). Never pretends mock responses came from Gemini.

### 3. Business Database & Synthetic Seeder
- Auto-seeds realistic enterprise entities on boot:
  - 15 Global Customers across 4 regions
  - 15 Enterprise Products & Subscriptions
  - 120 Historical Orders with multi-line items
  - 48 Trailing Monthly Sales Aggregations
  - 2 Indexed Policy Documents (Refund Policy & SLA)
  - 1 Staged Human Approval Request
  - Baseline Audit Logs

### 4. Interactive Enterprise Dashboard & Chat UI
- **Next.js 14 App Router:** Responsive SaaS layout with Tailwind CSS.
- **AI Operations Chat:** Live LangGraph execution timeline, step-by-step progress, tool activity breakdown, suggestion pills, and multi-session persistence.
- **Health Diagnostics Widget:** Real-time backend status, database table verification, and uptime tracking.

---

## Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
To use live Google Gemini, add your API key in `.env`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
MOCK_AI=false
```
*(If left blank, the application automatically runs in Safe Mock Mode).*

### 2. Run the Backend API
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint: `http://127.0.0.1:8000/api/health`

### 3. Run the Frontend UI
```powershell
cd frontend
npm run dev
```
- Open `http://localhost:3000` in your browser.
- Navigate to `/chat` to test the AI Operations Agent.

---

## Running Automated Tests

Run the full backend test suite covering Phase 1 and Phase 2:
```powershell
python -m pytest backend/tests -v
```

**Test Coverage:**
- `test_database.py`: Database models and synthetic seeder verification.
- `test_health.py`: Gateway health and DB connectivity endpoints.
- `test_gemini_config.py`: LLM provider, mock mode detection, prompt injection guards.
- `test_agent_workflow.py`: LangGraph graph execution, SQL flow, RAG flow, 5-iteration limit.
- `test_chat_api.py`: `/api/chat` and `/api/chat/history` requests, validation, and session persistence.
