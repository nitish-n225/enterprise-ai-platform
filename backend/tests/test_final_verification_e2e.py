import io
import pytest
from backend.app.agent.safe_sql import SafeSQLEngine

def test_e2e_authentication_matrix(client):
    """
    1. Authenticate as admin, analyst, and viewer users.
    Verify valid JWT access token generation and correct RBAC role assignment.
    """
    roles = [
        ("admin", "admin123", "admin"),
        ("analyst", "analyst123", "analyst"),
        ("viewer", "viewer123", "viewer"),
    ]
    for username, pwd, expected_role in roles:
        res = client.post("/api/auth/login", json={
            "username": username,
            "password": pwd
        })
        assert res.status_code == 200, f"Login failed for {username}"
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["role"] == expected_role
        assert data["user"]["username"] == username

    # Verify invalid password rejected
    bad_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "incorrect-password"
    })
    assert bad_res.status_code == 401

def test_e2e_business_analytics(client):
    """
    2. Submit business analytics queries via API and Agent Chat.
    Verify accurate mathematical calculations from actual database records.
    """
    # Summary API
    summary_res = client.get("/api/analytics/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_gross_revenue"] > 10_000_000
    assert summary["total_orders"] >= 100

    # Growth API
    growth_res = client.get("/api/analytics/growth")
    assert growth_res.status_code == 200
    growth = growth_res.json()
    assert "growth_percent" in growth
    assert growth["growth_percent"] > 0

    # Chat interaction for analytics
    chat_res = client.post("/api/chat", json={
        "message": "What were our total sales this month?"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert "response" in chat_data
    assert len(chat_data["response"]) > 0

def test_e2e_safe_sql_execution(client, db_session):
    """
    3. Run safe read-only SQL queries and confirm mutation attempts are blocked.
    """
    # Agent chat triggering safe SQL
    chat_res = client.post("/api/chat", json={
        "message": "Which five products generated the highest revenue?"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert any(t["tool"] in ["safe_sql", "pandas_analytics"] for t in chat_data["tool_activity"])

    # Direct SafeSQLEngine check
    valid_query = "SELECT name, category, unit_price FROM products ORDER BY unit_price DESC LIMIT 5"
    res = SafeSQLEngine.execute_safe_query(valid_query, db_session)
    assert res["success"] is True
    assert res["row_count"] == 5
    assert len(res["data"]) == 5

    # Direct mutation attack rejection
    attack_query = "DELETE FROM products WHERE unit_price > 100"
    attack_res = SafeSQLEngine.execute_safe_query(attack_query, db_session)
    assert attack_res["success"] is False
    assert "Forbidden statement" in attack_res["error"]

def test_e2e_knowledge_base_search_and_citations(client):
    """
    4. Search the document knowledge base and verify citations.
    """
    # Direct vector search endpoint
    search_res = client.post("/api/documents/search", json={
        "query": "What is the refund window for standard enterprise software?",
        "top_k": 3
    })
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) > 0
    assert "refund" in results[0]["content"].lower()

    # Agent Chat RAG search
    chat_res = client.post("/api/chat", json={
        "message": "What is the return window and refund process for enterprise software licenses?"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert any(t["tool"] in ["knowledge_search", "search_knowledge_base"] for t in chat_data["tool_activity"])
    assert "refund" in chat_data["response"].lower() or "source" in chat_data["response"].lower()

def test_e2e_report_generation_and_download(client):
    """
    5. Generate both PDF and CSV reports and verify file integrity.
    """
    # Generate PDF
    pdf_res = client.post("/api/reports/generate", json={
        "report_type": "executive_summary",
        "file_format": "pdf",
        "title": "E2E Smoke Test Executive Summary"
    })
    assert pdf_res.status_code == 201
    pdf_data = pdf_res.json()
    pdf_id = pdf_data["id"]

    # Download PDF and verify magic bytes
    dl_pdf = client.get(f"/api/reports/download/{pdf_id}")
    assert dl_pdf.status_code == 200
    assert dl_pdf.headers["content-type"] == "application/pdf"
    assert dl_pdf.content[:5] == b"%PDF-"

    # Generate CSV
    csv_res = client.post("/api/reports/generate", json={
        "report_type": "sales_detailed",
        "file_format": "csv",
        "title": "E2E Smoke Test Sales Ledger"
    })
    assert csv_res.status_code == 201
    csv_data = csv_res.json()
    csv_id = csv_data["id"]

    # Download CSV and verify format
    dl_csv = client.get(f"/api/reports/download/{csv_id}")
    assert dl_csv.status_code == 200
    assert "text/csv" in dl_csv.headers["content-type"]
    assert b"Order ID" in dl_csv.content or b"order" in dl_csv.content.lower()

def test_e2e_hitl_action_and_approvals(client):
    """
    6. Submit high-impact action, verify approval requirement, and review via admin.
    """
    # 1. Trigger HITL action via chat
    chat_res = client.post("/api/chat", json={
        "message": "Please issue a refund of $2,400 for customer Global Logistics order #2055."
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["intent"] == "HITL_ACTION"
    assert any(t["tool"] == "hitl_approval" for t in chat_data["tool_activity"])

    # 2. Verify staged in pending approvals queue
    app_res = client.get("/api/approvals?status_filter=PENDING")
    assert app_res.status_code == 200
    pending_items = app_res.json()
    assert len(pending_items) >= 1
    target_id = pending_items[0]["id"]

    # 3. Admin user logs in and approves
    admin_login = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]

    review_res = client.post(f"/api/approvals/{target_id}/review", json={
        "decision": "APPROVED",
        "reviewer": "admin",
        "notes": "Verified by operations lead."
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"

def test_e2e_audit_logging_and_unauthorized_rejections(client):
    """
    7. Verify audit logs record events and unauthorized actions are blocked.
    """
    # 1. Inspect audit logs
    audit_res = client.get("/api/audit")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1

    stats_res = client.get("/api/audit/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total_events"] >= 1

    # 2. Viewer user login
    viewer_login = client.post("/api/auth/login", json={"username": "viewer", "password": "viewer123"})
    viewer_token = viewer_login.json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # 3. Viewer attempts admin user list -> 403 Forbidden
    forbidden_users = client.get("/api/auth/users", headers=viewer_headers)
    assert forbidden_users.status_code == 403

    # 4. Viewer attempts report generation -> 403 Forbidden
    forbidden_report = client.post("/api/reports/generate", json={
        "report_type": "executive_summary",
        "file_format": "pdf",
        "title": "Unauthorized Report"
    }, headers=viewer_headers)
    assert forbidden_report.status_code == 403

    # 5. Unauthenticated profile access -> 401 Unauthorized
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401
