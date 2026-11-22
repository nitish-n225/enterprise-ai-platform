from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin

class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf, txt, docx
    file_size_bytes = Column(Integer, nullable=False)
    content_hash = Column(String(64), unique=True, index=True, nullable=False)
    chunk_count = Column(Integer, default=0, nullable=False)
    uploaded_by = Column(String(100), default="system", nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="indexed", nullable=False)  # pending, processing, indexed, failed
    error_message = Column(Text, nullable=True)
    embedding_model = Column(String(100), default="text-embedding-004", nullable=False)
    storage_path = Column(String(500), nullable=True)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base, TimestampMixin):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1, nullable=False)  # Source page number
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0, nullable=False)
    # Stored as serialized JSON string of floats for SQLite, or vector type in PostgreSQL
    embedding_json = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)

    document = relationship("Document", back_populates="chunks")
