import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional
from backend.app.models.audit import AuditLog
from backend.app.models.user import User
from backend.app.schemas.auth import AuditLogResponse

logger = logging.getLogger("enterprise_ai.api.audit")

router = APIRouter(prefix="/audit", tags=["Security & Audit Logging"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Returns security and operational audit trail records with optional filtering.
    """
    query = db.query(AuditLog).order_by(desc(AuditLog.timestamp))
    if action:
        query = query.filter(AuditLog.action == action.upper())
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    return query.limit(limit).all()

@router.get("/stats")
def get_audit_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """
    Returns statistical breakdown of audited actions.
    """
    total_logs = db.query(AuditLog).count()

    action_counts = (
        db.query(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
        .all()
    )

    recent_actions = (
        db.query(AuditLog.action, AuditLog.user_id, AuditLog.status_code, AuditLog.timestamp)
        .order_by(desc(AuditLog.timestamp))
        .limit(5)
        .all()
    )

    return {
        "total_events": total_logs,
        "actions_breakdown": {act: count for act, count in action_counts},
        "recent_activity": [
            {
                "action": r[0],
                "user_id": r[1],
                "status_code": r[2],
                "timestamp": r[3].isoformat()
            }
            for r in recent_actions
        ]
    }
