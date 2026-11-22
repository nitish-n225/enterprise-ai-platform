import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.agent.safe_sql import SafeSQLEngine
from backend.app.services.analytics import PandasAnalyticsEngine
from backend.app.models.rag import Document, DocumentChunk
from backend.app.models.approval import ApprovalRequest

logger = logging.getLogger("enterprise_ai.tools")

class EnterpriseTools:
    """
    Deterministic enterprise operations tools executed by the LangGraph orchestrator.
    Combines AST-verified Safe SQL, Pandas analytics, RAG knowledge retrieval, and HITL staging.
    """

    @staticmethod
    def execute_safe_sql(user_inquiry: str, db: Session) -> Dict[str, Any]:
        """
        Formulates and executes safe read-only SQL queries corresponding to user inquiry.
        Passes through SafeSQLEngine for SQLGlot AST validation, table whitelisting, and row clamping.
        """
        inquiry_lower = user_inquiry.lower()

        # Dynamic read-only query formulation based on business questions
        if (any(k in inquiry_lower for k in ["top", "highest", "best", "five", "ranking"]) and "product" in inquiry_lower) or ("product" in inquiry_lower and "revenue" in inquiry_lower):
            query = (
                "SELECT p.sku, p.name, p.category, SUM(oi.quantity) AS units_sold, "
                "ROUND(SUM(oi.subtotal), 2) AS total_revenue "
                "FROM products p "
                "JOIN order_items oi ON p.id = oi.product_id "
                "GROUP BY p.id, p.sku, p.name, p.category "
                "ORDER BY total_revenue DESC LIMIT 5"
            )
        elif "region" in inquiry_lower:
            query = (
                "SELECT region, ROUND(SUM(gross_revenue), 2) AS total_gross_revenue, "
                "ROUND(SUM(net_revenue), 2) AS total_net_revenue, "
                "SUM(order_count) AS total_orders "
                "FROM sales_records "
                "GROUP BY region "
                "ORDER BY total_net_revenue DESC LIMIT 10"
            )
        elif "customer" in inquiry_lower:
            query = (
                "SELECT id, name, company, region, tier, status "
                "FROM customers "
                "ORDER BY id ASC LIMIT 15"
            )
        elif "total" in inquiry_lower and "revenue" in inquiry_lower:
            query = (
                "SELECT ROUND(SUM(gross_revenue), 2) AS total_gross_revenue, "
                "ROUND(SUM(net_revenue), 2) AS total_net_revenue, "
                "SUM(order_count) AS total_orders "
                "FROM sales_records"
            )
        else:
            query = (
                "SELECT order_number, order_date, status, total_amount, payment_method "
                "FROM orders "
                "ORDER BY order_date DESC LIMIT 10"
            )

        # Execute through AST-verified SafeSQLEngine
        return SafeSQLEngine.execute_safe_query(query, db)

    @staticmethod
    def run_pandas_analytics(user_inquiry: str, db: Session) -> Dict[str, Any]:
        """
        Executes deterministic Pandas analytics: MoM growth, revenue sums, regional breakdowns,
        top products, or customer cohort analysis from actual database records.
        """
        inquiry_lower = user_inquiry.lower()

        try:
            if any(k in inquiry_lower for k in ["compare", "month-over-month", "mom", "last month", "growth", "trend", "decrease"]):
                res = PandasAnalyticsEngine.compute_month_over_month(db)
                tool_type = "month_over_month"
            elif any(k in inquiry_lower for k in ["top", "highest", "best"]) and "product" in inquiry_lower:
                res = PandasAnalyticsEngine.compute_top_products(db, limit=5)
                tool_type = "top_products"
            elif "region" in inquiry_lower:
                res = PandasAnalyticsEngine.compute_regional_sales(db)
                tool_type = "regional_sales"
            elif "customer" in inquiry_lower:
                res = PandasAnalyticsEngine.compute_customer_cohorts(db)
                tool_type = "customer_cohorts"
            else:
                res = PandasAnalyticsEngine.compute_total_revenue(db)
                tool_type = "total_revenue"

            return {
                "success": True,
                "tool": "pandas_analytics",
                "analysis_type": tool_type,
                "summary": res.get("summary", "Computed business metrics with Pandas."),
                "data": res,
                "error": None
            }
        except Exception as e:
            logger.error(f"Pandas analytics failed on inquiry '{user_inquiry}': {e}")
            return {
                "success": False,
                "tool": "pandas_analytics",
                "analysis_type": "error",
                "summary": f"Failed to compute business metrics: {str(e)}",
                "data": None,
                "error": str(e)
            }

    @staticmethod
    def search_knowledge_base(query: str, db: Session) -> Dict[str, Any]:
        """
        Retrieves relevant document excerpts from the internal knowledge base.
        """
        terms = [t for t in query.lower().split() if len(t) > 3]
        chunks = db.query(DocumentChunk).join(Document).all()
        scored_chunks = []

        for ch in chunks:
            content_lower = ch.content.lower()
            score = sum(1 for term in terms if term in content_lower)
            if score > 0 or not terms:
                scored_chunks.append({
                    "document_id": ch.document_id,
                    "document_filename": ch.document.filename,
                    "chunk_index": ch.chunk_index,
                    "content": ch.content,
                    "score": score
                })

        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        top_chunks = scored_chunks[:3]

        if not top_chunks and chunks:
            top_chunks = [{
                "document_id": chunks[0].document_id,
                "document_filename": chunks[0].document.filename,
                "chunk_index": chunks[0].chunk_index,
                "content": chunks[0].content,
                "score": 0.5
            }]

        return {
            "success": True,
            "tool": "knowledge_search",
            "summary": f"Retrieved {len(top_chunks)} document passages from verified enterprise records.",
            "data": top_chunks,
            "error": None
        }

    @staticmethod
    def stage_approval_action(inquiry: str, db: Session) -> Dict[str, Any]:
        """
        Stages an operational action requiring Human-in-the-Loop approval.
        """
        try:
            req = ApprovalRequest(
                action_type="CREATE_SUPPORT_TICKET",
                title="AI Agent Staged Incident Escalation",
                description=f"Automated action requested via agent dialogue: '{inquiry[:150]}...'",
                payload_json=json.dumps({
                    "action": "CREATE_SUPPORT_TICKET",
                    "source": "AI_Agent_Chat",
                    "inquiry": inquiry,
                    "target_board": "Engineering Triage"
                }),
                status="PENDING",
                requested_by="AI_Agent"
            )
            db.add(req)
            db.commit()
            db.refresh(req)

            return {
                "success": True,
                "tool": "hitl_approval",
                "summary": f"Staged action #{req.id} into Pending Approval Queue.",
                "data": {
                    "approval_id": req.id,
                    "action_type": req.action_type,
                    "status": req.status,
                    "title": req.title
                },
                "error": None
            }
        except Exception as e:
            logger.error(f"Staging approval action failed: {e}")
            return {
                "success": False,
                "tool": "hitl_approval",
                "summary": "Failed to stage approval request.",
                "data": None,
                "error": str(e)
            }
