from sqlalchemy import Column, Integer, String, Text, DateTime
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin

class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    report_type = Column(String(50), nullable=False, index=True)  # executive_summary, sales_detailed, regional_breakdown
    file_format = Column(String(20), nullable=False)  # pdf, csv
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=0)
    storage_path = Column(String(500), nullable=False)
    generated_by = Column(String(100), default="system", nullable=False)
    parameters_json = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)

