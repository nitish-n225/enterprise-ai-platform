import pytest
from backend.app.agent.orchestrator import AgentOrchestrator, AgentState

def test_orchestrator_initialization():
    orch = AgentOrchestrator()
    assert orch.workflow is not None

def test_orchestrator_execution_sql_flow(db_session):
    orch = AgentOrchestrator()
    state = orch.run(
        user_prompt="Find top five products by revenue",
        session_id="test_sess_001",
        db=db_session
    )
    assert state["intent"] == "SQL_QUERY"
    assert len(state["steps"]) >= 4
    assert "safe_sql" in state["tool_calls"]
    assert len(state["tool_results"]) >= 1
    assert state["final_response"] is not None
    assert state["iteration_count"] <= 5

def test_orchestrator_execution_rag_flow(db_session):
    orch = AgentOrchestrator()
    state = orch.run(
        user_prompt="What is our customer refund policy?",
        session_id="test_sess_002",
        db=db_session
    )
    assert state["intent"] == "KNOWLEDGE_SEARCH"
    assert "knowledge_search" in state["tool_calls"]
    assert len(state["tool_results"]) >= 1
    assert "SIMULATED RESPONSE - MOCK MODE" in state["final_response"] or "refund" in state["final_response"].lower()

def test_orchestrator_iteration_limit_enforcement(db_session):
    orch = AgentOrchestrator()
    # Test that iteration count never exceeds 5
    state = orch.run(
        user_prompt="Compare sales and explain variances",
        session_id="test_sess_limit",
        db=db_session
    )
    assert state["iteration_count"] <= 5

