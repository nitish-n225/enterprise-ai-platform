from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User business inquiry")
    session_id: Optional[str] = Field(None, max_length=64, description="Optional persistent session UUID")

class ToolActivityItem(BaseModel):
    tool: str
    status: str
    summary: str
    data_preview: Optional[Any] = None

class ChatResponse(BaseModel):
    session_id: str
    message_id: int
    response: str
    intent: str
    steps: List[str]
    tool_activity: List[Dict[str, Any]]
    is_mock: bool
    model_name: str
    latency_ms: float
    created_at: datetime

class ChatMessageItem(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    intent: Optional[str] = None
    steps: List[str] = []
    tool_activity: List[Dict[str, Any]] = []
    is_mock: bool = False
    model_name: str
    created_at: datetime

class ChatSessionSummary(BaseModel):
    session_id: str
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime

