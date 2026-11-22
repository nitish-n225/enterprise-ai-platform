import pytest
import os
from backend.app.services.report_generator import report_generator
from backend.app.models.approval import ApprovalRequest

def test_generate_pdf_report_flow(db_session):
    res = report_generator.generate_pdf_report(
        report_type="executive_summary",
        db=db_session,
        title="Q1 Executive Review",
        generated_by="test_admin"
    )
    assert res["id"] is not None
    assert res["file_format"] == "pdf"
    assert res["file_size_bytes"] > 500
    assert os.path.exists(res["storage_path"])

    # Verify PDF magic bytes
    with open(res["storage_path"], "rb") as f:
        header = f.read(5)
    assert header == b"%PDF-"

def test_generate_csv_report_flow(db_session):
    res = report_generator.generate_csv_report(
        report_type="sales_detailed",
        db=db_session,
        title="Detailed Sales Data",
        generated_by="test_admin"
    )
    assert res["id"] is not None
    assert res["file_format"] == "csv"
    assert res["file_size_bytes"] > 100

    # Verify CSV content
    with open(res["storage_path"], "r", encoding="utf-8") as f:
        first_line = f.readline()
    assert "Order ID" in first_line

def test_reports_api_generate_and_download(client):
    # 1. Generate PDF Report via API
    gen_res = client.post("/api/reports/generate", json={
        "report_type": "regional_breakdown",
        "file_format": "pdf",
        "title": "Global Regional Performance"
    })
    assert gen_res.status_code == 201
    rep_data = gen_res.json()
    rep_id = rep_data["id"]
    assert rep_data["file_format"] == "pdf"

    # 2. List reports
    list_res = client.get("/api/reports")
    assert list_res.status_code == 200
    assert any(r["id"] == rep_id for r in list_res.json())

    # 3. Download report file
    dl_res = client.get(f"/api/reports/download/{rep_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert f'filename="{rep_data["filename"]}"' in dl_res.headers["content-disposition"]
    assert dl_res.content[:5] == b"%PDF-"

def test_approval_staging_via_chat_agent(client):
    chat_res = client.post("/api/chat", json={
        "message": "Please issue a refund of $1,500 for customer Nexus FinTech order #1042."
    })
    assert chat_res.status_code == 200
    data = chat_res.json()
    assert data["intent"] == "HITL_ACTION"
    assert any(t["tool"] == "hitl_approval" for t in data["tool_activity"])
    assert "Approval Required" in data["response"] or "Pending Approval" in data["response"]

def test_approvals_review_lifecycle(client, db_session):
    # 1. Fetch pending approvals
    list_res = client.get("/api/approvals?status_filter=PENDING")
    assert list_res.status_code == 200
    pending = list_res.json()
    assert len(pending) >= 1
    target_id = pending[0]["id"]

    # 2. Approve the action
    review_res = client.post(f"/api/approvals/{target_id}/review", json={
        "decision": "APPROVED",
        "notes": "Verified against customer agreement and approved by CFO.",
        "reviewer": "finance_director"
    })
    assert review_res.status_code == 200
    reviewed_data = review_res.json()
    assert reviewed_data["status"] == "APPROVED"
    assert reviewed_data["reviewed_by"] == "finance_director"

    # 3. Re-reviewing already resolved request should be rejected (HTTP 400)
    conflict_res = client.post(f"/api/approvals/{target_id}/review", json={
        "decision": "REJECTED",
        "notes": "Attempting second review.",
        "reviewer": "finance_director"
    })
    assert conflict_res.status_code == 400
    assert "already been resolved" in conflict_res.json()["detail"]
