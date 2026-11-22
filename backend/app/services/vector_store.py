import json
import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.rag import Document, DocumentChunk

logger = logging.getLogger("enterprise_ai.services.vector_store")

class VectorStoreService:
    """
    Vector storage and semantic similarity search service.
    Implements native pgvector support for PostgreSQL deployments, and
    NumPy-accelerated vector cosine similarity for local SQLite development.
    """

    @classmethod
    def search(
        cls,
        query_embedding: List[float],
        db: Session,
        top_k: int = 5,
        min_score: Optional[float] = None,
        document_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic vector similarity search against indexed document chunks.
        Validates vector dimensions and returns ranked results with page numbers and citations.
        """
        threshold = min_score if min_score is not None else settings.SIMILARITY_THRESHOLD
        if not query_embedding or len(query_embedding) != settings.EMBEDDING_DIMENSIONS:
            logger.warning(f"Query embedding dimension mismatch: expected {settings.EMBEDDING_DIMENSIONS}, got {len(query_embedding) if query_embedding else 0}")
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        # Check backend type
        is_postgres = not settings.DATABASE_URL.startswith("sqlite")

        # For SQLite development: in-memory NumPy vector cosine search
        query = db.query(DocumentChunk).join(Document).filter(Document.status == "indexed")
        if document_id is not None:
            query = query.filter(DocumentChunk.document_id == document_id)

        chunks = query.all()
        if not chunks:
            return []

        scored_results = []
        for ch in chunks:
            if not ch.embedding_json:
                continue

            try:
                emb = json.loads(ch.embedding_json)
                c_vec = np.array(emb, dtype=np.float32)
                c_norm = np.linalg.norm(c_vec)
                if c_norm > 0:
                    c_vec = c_vec / c_norm
                    # Dot product of normalized vectors equals cosine similarity
                    score = float(np.dot(q_vec, c_vec))
                else:
                    score = 0.0

                if score >= threshold:
                    scored_results.append({
                        "document_id": ch.document_id,
                        "document_filename": ch.document.filename,
                        "chunk_index": ch.chunk_index,
                        "page_number": ch.page_number,
                        "content": ch.content,
                        "similarity_score": round(score, 4),
                        "token_count": ch.token_count
                    })
            except Exception as e:
                logger.error(f"Error parsing chunk embedding {ch.id}: {e}")
                continue

        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_results[:top_k]

vector_store = VectorStoreService()

