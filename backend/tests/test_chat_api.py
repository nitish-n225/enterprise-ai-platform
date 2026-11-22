import pytest

def test_chat_endpoint_valid_request(client):
    response = client.post("/api/chat", json={
        "message": "What were our total sales this month?",
        "session_id": "api_test_sess_01"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "api_test_sess_01"
    assert data["intent"] == "SQL_QUERY"
    assert len(data["steps"]) >= 3
    assert len(data["tool_activity"]) >= 1
    assert "response" in data
    assert data["latency_ms"] > 0

def test_chat_endpoint_empty_message(client):
    response = client.post("/api/chat", json={
        "message": "   "
    })
    assert response.status_code == 400

def test_chat_history_and_persistence(client):
    sess_id = "persistence_test_session"
    # Send message 1
    res1 = client.post("/api/chat", json={
        "message": "Find top products",
        "session_id": sess_id
    })
    assert res1.status_code == 200

    # Send message 2 in same session
    res2 = client.post("/api/chat", json={
        "message": "Search company refund policy",
        "session_id": sess_id
    })
    assert res2.status_code == 200

    # Query history
    history_res = client.get(f"/api/chat/history?session_id={sess_id}")
    assert history_res.status_code == 200
    history = history_res.json()
    # Expect 4 messages (2 user + 2 assistant)
    assert len(history) == 4
    roles = [m["role"] for m in history]
    assert roles == ["user", "assistant", "user", "assistant"]

def test_chat_sessions_listing_and_deletion(client):
    sess_id = "session_for_delete_test"
    client.post("/api/chat", json={
        "message": "Hello operations agent",
        "session_id": sess_id
    })

    sessions_res = client.get("/api/chat/sessions")
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    matched = [s for s in sessions if s["session_id"] == sess_id]
    assert len(matched) == 1

    # Delete session
    del_res = client.delete(f"/api/chat/sessions/{sess_id}")
    assert del_res.status_code == 200

    # Verify deleted
    history_res = client.get(f"/api/chat/history?session_id={sess_id}")
    assert len(history_res.json()) == 0

