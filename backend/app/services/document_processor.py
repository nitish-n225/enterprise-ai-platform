import os
import re
import uuid
import hashlib
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
from sqlalchemy.orm import Session
from pypdf import PdfReader
import docx
from backend.app.core.config import settings
from backend.app.models.rag import Document, DocumentChunk
from backend.app.services.embeddings import embedding_service

logger = logging.getLogger("enterprise_ai.services.document_processor")

class DocumentProcessor:
    """
    Enterprise document ingestion and indexing pipeline.
    Validates file integrity, enforces size limits, extracts text across PDF/TXT/DOCX,
    preserves page metadata, handles OCR edge cases, and generates vector embeddings.
    """

    ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx"}
    MAGIC_SIGNATURES = {
        ".pdf": [b"%PDF-"],
        ".docx": [b"PK\x03\x04"]
    }

    @classmethod
    def sanitize_filename(cls, original_filename: str) -> str:
        """
        Strips path traversal sequences and dangerous characters.
        """
        clean_name = os.path.basename(original_filename)
        clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", clean_name)
        return clean_name or f"document_{uuid.uuid4().hex[:8]}"

    @classmethod
    def validate_file(cls, filename: str, content_bytes: bytes) -> Tuple[bool, Optional[str], str]:
        """
        Validates file extension, magic headers, and file size limits.
        Returns: (is_valid, error_message, file_type)
        """
        ext = Path(filename).suffix.lower()
        if ext not in cls.ALLOWED_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Permitted formats: PDF, TXT, DOCX.", ""

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(content_bytes) > max_bytes:
            return False, f"File size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB.", ""

        if len(content_bytes) == 0:
            return False, "Uploaded file is empty (0 bytes).", ""

        # Validate magic bytes
        if ext in cls.MAGIC_SIGNATURES:
            signatures = cls.MAGIC_SIGNATURES[ext]
            if not any(content_bytes.startswith(sig) for sig in signatures):
                return False, f"File content does not match expected {ext.upper()} format signature.", ""

        return True, None, ext.replace(".", "")

    @classmethod
    def extract_text(cls, file_path: str, file_type: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        """
        Extracts text while preserving page numbers.
        Returns: (pages_data, error_if_any) where pages_data is [{'page_number': int, 'text': str}]
        """
        pages_data = []

        try:
            if file_type == "pdf":
                reader = PdfReader(file_path)
                total_text_length = 0

                for idx, page in enumerate(reader.pages):
                    raw_text = page.extract_text() or ""
                    cleaned = cls._normalize_text(raw_text)
                    total_text_length += len(cleaned)
                    if cleaned:
                        pages_data.append({
                            "page_number": idx + 1,
                            "text": cleaned
                        })

                # Check for scanned PDF without text
                if total_text_length == 0 or not pages_data:
                    return [], "Scanned PDF detected without extractable text. OCR is required."

            elif file_type == "docx":
                doc = docx.Document(file_path)
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                full_text = cls._normalize_text("\n\n".join(paragraphs))
                if not full_text:
                    return [], "DOCX document contains no extractable text."
                pages_data.append({
                    "page_number": 1,
                    "text": full_text
                })

            elif file_type == "txt":
                with open(file_path, "rb") as f:
                    raw_bytes = f.read()

                # Attempt decoding
                for encoding in ["utf-8", "utf-8-sig", "latin-1"]:
                    try:
                        decoded = raw_bytes.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    return [], "Unable to decode TXT file with standard encodings."

                cleaned = cls._normalize_text(decoded)
                if not cleaned:
                    return [], "TXT file contains no text."
                pages_data.append({
                    "page_number": 1,
                    "text": cleaned
                })

            return pages_data, None

        except Exception as e:
            logger.error(f"Text extraction failed on {file_path}: {e}")
            return [], f"Extraction failure: {str(e)}"

    @classmethod
    def _normalize_text(cls, text: str) -> str:
        """
        Normalizes unicode characters, whitespace, and line breaks.
        """
        if not text:
            return ""
        # Replace non-breaking spaces and tabs
        text = text.replace("\xa0", " ").replace("\t", " ")
        # Standardize line breaks
        text = re.sub(r"\r\n|\r", "\n", text)
        # Collapse multi-newlines
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Collapse multiple spaces
        text = re.sub(r" {2,}", " ", text)
        return text.strip()

    @classmethod
    def chunk_document(
        cls,
        pages_data: List[Dict[str, Any]],
        chunk_size: int = None,
        chunk_overlap: int = None
    ) -> List[Dict[str, Any]]:
        """
        Splits extracted pages into overlapping chunks while preserving page numbers.
        """
        c_size = chunk_size or settings.CHUNK_SIZE
        c_overlap = chunk_overlap or settings.CHUNK_OVERLAP

        chunks = []
        global_chunk_idx = 0

        for page in pages_data:
            page_num = page["page_number"]
            page_text = page["text"]

            # Split into paragraphs first to avoid splitting mid-sentence where possible
            paragraphs = page_text.split("\n\n")
            current_chunk = ""

            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue

                if len(current_chunk) + len(para) <= c_size:
                    current_chunk += ("\n\n" if current_chunk else "") + para
                else:
                    if current_chunk:
                        chunks.append({
                            "chunk_index": global_chunk_idx,
                            "page_number": page_num,
                            "content": current_chunk.strip(),
                            "token_count": len(current_chunk.split())
                        })
                        global_chunk_idx += 1
                        # Retain overlap from end of current chunk
                        current_chunk = current_chunk[-c_overlap:] + " " + para if c_overlap < len(current_chunk) else para
                    else:
                        # Para itself is longer than chunk size -> hard split
                        for i in range(0, len(para), c_size - c_overlap):
                            sub = para[i:i + c_size].strip()
                            if sub:
                                chunks.append({
                                    "chunk_index": global_chunk_idx,
                                    "page_number": page_num,
                                    "content": sub,
                                    "token_count": len(sub.split())
                                })
                                global_chunk_idx += 1
                        current_chunk = ""

            if current_chunk.strip():
                chunks.append({
                    "chunk_index": global_chunk_idx,
                    "page_number": page_num,
                    "content": current_chunk.strip(),
                    "token_count": len(current_chunk.split())
                })
                global_chunk_idx += 1

        return chunks

    @classmethod
    def process_and_index_file(
        cls,
        original_filename: str,
        content_bytes: bytes,
        db: Session,
        uploaded_by: str = "system",
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Complete end-to-end ingestion pipeline:
        Validation -> Hash check -> Storage -> Extraction -> Chunking -> Embedding -> Indexing.
        """
        # 1. Validate
        is_valid, err_msg, file_type = cls.validate_file(original_filename, content_bytes)
        if not is_valid:
            return {"success": False, "error": err_msg, "status": "failed", "document": None}

        # 2. Check for duplicate content hash
        content_hash = hashlib.sha256(content_bytes).hexdigest()
        existing_doc = db.query(Document).filter(Document.content_hash == content_hash).first()
        if existing_doc:
            return {
                "success": False,
                "error": f"Duplicate document detected: '{existing_doc.filename}' already exists with identical content hash.",
                "status": "duplicate",
                "document": existing_doc
            }

        # 3. Secure disk storage
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        safe_base = cls.sanitize_filename(original_filename)
        safe_filename = f"{uuid.uuid4().hex[:12]}_{safe_base}"
        storage_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

        with open(storage_path, "wb") as f:
            f.write(content_bytes)

        # 4. Create Document record in DB with pending status
        doc = Document(
            filename=safe_base,
            file_type=file_type,
            file_size_bytes=len(content_bytes),
            content_hash=content_hash,
            chunk_count=0,
            uploaded_by=uploaded_by,
            description=description or f"Uploaded {file_type.upper()} enterprise document",
            status="processing",
            embedding_model=embedding_service.active_model,
            storage_path=storage_path
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 5. Extract text
        pages_data, extraction_err = cls.extract_text(storage_path, file_type)
        if extraction_err or not pages_data:
            doc.status = "failed"
            doc.error_message = extraction_err or "No text could be extracted from document."
            db.commit()
            return {
                "success": False,
                "error": doc.error_message,
                "status": "failed",
                "document": doc
            }

        # 6. Chunk text
        chunk_dicts = cls.chunk_document(pages_data)
        if not chunk_dicts:
            doc.status = "failed"
            doc.error_message = "Document produced zero chunks after processing."
            db.commit()
            return {"success": False, "error": doc.error_message, "status": "failed", "document": doc}

        # 7. Generate vector embeddings in batch
        texts_to_embed = [c["content"] for c in chunk_dicts]
        embeddings = embedding_service.embed_batch(texts_to_embed)

        # 8. Persist chunks
        db_chunks = []
        for c_data, emb in zip(chunk_dicts, embeddings):
            chunk_obj = DocumentChunk(
                document_id=doc.id,
                chunk_index=c_data["chunk_index"],
                page_number=c_data["page_number"],
                content=c_data["content"],
                token_count=c_data["token_count"],
                embedding_json=json.dumps(emb)
            )
            db_chunks.append(chunk_obj)

        db.add_all(db_chunks)
        doc.chunk_count = len(db_chunks)
        doc.status = "indexed"
        doc.error_message = None
        db.commit()
        db.refresh(doc)

        logger.info(f"Successfully indexed document '{doc.filename}' (ID: {doc.id}, Chunks: {doc.chunk_count})")
        return {
            "success": True,
            "document": doc,
            "status": "indexed",
            "chunk_count": doc.chunk_count,
            "error": None
        }

document_processor = DocumentProcessor()

