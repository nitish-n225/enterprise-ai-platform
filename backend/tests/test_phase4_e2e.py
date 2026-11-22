import pytest

def test_phase4_end_to_end_verification(client):
    # 1. Test document listing
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) >= 2
    print(f"Listed {len(docs)} seeded documents.")

    # 2. Test semantic search endpoint
    search_resp = client.post("/api/documents/search", json={
        "query": "What is the refund window for standard enterprise software?",
        "top_k": 2
    })
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert len(search_data) > 0
    top_score = search_data[0]["similarity_score"]
    print(f"Search returned {len(search_data)} matching chunk(s). Top score: {top_score:.2f}")
    assert "refund" in search_data[0]["content"].lower()

    # 3. Test Agent Chat with RAG query
    chat_resp = client.post("/api/chat", json={
        "message": "What is the return window and refund process for enterprise software licenses?"
    })
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert any(t["tool"] in ["knowledge_search", "search_knowledge_base"] for t in chat_data["tool_activity"])
    assert "Source:" in chat_data["response"] or "refund" in chat_data["response"].lower()

    # 4. Test Agent Chat with question NOT in docs (insufficient evidence / clean refusal without hallucination)
    unrelated_resp = client.post("/api/chat", json={
        "message": "What is our corporate policy on bringing pet kangaroos to the Tokyo satellite office?"
    })
    assert unrelated_resp.status_code == 200
    unrelated_data = unrelated_resp.json()
    assert "insufficient" in unrelated_data["response"].lower() or "not found" in unrelated_data["response"].lower() or "no matching" in unrelated_data["response"].lower() or "information" in unrelated_data["response"].lower()

    # 5. Test Analytics API
    analytics_resp = client.get("/api/analytics/summary")
    assert analytics_resp.status_code == 200
    assert analytics_resp.json()["total_gross_revenue"] > 0
    print("ALL PHASE 4 END-TO-END VERIFICATION CHECKS PASSED!")
