import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import pandas as pd
from backend.app.models.business import Customer, Product, Order, OrderItem, SalesRecord

logger = logging.getLogger("enterprise_ai.services.business_data")

class BusinessDataService:
    """
    Business data access and querying layer over operational enterprise entities.
    Compatible with SQLite (local development) and PostgreSQL (production).
    """

    ALLOWED_TABLES = {
        "customers": "Customer master records with region and tier (Enterprise, Mid-Market, SMB)",
        "products": "Enterprise software, hardware appliances, support plans, and consulting services",
        "orders": "Historical customer orders with date, status, payment method, and total amount",
        "order_items": "Line items for orders detailing product_id, quantity, unit price, and discount",
        "sales_records": "Aggregated daily/monthly financial records by region and sales channel"
    }

    TABLE_COLUMNS = {
        "customers": ["id", "name", "email", "company", "region", "tier", "status", "created_at"],
        "products": ["id", "sku", "name", "category", "unit_price", "cost_price", "stock_quantity", "is_active"],
        "orders": ["id", "order_number", "customer_id", "order_date", "status", "total_amount", "payment_method"],
        "order_items": ["id", "order_id", "product_id", "quantity", "unit_price", "discount_percent", "subtotal"],
        "sales_records": ["id", "date", "region", "channel", "gross_revenue", "net_revenue", "order_count", "customer_count"]
    }

    @classmethod
    def get_schema_summary(cls) -> Dict[str, Any]:
        """
        Returns allowed tables and their column definitions for safe SQL generation.
        """
        return {
            "tables": cls.ALLOWED_TABLES,
            "columns": cls.TABLE_COLUMNS
        }

    @staticmethod
    def get_orders_dataframe(db: Session) -> pd.DataFrame:
        """
        Loads all completed orders into a Pandas DataFrame.
        """
        orders = db.query(Order).all()
        if not orders:
            return pd.DataFrame(columns=["id", "order_number", "customer_id", "order_date", "status", "total_amount", "payment_method"])
        data = [
            {
                "id": o.id,
                "order_number": o.order_number,
                "customer_id": o.customer_id,
                "order_date": o.order_date,
                "status": o.status,
                "total_amount": o.total_amount,
                "payment_method": o.payment_method
            }
            for o in orders
        ]
        df = pd.DataFrame(data)
        df["order_date"] = pd.to_datetime(df["order_date"])
        return df

    @staticmethod
    def get_sales_records_dataframe(db: Session) -> pd.DataFrame:
        """
        Loads all sales records into a Pandas DataFrame.
        """
        records = db.query(SalesRecord).order_by(SalesRecord.date.asc()).all()
        if not records:
            return pd.DataFrame(columns=["id", "date", "region", "channel", "gross_revenue", "net_revenue", "order_count", "customer_count"])
        data = [
            {
                "id": r.id,
                "date": r.date,
                "region": r.region,
                "channel": r.channel,
                "gross_revenue": r.gross_revenue,
                "net_revenue": r.net_revenue,
                "order_count": r.order_count,
                "customer_count": r.customer_count
            }
            for r in records
        ]
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["date"])
        return df

    @staticmethod
    def get_products_dataframe(db: Session) -> pd.DataFrame:
        """
        Loads all active products into a Pandas DataFrame.
        """
        prods = db.query(Product).all()
        if not prods:
            return pd.DataFrame(columns=["id", "sku", "name", "category", "unit_price", "cost_price", "stock_quantity", "is_active"])
        data = [
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "unit_price": p.unit_price,
                "cost_price": p.cost_price,
                "stock_quantity": p.stock_quantity,
                "is_active": p.is_active
            }
            for p in prods
        ]
        return pd.DataFrame(data)

