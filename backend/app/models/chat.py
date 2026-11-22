from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin, utc_now

class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(200), default="New Operations Inquiry", nullable=False)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)  # SQL_QUERY, BI_ANALYTICS, KNOWLEDGE_SEARCH, HITL_ACTION, GENERAL_QUERY
    tool_calls_json = Column(Text, nullable=True)
    tool_results_json = Column(Text, nullable=True)
    execution_steps_json = Column(Text, nullable=True)
    is_mock = Column(Boolean, default=False, nullable=False)
    model_name = Column(String(100), default="mock-operations-agent", nullable=False)
    latency_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False, index=True)

    session = relationship("ChatSession", back_populates="messages")

