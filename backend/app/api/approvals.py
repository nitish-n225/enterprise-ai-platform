import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.approval import ApprovalRequest
from backend.app.schemas.approvals import (
    ApprovalResponse,
    ApprovalReviewRequest,
    ApprovalStageRequest
)
from backend.app.services.approval_service import approval_service

logger = logging.getLogger("enterprise_ai.api.approvals")

router = APIRouter(prefix="/approvals", tags=["Human Approvals (HITL)"])

@router.get("", response_model=List[ApprovalResponse])
def list_approvals(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lists staged operational approval requests with optional status filtering (PENDING, APPROVED, REJECTED).
    """
    return approval_service.list_approvals(db=db, status=status_filter)

@router.get("/{approval_id}", response_model=ApprovalResponse)
def get_approval_details(approval_id: int, db: Session = Depends(get_db)):
    """
    Retrieves details and serialized action payload for an approval request.
    """
    req = approval_service.get_approval(db=db, approval_id=approval_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Approval request #{approval_id} not found.")
    return req

@router.post("/stage", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
def stage_approval_request(payload: ApprovalStageRequest, db: Session = Depends(get_db)):
    """
    Manually or agentically stages an operational action into the PENDING queue.
    """
    req = approval_service.stage_action(db=db, inquiry=payload.inquiry, requested_by=payload.requested_by)
    return req

@router.post("/{approval_id}/review", response_model=ApprovalResponse)
def review_approval_request(
    approval_id: int,
    payload: ApprovalReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Human-in-the-Loop decision endpoint: allows authenticated operators to APPROVE or REJECT staged actions.
    """
    try:
        req = approval_service.review_approval(
            db=db,
            approval_id=approval_id,
            decision=payload.decision,
            reviewer=payload.reviewer,
            notes=payload.notes
        )
        return req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

