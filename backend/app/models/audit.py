from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    user_id = Column(String(100), nullable=True, index=True)
    user_role = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    endpoint = Column(String(150), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(60), nullable=True)
    resource_id = Column(String(60), nullable=True)
    status_code = Column(Integer, nullable=False)
    details_json = Column(Text, nullable=True)
