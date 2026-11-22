import time
import json
import uuid
import re
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.models.audit import AuditLog
from backend.app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessageItem,
    ChatSessionSummary,
)
from backend.app.agent.orchestrator import orchestrator

logger = logging.getLogger("enterprise_ai.api.chat")

router = APIRouter(prefix="/chat", tags=["Agent Operations Chat"])

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def sanitize_user_input(text: str) -> str:
    """
    Sanitizes user input to prevent HTML/script injection and control characters.
    """
    cleaned = re.sub(r"[<>]", "", text)
    return cleaned.strip()

@router.post("", response_model=ChatResponse)
def execute_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Primary agent operations chat endpoint.
    Orchestrates LangGraph workflow across classification, planning, tool dispatch, and synthesis.
    """
    start_time = time.time()
    clean_message = sanitize_user_input(payload.message)
    if not clean_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty after sanitization."
        )

    # 1. Resolve or create chat session
    session_id = payload.session_id
    if not session_id:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        title = clean_message[:45] + ("..." if len(clean_message) > 45 else "")
        session = ChatSession(session_id=session_id, title=title)
        db.add(session)
        db.flush()
    else:
        session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if not session:
            title = clean_message[:45] + ("..." if len(clean_message) > 45 else "")
            session = ChatSession(session_id=session_id, title=title)
            db.add(session)
            db.flush()

    # 2. Record User Message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=clean_message,
        is_mock=False,
        model_name="user"
    )
    db.add(user_msg)
    db.flush()

    # 3. Execute LangGraph Orchestrator
    try:
        agent_output = orchestrator.run(
            user_prompt=clean_message,
            session_id=session_id,
            db=db
        )
    except Exception as e:
        logger.error(f"Agent orchestration failed on prompt '{clean_message}': {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent orchestration execution error: {str(e)}"
        )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    # 4. Record Assistant Response in Persistent DB
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=agent_output.get("final_response", ""),
        intent=agent_output.get("intent", "GENERAL_QUERY"),
        tool_calls_json=json.dumps(agent_output.get("tool_calls", [])),
        tool_results_json=json.dumps(agent_output.get("tool_results", [])),
        execution_steps_json=json.dumps(agent_output.get("steps", [])),
        is_mock=agent_output.get("is_mock", True),
        model_name=agent_output.get("model_name", "mock-operations-agent"),
        latency_ms=elapsed_ms
    )
    session.updated_at = utc_now()
    db.add(assistant_msg)

    # 5. Record Audit Log
    audit = AuditLog(
        user_id="user_guest",
        user_role="analyst",
        ip_address="127.0.0.1",
        endpoint="/api/chat",
        action="AGENT_EXECUTION",
        resource_type="ChatSession",
        resource_id=session_id,
        status_code=200,
        details_json=json.dumps({
            "intent": agent_output.get("intent"),
            "tools_called": agent_output.get("tool_calls"),
            "is_mock": agent_output.get("is_mock"),
            "latency_ms": elapsed_ms
        })
    )
    db.add(audit)
    db.commit()
    db.refresh(assistant_msg)

    return ChatResponse(
        session_id=session_id,
        message_id=assistant_msg.id,
        response=assistant_msg.content,
        intent=assistant_msg.intent or "GENERAL_QUERY",
        steps=agent_output.get("steps", []),
        tool_activity=agent_output.get("tool_results", []),
        is_mock=assistant_msg.is_mock,
        model_name=assistant_msg.model_name,
        latency_ms=elapsed_ms,
        created_at=assistant_msg.created_at
    )

@router.get("/history", response_model=List[ChatMessageItem])
def get_chat_history(
    session_id: Optional[str] = Query(None, description="Session ID to filter messages"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns message history with structured tool execution steps and metadata.
    """
    query = db.query(ChatMessage)
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    query = query.order_by(ChatMessage.created_at.asc()).limit(limit)

    messages = query.all()
    results = []
    for m in messages:
        steps = json.loads(m.execution_steps_json) if m.execution_steps_json else []
        tool_results = json.loads(m.tool_results_json) if m.tool_results_json else []
        results.append(ChatMessageItem(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            intent=m.intent,
            steps=steps,
            tool_activity=tool_results,
            is_mock=m.is_mock,
            model_name=m.model_name,
            created_at=m.created_at
        ))
    return results

@router.get("/sessions", response_model=List[ChatSessionSummary])
def get_chat_sessions(db: Session = Depends(get_db)):
    """
    Returns all active chat sessions sorted by recent activity.
    """
    sessions = db.query(ChatSession).order_by(desc(ChatSession.updated_at)).limit(30).all()
    results = []
    for s in sessions:
        results.append(ChatSessionSummary(
            session_id=s.session_id,
            title=s.title,
            message_count=len(s.messages),
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return results

@router.delete("/sessions/{session_id}")
def delete_chat_session(session_id: str, db: Session = Depends(get_db)):
    """
    Deletes a chat session and associated messages.
    """
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    db.delete(session)
    db.commit()
    return {"message": f"Session {session_id} deleted successfully."}

