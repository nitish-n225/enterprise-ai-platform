import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.models.rag import Document, DocumentChunk
from backend.app.models.audit import AuditLog
from backend.app.services.document_processor import document_processor
from backend.app.services.embeddings import embedding_service
from backend.app.services.vector_store import VectorStoreService
from backend.app.schemas.documents import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentSearchRequest,
    DocumentSearchResult,
    DocumentChunkItem
)

logger = logging.getLogger("enterprise_ai.api.documents")

router = APIRouter(prefix="/documents", tags=["Knowledge Base & Documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Secure document ingestion endpoint.
    Validates file format (PDF, TXT, DOCX), checks magic headers, enforces size limits,
    extracts text, generates 768-dim embeddings, and stores chunks with page numbers.
    """
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    result = document_processor.process_and_index_file(
        original_filename=file.filename or "uploaded_file.txt",
        content_bytes=content_bytes,
        db=db,
        uploaded_by="user_admin",
        description=description
    )

    if not result["success"]:
        if result.get("status") == "duplicate":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=result["error"]
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )

    doc = result["document"]

    # Record audit log
    audit = AuditLog(
        user_id="user_admin",
        user_role="admin",
        ip_address="127.0.0.1",
        endpoint="/api/documents/upload",
        action="DOCUMENT_UPLOAD",
        resource_type="Document",
        resource_id=str(doc.id),
        status_code=201,
        details_json=f'{{"filename": "{doc.filename}", "chunks": {doc.chunk_count}, "size_bytes": {doc.file_size_bytes}}}'
    )
    db.add(audit)
    db.commit()

    return doc

@router.get("", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """
    Returns all indexed documents with metadata.
    """
    docs = db.query(Document).order_by(desc(Document.created_at)).all()
    return docs

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(document_id: int, db: Session = Depends(get_db)):
    """
    Returns document details and its indexed chunks.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document #{document_id} not found.")

    chunks = [
        DocumentChunkItem(
            id=ch.id,
            chunk_index=ch.chunk_index,
            page_number=ch.page_number,
            content=ch.content,
            token_count=ch.token_count
        )
        for ch in doc.chunks
    ]

    resp = DocumentDetailResponse.model_validate(doc)
    resp.chunks = chunks
    return resp

@router.get("/{document_id}/status")
def get_document_status(document_id: int, db: Session = Depends(get_db)):
    """
    Polls the processing status of a document.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message
    }

@router.post("/search", response_model=List[DocumentSearchResult])
def search_documents(payload: DocumentSearchRequest, db: Session = Depends(get_db)):
    """
    Executes semantic vector similarity search against the document knowledge base.
    """
    query_vec = embedding_service.embed_text(payload.query)
    results = VectorStoreService.search(
        query_embedding=query_vec,
        db=db,
        top_k=payload.top_k,
        min_score=None,
        document_id=payload.document_id
    )
    return results

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """
    Deletes a document, its indexed chunks, and removes the physical file from disk.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove physical file if exists
    if doc.storage_path and os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception as e:
            logger.warning(f"Failed to delete physical file {doc.storage_path}: {e}")

    filename = doc.filename
    chunk_count = doc.chunk_count
    db.delete(doc)

    audit = AuditLog(
        user_id="user_admin",
        user_role="admin",
        ip_address="127.0.0.1",
        endpoint=f"/api/documents/{document_id}",
        action="DOCUMENT_DELETE",
        resource_type="Document",
        resource_id=str(document_id),
        status_code=200,
        details_json=f'{{"filename": "{filename}", "deleted_chunks": {chunk_count}}}'
    )
    db.add(audit)
    db.commit()

    return {"message": f"Document #{document_id} ('{filename}') and {chunk_count} chunks deleted successfully."}

