from sqlalchemy import Column, Integer, String, Text, DateTime
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin

class ApprovalRequest(Base, TimestampMixin):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(60), nullable=False, index=True)  # CREATE_SUPPORT_TICKET, ISSUE_REFUND, MODIFY_RECORD, EXPORT_SENSITIVE_DATA
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    payload_json = Column(Text, nullable=False)  # Serialized structured payload of proposed action
    status = Column(String(30), default="PENDING", index=True, nullable=False)  # PENDING, APPROVED, REJECTED
    requested_by = Column(String(100), default="AI_Agent", nullable=False)
    reviewed_by = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

