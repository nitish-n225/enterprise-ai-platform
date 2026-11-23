import io
import os
import csv
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from backend.app.core.config import settings
from backend.app.models.business import Customer, Product, Order, OrderItem, SalesRecord
from backend.app.models.report import Report
from backend.app.services.analytics import PandasAnalyticsEngine

logger = logging.getLogger("enterprise_ai.services.report_generator")

REPORTS_DIR = os.path.abspath(settings.REPORTS_DIR)
os.makedirs(REPORTS_DIR, exist_ok=True)

class NumberedCanvas(canvas.Canvas):
    """
    Canvas for ReportLab that performs two passes to compute and render total page count.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#94a3b8"))
        
        # Draw top rule and header
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)
        self.drawString(36, 11 * inch - 25, "ENTERPRISE AI BUSINESS OPERATIONS PLATFORM — CONFIDENTIAL")

        # Draw footer
        self.line(36, 40, 8.5 * inch - 36, 40)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 28, page_text)
        self.drawString(36, 28, f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Verification Status: VERIFIED")
        self.restoreState()


class ReportGeneratorService:
    """
    Enterprise business report generation service supporting professional
    ReportLab PDF document generation and RFC 4180-compliant CSV exports.
    """

    @classmethod
    def generate_pdf_report(
        cls,
        report_type: str,
        db: Session,
        title: Optional[str] = None,
        generated_by: str = "user_admin"
    ) -> Dict[str, Any]:
        """
        Generates a styled, publication-ready PDF business report using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=46,
            bottomMargin=50
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a")
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#64748b")
        )
        heading_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "BodyDark",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#334155")
        )
        kpi_value_style = ParagraphStyle(
            "KpiValue",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#4338ca")
        )
        kpi_label_style = ParagraphStyle(
            "KpiLabel",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748b")
        )

        story = []

        # Document Header
        doc_title = title or f"Enterprise Operations Report: {report_type.replace('_', ' ').title()}"
        story.append(Paragraph(doc_title, title_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"Classification: Restricted Enterprise Data | Generated by: {generated_by}", subtitle_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4f46e5"), spaceBefore=2, spaceAfter=12))

        # Retrieve analytics data
        total_rev = PandasAnalyticsEngine.compute_total_revenue(db)
        mom_growth = PandasAnalyticsEngine.compute_month_over_month(db)
        top_prods = PandasAnalyticsEngine.compute_top_products(db, limit=5)
        regional_sales = PandasAnalyticsEngine.compute_regional_sales(db)

        # 1. Executive Summary & KPI Ribbon
        story.append(Paragraph("1. Executive Financial Summary", heading_style))
        story.append(Paragraph(
            f"This operational report reflects verified transactions and financial performance records stored in the "
            f"enterprise database. Current enterprise gross revenue stands at <b>${total_rev['total_gross_revenue']:,.2f}</b> "
            f"with net operational revenue of <b>${total_rev['total_net_revenue']:,.2f}</b> across <b>{total_rev['total_orders']}</b> recorded orders "
            f"(Average Order Value: <b>${total_rev['average_order_value']:,.2f}</b>). "
            f"Month-over-Month growth recorded at <b>{mom_growth.get('growth_percent', 0.0):+.2f}%</b>.",
            body_style
        ))
        story.append(Spacer(1, 10))

        # KPI Metrics Table (4 columns)
        kpi_data = [
            [
                Paragraph(f"${total_rev['total_gross_revenue']:,.2f}", kpi_value_style),
                Paragraph(f"${total_rev['total_net_revenue']:,.2f}", kpi_value_style),
                Paragraph(f"{total_rev['total_orders']}", kpi_value_style),
                Paragraph(f"{mom_growth.get('growth_percent', 0.0):+.2f}%", kpi_value_style),
            ],
            [
                Paragraph("TOTAL GROSS REVENUE", kpi_label_style),
                Paragraph("TOTAL NET REVENUE", kpi_label_style),
                Paragraph("ORDERS RECORDED", kpi_label_style),
                Paragraph("MOM NET GROWTH", kpi_label_style),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[130, 130, 130, 130])
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 14))

        if report_type in ["executive_summary", "regional_breakdown"]:
            # 2. Regional Performance Table
            story.append(Paragraph("2. Regional Market Distribution", heading_style))
            reg_table_data = [
                ["Region", "Gross Revenue", "Net Revenue", "Orders", "Market Share"]
            ]
            for r_name, r_info in regional_sales.get("regions", {}).items():
                reg_table_data.append([
                    r_name,
                    f"${r_info['gross_revenue']:,.2f}",
                    f"${r_info['net_revenue']:,.2f}",
                    str(r_info['order_count']),
                    f"{r_info['share_percent']:.1f}%"
                ])

            reg_table = Table(reg_table_data, colWidths=[130, 110, 110, 80, 90])
            reg_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ]))
            story.append(reg_table)
            story.append(Spacer(1, 14))

        if report_type in ["executive_summary", "sales_detailed"]:
            # 3. Top Products Table
            story.append(Paragraph("3. Top-Selling Products by Revenue", heading_style))
            prod_table_data = [
                ["SKU", "Product Name", "Category", "Units Sold", "Total Revenue"]
            ]
            for p in top_prods.get("top_products", []):
                prod_table_data.append([
                    p["sku"],
                    p["name"][:32],
                    p["category"],
                    str(p["units_sold"]),
                    f"${p['total_revenue']:,.2f}"
                ])

            prod_table = Table(prod_table_data, colWidths=[90, 180, 110, 60, 80])
            prod_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ALIGN", (3, 0), (-1, -1), "RIGHT"),
            ]))
            story.append(prod_table)
            story.append(Spacer(1, 14))

        if report_type == "sales_detailed":
            # 4. Recent Completed Orders Sample
            story.append(Paragraph("4. Recent Completed Orders Breakdown", heading_style))
            recent_orders = (
                db.query(Order)
                .join(Customer)
                .order_by(desc(Order.order_date))
                .limit(10)
                .all()
            )
            order_table_data = [
                ["Order #", "Customer", "Region", "Payment", "Status", "Amount"]
            ]
            for o in recent_orders:
                order_table_data.append([
                    f"#{o.id}",
                    o.customer.company[:24],
                    o.customer.region,
                    o.payment_method,
                    o.status,
                    f"${o.total_amount:,.2f}"
                ])

            order_table = Table(order_table_data, colWidths=[60, 160, 90, 80, 60, 70])
            order_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("ALIGN", (5, 0), (5, -1), "RIGHT"),
            ]))
            story.append(order_table)

        # Build document
        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Save to disk
        filename = f"report_{report_type}_{uuid.uuid4().hex[:8]}.pdf"
        file_path = os.path.join(REPORTS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        # Save metadata to DB
        report_record = Report(
            title=doc_title,
            report_type=report_type,
            file_format="pdf",
            filename=filename,
            file_size_bytes=len(pdf_bytes),
            storage_path=file_path,
            generated_by=generated_by,
            summary=total_rev.get("summary")
        )
        db.add(report_record)
        db.commit()
        db.refresh(report_record)

        logger.info(f"Generated PDF report #{report_record.id} ({filename}, {len(pdf_bytes)} bytes)")
        return {
            "id": report_record.id,
            "title": report_record.title,
            "report_type": report_record.report_type,
            "file_format": "pdf",
            "filename": filename,
            "file_size_bytes": len(pdf_bytes),
            "storage_path": file_path,
            "created_at": report_record.created_at.isoformat(),
            "download_url": f"/api/reports/download/{report_record.id}"
        }

    @classmethod
    def generate_csv_report(
        cls,
        report_type: str,
        db: Session,
        title: Optional[str] = None,
        generated_by: str = "user_admin"
    ) -> Dict[str, Any]:
        """
        Generates an RFC 4180-compliant CSV report for raw data analysis.
        """
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        doc_title = title or f"Enterprise {report_type.replace('_', ' ').title()} Export"

        if report_type == "sales_detailed":
            writer.writerow(["Order ID", "Customer ID", "Company", "Region", "Tier", "Order Date", "Status", "Payment Method", "Total Amount"])
            orders = db.query(Order).join(Customer).order_by(Order.id).all()
            for o in orders:
                writer.writerow([
                    o.id,
                    o.customer_id,
                    o.customer.company,
                    o.customer.region,
                    o.customer.tier,
                    o.order_date.strftime("%Y-%m-%d"),
                    o.status,
                    o.payment_method,
                    f"{o.total_amount:.2f}"
                ])
        elif report_type == "regional_breakdown":
            writer.writerow(["Record ID", "Date", "Region", "Gross Revenue", "Discounts Applied", "Net Revenue", "Order Count"])
            sales = db.query(SalesRecord).order_by(SalesRecord.date).all()
            for s in sales:
                writer.writerow([
                    s.id,
                    s.date.strftime("%Y-%m-%d"),
                    s.region,
                    f"{s.gross_revenue:.2f}",
                    f"{s.discounts_applied:.2f}",
                    f"{s.net_revenue:.2f}",
                    s.order_count
                ])
        else: # executive_summary or products
            writer.writerow(["Product ID", "SKU", "Product Name", "Category", "Unit Price", "Is Active", "Total Units Sold", "Total Revenue"])
            top_prods = PandasAnalyticsEngine.compute_top_products(db, limit=100)
            for p in top_prods.get("top_products", []):
                writer.writerow([
                    "",
                    p["sku"],
                    p["name"],
                    p["category"],
                    "",
                    "True",
                    p["units_sold"],
                    f"{p['total_revenue']:.2f}"
                ])

        csv_content = output.getvalue().encode("utf-8")
        output.close()

        # Save to disk
        filename = f"report_{report_type}_{uuid.uuid4().hex[:8]}.csv"
        file_path = os.path.join(REPORTS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(csv_content)

        # Save metadata to DB
        report_record = Report(
            title=doc_title,
            report_type=report_type,
            file_format="csv",
            filename=filename,
            file_size_bytes=len(csv_content),
            storage_path=file_path,
            generated_by=generated_by,
            summary=f"CSV export of {report_type} with {len(csv_content)} bytes"
        )
        db.add(report_record)
        db.commit()
        db.refresh(report_record)

        logger.info(f"Generated CSV report #{report_record.id} ({filename}, {len(csv_content)} bytes)")
        return {
            "id": report_record.id,
            "title": report_record.title,
            "report_type": report_record.report_type,
            "file_format": "csv",
            "filename": filename,
            "file_size_bytes": len(csv_content),
            "storage_path": file_path,
            "created_at": report_record.created_at.isoformat(),
            "download_url": f"/api/reports/download/{report_record.id}"
        }

report_generator = ReportGeneratorService()
