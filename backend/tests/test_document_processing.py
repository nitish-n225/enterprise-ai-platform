import os
import io
import pytest
from reportlab.pdfgen import canvas
import docx
from backend.app.services.document_processor import DocumentProcessor
from backend.app.models.rag import Document, DocumentChunk

def create_synthetic_pdf(text_page1: str, text_page2: str = "") -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.drawString(100, 750, text_page1)
    if text_page2:
        c.showPage()
        c.drawString(100, 750, text_page2)
    c.save()
    return buffer.getvalue()

def create_synthetic_docx(text: str) -> bytes:
    doc = docx.Document()
    doc.add_paragraph(text)
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()

def test_extract_text_from_pdf():
    pdf_bytes = create_synthetic_pdf(
        "Page 1: Enterprise Data Governance Framework.",
        "Page 2: Retention schedule for financial records."
    )
    # Temporary write
    tmp_path = "tmp_test_doc.pdf"
    with open(tmp_path, "wb") as f:
        f.write(pdf_bytes)

    try:
        pages, err = DocumentProcessor.extract_text(tmp_path, "pdf")
        assert err is None
        assert len(pages) == 2
        assert pages[0]["page_number"] == 1
        assert "Enterprise Data Governance" in pages[0]["text"]
        assert pages[1]["page_number"] == 2
        assert "Retention schedule" in pages[1]["text"]
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_extract_text_from_docx():
    docx_bytes = create_synthetic_docx("Confidential Enterprise Security Standards.")
    tmp_path = "tmp_test_doc.docx"
    with open(tmp_path, "wb") as f:
        f.write(docx_bytes)

    try:
        pages, err = DocumentProcessor.extract_text(tmp_path, "docx")
        assert err is None
        assert len(pages) == 1
        assert "Enterprise Security Standards" in pages[0]["text"]
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_scanned_pdf_reports_ocr_required():
    # Empty PDF with no text drawn
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer)
    c.showPage()
    c.save()
    empty_pdf = buffer.getvalue()

    tmp_path = "tmp_scanned.pdf"
    with open(tmp_path, "wb") as f:
        f.write(empty_pdf)

    try:
        pages, err = DocumentProcessor.extract_text(tmp_path, "pdf")
        assert pages == []
        assert "OCR is required" in err
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

def test_validate_file_rejections():
    # Unsupported extension
    is_valid, err, _ = DocumentProcessor.validate_file("script.py", b"print('hello')")
    assert is_valid is False
    assert "Unsupported file extension" in err

    # Empty file
    is_valid, err, _ = DocumentProcessor.validate_file("empty.txt", b"")
    assert is_valid is False
    assert "empty" in err

    # Oversized file
    big_bytes = b"0" * (16 * 1024 * 1024)
    is_valid, err, _ = DocumentProcessor.validate_file("big.txt", big_bytes)
    assert is_valid is False
    assert "exceeds maximum limit" in err

def test_path_traversal_sanitization():
    unsafe = "../../../etc/passwd.txt"
    safe = DocumentProcessor.sanitize_filename(unsafe)
    assert ".." not in safe
    assert "/" not in safe
    assert "\\" not in safe

def test_duplicate_document_detection(db_session):
    content = b"Single enterprise agreement content for duplication test."
    res1 = DocumentProcessor.process_and_index_file("agreement.txt", content, db_session)
    assert res1["success"] is True

    # Attempt second upload with identical content
    res2 = DocumentProcessor.process_and_index_file("agreement_copy.txt", content, db_session)
    assert res2["success"] is False
    assert res2["status"] == "duplicate"
    assert "Duplicate document detected" in res2["error"]

