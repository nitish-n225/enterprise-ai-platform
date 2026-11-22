from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ApprovalReviewRequest(BaseModel):
    decision: str = Field(..., description="Decision must be APPROVED or REJECTED")
    notes: Optional[str] = Field(None, description="Reviewer justification or notes")
    reviewer: str = Field("user_admin", description="Reviewer identifier")

class ApprovalStageRequest(BaseModel):
    inquiry: str = Field(..., description="Operational request prompt to stage")
    requested_by: str = Field("AI_Agent", description="Source requester")

class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action_type: str
    title: str
    description: str
    payload_json: str
    status: str
    requested_by: str
    reviewed_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
