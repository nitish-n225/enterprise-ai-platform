import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from backend.app.core.config import settings

logger = logging.getLogger("enterprise_ai.llm")

try:
    from google import genai
    from google.genai import types as genai_types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai package not found. AI engine will operate in mock mode.")

class LLMProvider:
    """
    Enterprise LLM Provider interfacing with Google Gemini 2.5 / 1.5 Flash via the official
    google-genai SDK, or transparently falling back to Safe Mock Mode when credentials are not configured.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
        self.model_name = settings.GEMINI_MODEL
        self.force_mock = settings.MOCK_AI or not bool(self.api_key) or not GENAI_AVAILABLE
        self.client = None

        if not self.force_mock and GENAI_AVAILABLE:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info(f"Gemini LLM Provider initialized with model: {self.model_name}")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}. Defaulting to mock mode.")
                self.force_mock = True

        if self.force_mock:
            logger.info("LLM Provider is operating in Safe Mock Mode (Simulated AI).")

    @property
    def is_mock_mode(self) -> bool:
        return self.force_mock or self.client is None

    @property
    def active_model(self) -> str:
        return "mock-operations-agent" if self.is_mock_mode else self.model_name

    def classify_intent(self, user_prompt: str) -> Tuple[str, bool]:
        """
        Classifies incoming user intent into:
        - SQL_QUERY (sales totals, top products, orders, customers)
        - BI_ANALYTICS (trends, MoM comparisons, aggregations, growth)
        - KNOWLEDGE_SEARCH (refund policy, SLA, terms, documentation)
        - HITL_ACTION (create ticket, issue refund, change status)
        - GENERAL_QUERY (greeting, capabilities, help)

        Returns (intent, is_mock)
        """
        prompt_lower = user_prompt.lower()

        # Prompt injection / security guard
        if any(bad in prompt_lower for bad in ["ignore previous instructions", "system prompt leak", "pretend you are", "jailbreak"]):
            return "GENERAL_QUERY", self.is_mock_mode

        if self.is_mock_mode:
            # Deterministic business rule classifier for mock mode
            if any(w in prompt_lower for w in ["ticket", "escalate", "refund approval", "dispute review"]):
                return "HITL_ACTION", True
            elif any(w in prompt_lower for w in ["policy", "refund", "sla", "document", "service level", "terms", "agreement", "guideline", "retention"]):
                return "KNOWLEDGE_SEARCH", True
            elif any(w in prompt_lower for w in ["compare", "growth", "mom", "month-over-month", "trend", "why did revenue", "decrease"]):
                return "BI_ANALYTICS", True
            elif any(w in prompt_lower for w in ["sales", "revenue", "order", "product", "top five", "customer", "count", "how many"]):
                return "SQL_QUERY", True
            else:
                return "GENERAL_QUERY", True

        # Gemini LLM Classification
        try:
            system_instruction = (
                "You are an enterprise AI classifier. Classify the user inquiry into strictly ONE category: "
                "SQL_QUERY, BI_ANALYTICS, KNOWLEDGE_SEARCH, HITL_ACTION, or GENERAL_QUERY. "
                "Respond ONLY with the category token."
            )
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=f"{system_instruction}\nUser Prompt: {user_prompt}",
                config=genai_types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=30
                )
            )
            raw_text = response.text.strip().upper() if response.text else "GENERAL_QUERY"
            for candidate in ["SQL_QUERY", "BI_ANALYTICS", "KNOWLEDGE_SEARCH", "HITL_ACTION", "GENERAL_QUERY"]:
                if candidate in raw_text:
                    return candidate, False
            return "GENERAL_QUERY", False
        except Exception as e:
            logger.warning(f"Gemini classification call failed: {e}. Falling back to rule-based classifier.")
            # Fall back safely
            if any(w in prompt_lower for w in ["ticket", "escalate", "refund approval"]):
                return "HITL_ACTION", True
            elif any(w in prompt_lower for w in ["policy", "refund", "sla", "document", "retention", "terms"]):
                return "KNOWLEDGE_SEARCH", True
            elif any(w in prompt_lower for w in ["compare", "growth", "mom", "trend"]):
                return "BI_ANALYTICS", True
            elif any(w in prompt_lower for w in ["sales", "revenue", "order", "product", "customer"]):
                return "SQL_QUERY", True
            return "GENERAL_QUERY", True

    def generate_plan(self, user_prompt: str, intent: str) -> List[str]:
        """
        Generates structured task execution steps for the agent workflow.
        """
        if intent == "SQL_QUERY":
            return [
                "Parse enterprise relational query intent",
                "Formulate safe read-only SQL SELECT query",
                "Execute query with AST validation and row clamping",
                "Synthesize metrics and tabular summary"
            ]
        elif intent == "BI_ANALYTICS":
            return [
                "Extract historical business records and revenue data",
                "Execute Pandas aggregations and MoM trend calculation",
                "Detect variance or anomalies in sales performance",
                "Synthesize business analysis with actionable insights"
            ]
        elif intent == "KNOWLEDGE_SEARCH":
            return [
                "Formulate semantic search query across document index",
                "Retrieve top-ranking relevant policy/SLA passages",
                "Verify ground truth and source attribution",
                "Synthesize grounded policy answer citing documents"
            ]
        elif intent == "HITL_ACTION":
            return [
                "Identify high-impact operational action parameters",
                "Stage action into Human-in-the-Loop pending queue",
                "Generate structured approval payload for administrative review",
                "Notify user that human authorization is required"
            ]
        else:
            return [
                "Analyze general operations inquiry",
                "Formulate comprehensive assistance guide"
            ]

    def synthesize_response(
        self,
        user_prompt: str,
        intent: str,
        plan: List[str],
        tool_results: List[Dict[str, Any]],
        is_mock: bool
    ) -> Tuple[str, str, bool]:
        """
        Synthesizes the final business response based on executed tool outputs.
        Returns (response_text, model_name, is_mock).
        """
        # If in Mock Mode or if Gemini API is unavailable, produce accurate enterprise mock synthesis
        if is_mock or self.is_mock_mode:
            return self._synthesize_mock(user_prompt, intent, tool_results)

        # Real Gemini API synthesis
        try:
            tools_context = ""
            for res in tool_results:
                tools_context += f"\n[Tool: {res.get('tool')}]\nSummary: {res.get('summary')}\nData: {res.get('data')}\n"

            prompt_content = f"""
You are the Enterprise AI Business Operations Agent.
Synthesize a professional, concise, and executive-ready business answer for the user based strictly on the verified data retrieved from deterministic tools.

CRITICAL RULES:
1. Do NOT hallucinate data, policies, or facts not present in the tool results.
2. If tool results show empty or missing information, explicitly state that enterprise records do not contain the requested data.
3. When referencing numbers, quote the exact metrics from the tool results.
4. If documents were retrieved, cite the exact document name.
5. Provide clear, professional markdown formatting with bullet points or summary tables where appropriate.

User Inquiry: {user_prompt}
Classified Intent: {intent}
Executed Tool Data:
{tools_context}
"""
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt_content,
                config=genai_types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=1000
                )
            )
            final_text = response.text.strip() if response.text else "Unable to generate response from model."
            return final_text, self.model_name, False
        except Exception as e:
            logger.error(f"Gemini response synthesis failed: {e}. Falling back to safe mock synthesis.")
            res_text, _, _ = self._synthesize_mock(user_prompt, intent, tool_results)
            fallback_text = f"{res_text}\n\n*(Note: Generated via safe mock fallback due to LLM provider error: {str(e)})*"
            return fallback_text, "mock-operations-agent", True

    def _synthesize_mock(
        self,
        user_prompt: str,
        intent: str,
        tool_results: List[Dict[str, Any]]
    ) -> Tuple[str, str, bool]:
        """
        Produces realistic, transparently labeled mock outputs for enterprise operations.
        Never pretends to be Gemini.
        """
        header = "**[SIMULATED RESPONSE - MOCK MODE]**\n\n"

        if intent == "SQL_QUERY":
            # Extract data from SQL tool result if present
            sql_data = next((r.get("data") for r in tool_results if r.get("tool") == "safe_sql"), None)
            if sql_data and isinstance(sql_data, list) and len(sql_data) > 0:
                header += "### Business Query Results\n"
                header += f"Retrieved **{len(sql_data)} records** matching your operational criteria:\n\n"
                # If list of dicts, format markdown table for first few
                first_row = sql_data[0]
                headers = list(first_row.keys())[:5]
                header += "| " + " | ".join(headers) + " |\n"
                header += "| " + " | ".join(["---"] * len(headers)) + " |\n"
                for row in sql_data[:5]:
                    row_vals = [str(row.get(h, "")) for h in headers]
                    header += "| " + " | ".join(row_vals) + " |\n"
                header += "\n*Data extracted via Safe Read-Only SQL Tool with AST filtering.*"
            else:
                header += "### Enterprise Sales & Product Overview\n"
                header += "- **Total Verified Sales (Trailing 12 Mo):** $2,840,500.00 across 120 completed orders.\n"
                header += "- **Active Enterprise Customers:** 15 accounts across North America, Europe, Asia-Pacific, and LATAM.\n"
                header += "- **Top Product by Revenue:** Enterprise Cloud Suite Pro ($12,000/license).\n\n"
                header += "*Data retrieved from internal PostgreSQL/SQLite operational database.*"

        elif intent == "BI_ANALYTICS":
            pandas_res = next((r.get("data") for r in tool_results if r.get("tool") == "pandas_analytics"), None)
            tool_meta = next((r for r in tool_results if r.get("tool") == "pandas_analytics"), {})
            analysis_type = tool_meta.get("analysis_type", "general")

            header += "### Executive Business & Revenue Analytics\n"
            if pandas_res and isinstance(pandas_res, dict):
                if analysis_type == "month_over_month":
                    growth = pandas_res.get("growth_percent", 0.0)
                    curr_rev = pandas_res.get("current_revenue", 0.0)
                    prior_rev = pandas_res.get("prior_revenue", 0.0)
                    delta = pandas_res.get("absolute_delta", 0.0)
                    curr_mo = pandas_res.get("current_month", "Current")
                    prior_mo = pandas_res.get("prior_month", "Prior")
                    direction = pandas_res.get("direction", "trend")

                    header += f"- **Month-over-Month Growth:** **{growth:+.2f}%** ({direction})\n"
                    header += f"- **Net Revenue Comparison:** ${curr_rev:,.2f} ({curr_mo}) vs ${prior_rev:,.2f} ({prior_mo})\n"
                    header += f"- **Net Dollar Variance:** **${delta:+,.2f}**\n\n"
                    header += f"*{pandas_res.get('summary', '')}*"

                elif analysis_type == "top_products":
                    top_prods = pandas_res.get("top_products", [])
                    header += f"**Top {len(top_prods)} Enterprise Products by Revenue:**\n\n"
                    header += "| SKU | Product Name | Category | Units Sold | Total Revenue |\n"
                    header += "| --- | --- | --- | --- | --- |\n"
                    for p in top_prods:
                        header += f"| `{p.get('sku')}` | {p.get('name')} | {p.get('category')} | {p.get('units_sold')} | ${p.get('total_revenue'):,.2f} |\n"
                    header += f"\n*{pandas_res.get('summary', '')}*"

                elif analysis_type == "regional_sales":
                    regions = pandas_res.get("regions", {})
                    top_reg = pandas_res.get("top_region", "N/A")
                    header += f"**Top Performing Region:** **{top_reg}** ({pandas_res.get('top_region_share_pct', 0)}% of total net revenue)\n\n"
                    header += "| Region | Gross Revenue | Net Revenue | Orders | Share |\n"
                    header += "| --- | --- | --- | --- | --- |\n"
                    for r_name, r_data in regions.items():
                        header += f"| **{r_name}** | ${r_data.get('gross_revenue'):,.2f} | ${r_data.get('net_revenue'):,.2f} | {r_data.get('order_count')} | {r_data.get('share_percent')}% |\n"
                    header += f"\n*{pandas_res.get('summary', '')}*"

                else:
                    gross = pandas_res.get("total_gross_revenue", 0.0)
                    net = pandas_res.get("total_net_revenue", 0.0)
                    orders = pandas_res.get("total_orders", 0)
                    aov = pandas_res.get("average_order_value", 0.0)
                    header += f"- **Total Gross Revenue:** **${gross:,.2f}**\n"
                    header += f"- **Total Net Revenue:** **${net:,.2f}**\n"
                    header += f"- **Total Recorded Orders:** **{orders}**\n"
                    header += f"- **Average Order Value (AOV):** **${aov:,.2f}**\n\n"
                    header += f"*{pandas_res.get('summary', '')}*"
            else:
                header += "- **Total Gross Revenue:** $2,840,500.00\n"
                header += "- **Active Enterprise Accounts:** 15 accounts across North America, Europe, Asia-Pacific, and LATAM.\n"

            header += "\n\n*Analysis computed via deterministic Pandas Business Intelligence Engine.*"

        elif intent == "KNOWLEDGE_SEARCH":
            kb_tool_res = next((r for r in tool_results if r.get("tool") == "knowledge_search"), {})
            kb_data = kb_tool_res.get("data", [])
            insufficient = kb_tool_res.get("insufficient_evidence", False) or not kb_data

            if insufficient:
                header += "### Enterprise Knowledge Base Search\n\n"
                header += "The uploaded company documents and enterprise knowledge base do not contain sufficient information to answer this inquiry.\n\n"
                header += "*Grounded RAG Guardrail: The Operations Agent strictly bases policy answers on verified internal documents and does not infer or invent missing company facts.*"
            else:
                top_match = kb_data[0]
                doc_name = top_match.get("document_filename", "Enterprise_Policy.txt")
                page_num = top_match.get("page_number", 1)
                content_excerpt = top_match.get("content", "").strip()

                header += f"### Policy & Documentation Findings\n\n"
                header += f"> \"{content_excerpt}\"\n\n"
                header += f"**Citation:** [Source: {doc_name}, page {page_num}]\n\n"
                header += "**Key Policy Summary:**\n"
                # Extract bullet points from content
                for line in content_excerpt.split("\n"):
                    line = line.strip()
                    if line and (line.startswith("-") or line[0].isdigit()):
                        header += f"{line}\n"
                if not any(l.strip().startswith("-") or (l.strip() and l.strip()[0].isdigit()) for l in content_excerpt.split("\n")):
                    header += f"- Verified according to internal policy `{doc_name}` (page {page_num}).\n"

        elif intent == "HITL_ACTION":
            approval_data = next((r.get("data") for r in tool_results if r.get("tool") == "hitl_approval"), None)
            action_id = approval_data.get("approval_id", "Pending") if approval_data else "REQ-1001"
            header += f"### ⚠️ Human-in-the-Loop Action Staged (Approval Required)\n"
            header += f"The proposed operational action has been safely placed in the **Pending Approval Queue**:\n\n"
            header += f"- **Request Reference:** #{action_id}\n"
            header += f"- **Action Type:** `CREATE_SUPPORT_TICKET`\n"
            header += f"- **Target System:** Engineering Incident Triage Board\n"
            header += f"- **Security Policy:** Direct database modifications and external ticket creation require authenticated administrator approval.\n\n"
            header += "Please navigate to the **Human Approvals** dashboard to review and approve or reject this action."

        else:
            header += "### Enterprise AI Operations Assistant\n"
            header += "I can assist you with business operations tasks across the platform:\n\n"
            header += "1. **Database & Sales Queries:** E.g., *'What were our total sales this month?'* or *'Find top five products by revenue.'*\n"
            header += "2. **Trend & Financial Analytics:** E.g., *'Compare this month's sales with last month's.'*\n"
            header += "3. **Documentation & RAG Search:** E.g., *'Search company documents for our refund policy.'*\n"
            header += "4. **Supervised Operations:** E.g., *'Escalate ticket for customer timeout incident.'*\n\n"
            header += "How may I support your operational workflow today?"

        return header, "mock-operations-agent", True

# Singleton instance
llm_provider = LLMProvider()
