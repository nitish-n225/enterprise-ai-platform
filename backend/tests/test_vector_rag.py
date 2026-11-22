import io
import pytest
import numpy as np
from backend.app.services.embeddings import embedding_service
from backend.app.services.vector_store import VectorStoreService
from backend.app.services.document_processor import DocumentProcessor
from backend.app.agent.tools import EnterpriseTools
from backend.app.models.rag import Document, DocumentChunk

def test_embedding_service_dimensions_and_normalization():
    vec = embedding_service.embed_text("Enterprise SLA response times.")
    assert len(vec) == 768
    norm = np.linalg.norm(vec)
    assert pytest.approx(norm, 0.001) == 1.0

def test_vector_search_relevance(db_session):
    # Search for refund terms
    query_vec = embedding_service.embed_text("How many days do I have to refund cloud software subscriptions?")
    results = VectorStoreService.search(query_vec, db_session, top_k=3, min_score=0.1)
    assert len(results) >= 1
    assert "Enterprise_Refund_Policy_2026.txt" in [r["document_filename"] for r in results]
    assert results[0]["similarity_score"] > 0
    assert results[0]["page_number"] >= 1

def test_rag_tool_insufficient_evidence_behavior(db_session):
    # Completely unrelated query with no match in enterprise documents
    res = EnterpriseTools.search_knowledge_base("recipe for baking chocolate chip cookies on mars", db_session)
    assert res["success"] is True
    assert res["insufficient_evidence"] is True
    assert len(res["data"]) == 0

def test_rag_tool_grounded_citation(db_session):
    res = EnterpriseTools.search_knowledge_base("refund policy cancellation", db_session)
    assert res["success"] is True
    assert res["insufficient_evidence"] is False
    assert len(res["data"]) >= 1
    top = res["data"][0]
    assert "Enterprise_Refund_Policy_2026.txt" in top["document_filename"]
    assert top["page_number"] == 1

def test_documents_api_workflow(client):
    # 1. Upload TXT file via API
    file_content = b"ENTERPRISE AI PROCUREMENT POLICY 2026.\nAll cloud vendors must adhere to ISO 27001 standards."
    files = {"file": ("Procurement_Policy_2026.txt", io.BytesIO(file_content), "text/plain")}
    data = {"description": "Enterprise vendor security requirements"}

    upload_res = client.post("/api/documents/upload", files=files, data=data)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    doc_id = doc_data["id"]
    assert doc_data["filename"] == "Procurement_Policy_2026.txt"
    assert doc_data["status"] == "indexed"
    assert doc_data["chunk_count"] >= 1

    # 2. List documents
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    ids = [d["id"] for d in list_res.json()]
    assert doc_id in ids

    # 3. Document details with chunks
    detail_res = client.get(f"/api/documents/{doc_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["chunks"]) >= 1
    assert "ISO 27001" in detail["chunks"][0]["content"]

    # 4. Search document
    search_res = client.post("/api/documents/search", json={"query": "ISO 27001 vendor standards", "top_k": 3})
    assert search_res.status_code == 200
    matches = search_res.json()
    assert len(matches) >= 1
    assert matches[0]["document_id"] == doc_id

    # 5. Delete document
    del_res = client.delete(f"/api/documents/{doc_id}")
    assert del_res.status_code == 200

    # 6. Verify deleted
    get_res = client.get(f"/api/documents/{doc_id}")
    assert get_res.status_code == 404

