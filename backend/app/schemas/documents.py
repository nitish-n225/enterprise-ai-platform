from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_type: str
    file_size_bytes: int
    content_hash: str
    chunk_count: int
    uploaded_by: str
    description: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    embedding_model: str
    created_at: datetime

class DocumentChunkItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    chunk_index: int
    page_number: int
    content: str
    token_count: int

class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkItem] = []

class DocumentSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(5, ge=1, le=20)
    document_id: Optional[int] = None

class DocumentSearchResult(BaseModel):
    document_id: int
    document_filename: str
    chunk_index: int
    page_number: int
    content: str
    similarity_score: float
    token_count: int

