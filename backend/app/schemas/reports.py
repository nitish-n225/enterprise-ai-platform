from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ReportGenerateRequest(BaseModel):
    report_type: str = Field("executive_summary", description="Type: executive_summary, sales_detailed, regional_breakdown")
    file_format: str = Field("pdf", description="Format: pdf or csv")
    title: Optional[str] = Field(None, description="Custom title for the generated report")

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    report_type: str
    file_format: str
    filename: str
    file_size_bytes: int
    created_at: datetime
    summary: Optional[str] = None
    download_url: Optional[str] = None
