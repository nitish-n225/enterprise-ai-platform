import json
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
from backend.app.models.business import Customer, Product, Order, OrderItem, SalesRecord
from backend.app.models.rag import Document, DocumentChunk
from backend.app.models.approval import ApprovalRequest

logger = logging.getLogger("enterprise_ai.tools")

class EnterpriseTools:
    """
    Deterministic tools executed by the LangGraph orchestrator.
    Guarantees read-only database safety, document chunk retrieval, and HITL staging.
    """

    @staticmethod
    def execute_safe_sql(user_inquiry: str, db: Session) -> Dict[str, Any]:
        """
        Executes safe read-only SQL queries corresponding to business operations.
        Never executes DDL or DML statements.
        """
        inquiry_lower = user_inquiry.lower()

        # Deterministic query mapping based on business intent
        if "product" in inquiry_lower:
            query = "SELECT sku, name, category, unit_price, stock_quantity FROM products ORDER BY unit_price DESC LIMIT 10"
            summary = "Retrieved top 10 enterprise products by price and inventory."
        elif "customer" in inquiry_lower:
            query = "SELECT id, name, company, region, tier, status FROM customers ORDER BY id ASC LIMIT 10"
            summary = "Retrieved enterprise customer accounts and contract tiers."
        elif "sales" in inquiry_lower or "revenue" in inquiry_lower:
            query = "SELECT date, region, channel, gross_revenue, net_revenue, order_count FROM sales_records ORDER BY date DESC LIMIT 12"
            summary = "Retrieved trailing monthly sales aggregations by region and channel."
        else:
            query = "SELECT order_number, order_date, status, total_amount, payment_method FROM orders ORDER BY order_date DESC LIMIT 10"
            summary = "Retrieved latest enterprise orders and processing statuses."

        try:
            result = db.execute(text(query))
            rows = [dict(row._mapping) for row in result]
            # Convert any non-serializable objects (like datetime) to strings
            for r in rows:
                for k, v in r.items():
                    if hasattr(v, "isoformat"):
                        r[k] = v.isoformat()
            return {
                "success": True,
                "tool": "safe_sql",
                "query": query,
                "summary": summary,
                "row_count": len(rows),
                "data": rows,
                "error": None
            }
        except Exception as e:
            logger.error(f"Safe SQL execution failed: {e}")
            return {
                "success": False,
                "tool": "safe_sql",
                "query": query,
                "summary": "Safe SQL execution error.",
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

        if not top_chunks:
            # Fallback to returning the first available policy chunk if no specific keyword matched
            if chunks:
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
    def run_pandas_analytics(inquiry: str, db: Session) -> Dict[str, Any]:
        """
        Executes financial analysis and Month-over-Month calculations with Pandas.
        """
        try:
            sales_records = db.query(SalesRecord).all()
            if not sales_records:
                return {
                    "success": False,
                    "tool": "pandas_analytics",
                    "summary": "No historical sales data found in database.",
                    "data": None,
                    "error": "No sales records"
                }

            data = [
                {
                    "date": s.date,
                    "region": s.region,
                    "channel": s.channel,
                    "gross_revenue": s.gross_revenue,
                    "net_revenue": s.net_revenue,
                    "order_count": s.order_count,
                    "customer_count": s.customer_count
                }
                for s in sales_records
            ]
            df = pd.DataFrame(data)
            df["year_month"] = df["date"].dt.to_period("M")
            monthly_agg = df.groupby("year_month").agg({
                "gross_revenue": "sum",
                "net_revenue": "sum",
                "order_count": "sum"
            }).reset_index()

            monthly_agg["net_revenue_growth_pct"] = monthly_agg["net_revenue"].pct_change() * 100
            latest_growth = float(monthly_agg["net_revenue_growth_pct"].iloc[-1]) if len(monthly_agg) > 1 else 0.0
            total_net_rev = float(df["net_revenue"].sum())

            top_regions = df.groupby("region")["net_revenue"].sum().to_dict()

            summary = (
                f"Computed revenue across {len(df)} records. "
                f"Total net revenue: ${total_net_rev:,.2f}. "
                f"Latest Month-over-Month net growth: {latest_growth:+.2f}%."
            )

            return {
                "success": True,
                "tool": "pandas_analytics",
                "summary": summary,
                "data": {
                    "total_net_revenue": round(total_net_rev, 2),
                    "latest_mom_growth_percent": round(latest_growth, 2),
                    "revenue_by_region": {k: round(v, 2) for k, v in top_regions.items()},
                    "periods_analyzed": len(monthly_agg)
                },
                "error": None
            }
        except Exception as e:
            logger.error(f"Pandas analytics failed: {e}")
            return {
                "success": False,
                "tool": "pandas_analytics",
                "summary": "Failed to compute business metrics.",
                "data": None,
                "error": str(e)
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

