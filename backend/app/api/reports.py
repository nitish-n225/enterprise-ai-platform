import os
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models.report import Report
from backend.app.models.audit import AuditLog
from backend.app.schemas.reports import ReportGenerateRequest, ReportResponse
from backend.app.services.report_generator import report_generator

logger = logging.getLogger("enterprise_ai.api.reports")

router = APIRouter(prefix="/reports", tags=["Business Reports"])

@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    """
    Triggers deterministic report generation in PDF or CSV format.
    """
    valid_types = ["executive_summary", "sales_detailed", "regional_breakdown"]
    if payload.report_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid report_type '{payload.report_type}'. Allowed types: {', '.join(valid_types)}"
        )

    fmt = payload.file_format.lower()
    if fmt not in ["pdf", "csv"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file_format '{payload.file_format}'. Allowed formats: 'pdf' or 'csv'"
        )

    if fmt == "pdf":
        result = report_generator.generate_pdf_report(
            report_type=payload.report_type,
            db=db,
            title=payload.title,
            generated_by="user_admin"
        )
    else:
        result = report_generator.generate_csv_report(
            report_type=payload.report_type,
            db=db,
            title=payload.title,
            generated_by="user_admin"
        )

    # Record audit log
    audit = AuditLog(
        user_id="user_admin",
        user_role="admin",
        ip_address="127.0.0.1",
        endpoint="/api/reports/generate",
        action="REPORT_GENERATED",
        resource_type="Report",
        resource_id=str(result["id"]),
        status_code=201,
        details_json=f'{{"report_type": "{payload.report_type}", "format": "{fmt}", "filename": "{result["filename"]}"}}'
    )
    db.add(audit)
    db.commit()

    report = db.query(Report).filter(Report.id == result["id"]).first()
    resp = ReportResponse.model_validate(report)
    resp.download_url = f"/api/reports/download/{report.id}"
    return resp

@router.get("", response_model=List[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    """
    Lists all generated enterprise reports.
    """
    reports = db.query(Report).order_by(desc(Report.created_at)).all()
    resp_list = []
    for r in reports:
        item = ReportResponse.model_validate(r)
        item.download_url = f"/api/reports/download/{r.id}"
        resp_list.append(item)
    return resp_list

@router.get("/download/{report_id}")
def download_report(report_id: int, db: Session = Depends(get_db)):
    """
    Downloads a previously generated business report with RFC 4180 attachment headers.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail=f"Report #{report_id} not found.")

    if not os.path.exists(report.storage_path):
        raise HTTPException(status_code=404, detail="Physical report file not found on disk.")

    media_type = "application/pdf" if report.file_format == "pdf" else "text/csv"
    return FileResponse(
        path=report.storage_path,
        media_type=media_type,
        filename=report.filename,
        headers={
            "Content-Disposition": f'attachment; filename="{report.filename}"',
            "X-Report-Type": report.report_type
        }
    )

@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """
    Deletes a report record and its file on disk.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if os.path.exists(report.storage_path):
        try:
            os.remove(report.storage_path)
        except Exception as e:
            logger.warning(f"Could not remove file on disk {report.storage_path}: {e}")

    db.delete(report)
    db.commit()
    return {"message": f"Report #{report_id} deleted successfully.", "id": report_id}

