import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.approval import ApprovalRequest
from backend.app.models.audit import AuditLog

logger = logging.getLogger("enterprise_ai.services.approval")

class ApprovalService:
    """
    Human-in-the-Loop (HITL) approval management service.
    Orchestrates the staging, auditing, and review lifecycle for high-impact
    business actions (refunds > $500, Sev-1 incident tickets, contract discounts).
    """

    @classmethod
    def list_approvals(cls, db: Session, status: Optional[str] = None) -> List[ApprovalRequest]:
        query = db.query(ApprovalRequest).order_by(desc(ApprovalRequest.created_at))
        if status:
            query = query.filter(ApprovalRequest.status == status.upper())
        return query.all()

    @classmethod
    def get_approval(cls, db: Session, approval_id: int) -> Optional[ApprovalRequest]:
        return db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()

    @classmethod
    def review_approval(
        cls,
        db: Session,
        approval_id: int,
        decision: str,
        reviewer: str = "user_admin",
        notes: Optional[str] = None
    ) -> ApprovalRequest:
        req = cls.get_approval(db, approval_id)
        if not req:
            raise ValueError(f"Approval request #{approval_id} not found.")

        if req.status != "PENDING":
            raise ValueError(f"Approval request #{approval_id} has already been resolved as {req.status}.")

        decision_upper = decision.upper()
        if decision_upper not in ["APPROVED", "REJECTED"]:
            raise ValueError(f"Invalid decision '{decision}'. Must be APPROVED or REJECTED.")

        req.status = decision_upper
        req.reviewed_by = reviewer
        req.resolution_notes = notes or f"Marked as {decision_upper} by {reviewer}."
        req.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)

        # Create security audit log
        audit = AuditLog(
            user_id=reviewer,
            user_role="admin",
            ip_address="127.0.0.1",
            endpoint=f"/api/approvals/{approval_id}/review",
            action=f"HITL_{decision_upper}",
            resource_type="ApprovalRequest",
            resource_id=str(req.id),
            status_code=200,
            details_json=json.dumps({
                "action_type": req.action_type,
                "title": req.title,
                "decision": decision_upper,
                "notes": notes
            })
        )
        db.add(audit)
        db.commit()
        db.refresh(req)

        logger.info(f"Resolved Approval Request #{req.id} as {decision_upper} by {reviewer}")
        return req

    @classmethod
    def stage_action(
        cls,
        db: Session,
        inquiry: str,
        requested_by: str = "AI_Agent"
    ) -> ApprovalRequest:
        """
        Parses high-impact user intent from chat prompt and stages a pending ApprovalRequest.
        """
        inquiry_lower = inquiry.lower()

        # Classify high-impact action type
        if any(w in inquiry_lower for w in ["refund", "credit", "reimburse", "money back"]):
            action_type = "ISSUE_REFUND"
            title = "Manager Authorization Required: Customer Refund Exceeding $500"
            description = (
                f"Agent staged an enterprise refund request based on user inquiry: '{inquiry}'. "
                f"Corporate Refund Policy § 5 mandates Human-in-the-Loop manager approval for refunds over $500."
            )
            payload = {
                "inquiry": inquiry,
                "threshold_rule": "Refund Policy § 5 (Amount > $500)",
                "action": "ISSUE_REFUND",
                "estimated_impact": "Financial Adjustment",
                "staged_status": "PENDING"
            }
        elif any(w in inquiry_lower for w in ["escalat", "severity 1", "sev 1", "sev-1", "critical incident"]):
            action_type = "CREATE_SUPPORT_TICKET"
            title = "Escalate Critical Severity-1 Incident to Senior Engineering"
            description = (
                f"Agent staged an urgent Severity-1 incident ticket for customer escalation: '{inquiry}'. "
                f"Requires operational sign-off before notifying the on-call incident response team."
            )
            payload = {
                "inquiry": inquiry,
                "threshold_rule": "SLA Operations § 2 (Severity-1 Response SLA 15m)",
                "action": "CREATE_SUPPORT_TICKET",
                "priority": "Severity-1",
                "staged_status": "PENDING"
            }
        elif any(w in inquiry_lower for w in ["discount", "contract override", "price drop"]):
            action_type = "MODIFY_DISCOUNT"
            title = "Contractual Price Discount Authorization (>20%)"
            description = (
                f"Agent staged a non-standard contract discount modification: '{inquiry}'. "
                f"Corporate Sales Governance requires Finance Director sign-off."
            )
            payload = {
                "inquiry": inquiry,
                "threshold_rule": "Sales Governance § 4 (Discounts > 20%)",
                "action": "MODIFY_DISCOUNT",
                "staged_status": "PENDING"
            }
        else:
            action_type = "OPERATIONAL_ACTION"
            title = "Human Review Required for Staged Operational Change"
            description = f"Staged operational action requiring human confirmation: '{inquiry}'."
            payload = {
                "inquiry": inquiry,
                "action": "OPERATIONAL_ACTION",
                "staged_status": "PENDING"
            }

        req = ApprovalRequest(
            action_type=action_type,
            title=title,
            description=description,
            payload_json=json.dumps(payload),
            status="PENDING",
            requested_by=requested_by
        )
        db.add(req)
        db.commit()
        db.refresh(req)

        logger.info(f"Staged Approval Request #{req.id} ({action_type}) from user inquiry.")
        return req

approval_service = ApprovalService()

