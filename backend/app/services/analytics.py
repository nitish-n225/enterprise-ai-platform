import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import pandas as pd
import numpy as np
from backend.app.services.business_data import BusinessDataService
from backend.app.models.business import Customer, Product, Order, OrderItem, SalesRecord

logger = logging.getLogger("enterprise_ai.services.analytics")

class PandasAnalyticsEngine:
    """
    Deterministic business intelligence and financial analytics engine powered by Pandas.
    Computes accurate revenue metrics, Month-over-Month (MoM) growth, top product rankings,
    regional sales distribution, and customer cohort values directly from the database.
    """

    @classmethod
    def compute_total_revenue(cls, db: Session) -> Dict[str, Any]:
        """
        Computes overall enterprise gross and net revenue across all recorded sales and orders.
        """
        sales_df = BusinessDataService.get_sales_records_dataframe(db)
        orders_df = BusinessDataService.get_orders_dataframe(db)

        if sales_df.empty and orders_df.empty:
            return {
                "total_gross_revenue": 0.0,
                "total_net_revenue": 0.0,
                "total_orders": 0,
                "average_order_value": 0.0,
                "summary": "No financial records available in the database."
            }

        gross = float(sales_df["gross_revenue"].sum()) if not sales_df.empty else 0.0
        net = float(sales_df["net_revenue"].sum()) if not sales_df.empty else 0.0
        order_count = int(orders_df.shape[0]) if not orders_df.empty else 0

        # Average Order Value from completed orders
        completed_orders = orders_df[orders_df["status"] == "Completed"] if not orders_df.empty else pd.DataFrame()
        aov = float(completed_orders["total_amount"].mean()) if not completed_orders.empty else 0.0

        summary = (
            f"Total gross enterprise revenue is ${gross:,.2f} with net revenue of ${net:,.2f} "
            f"across {order_count} recorded orders (Average Order Value: ${aov:,.2f})."
        )

        return {
            "total_gross_revenue": round(gross, 2),
            "total_net_revenue": round(net, 2),
            "total_orders": order_count,
            "average_order_value": round(aov, 2),
            "summary": summary
        }

    @classmethod
    def compute_month_over_month(cls, db: Session) -> Dict[str, Any]:
        """
        Calculates Month-over-Month (MoM) growth comparing the most recent monthly period
        to the prior monthly period. Handles division by zero, empty data, and single-period series.
        """
        sales_df = BusinessDataService.get_sales_records_dataframe(db)

        if sales_df.empty:
            return {
                "growth_percent": 0.0,
                "absolute_delta": 0.0,
                "current_month": None,
                "prior_month": None,
                "current_revenue": 0.0,
                "prior_revenue": 0.0,
                "summary": "Insufficient historical data to calculate Month-over-Month growth."
            }

        sales_df["period"] = sales_df["date"].dt.to_period("M")
        monthly = sales_df.groupby("period")["net_revenue"].sum().reset_index().sort_values("period")

        if len(monthly) < 2:
            single_val = float(monthly["net_revenue"].iloc[0]) if len(monthly) == 1 else 0.0
            return {
                "growth_percent": 0.0,
                "absolute_delta": 0.0,
                "current_month": str(monthly["period"].iloc[0]) if len(monthly) == 1 else None,
                "prior_month": None,
                "current_revenue": round(single_val, 2),
                "prior_revenue": 0.0,
                "summary": "Only one monthly period is recorded. MoM comparison requires at least two monthly periods."
            }

        latest_period = monthly.iloc[-1]
        prior_period = monthly.iloc[-2]

        curr_rev = float(latest_period["net_revenue"])
        prior_rev = float(prior_period["net_revenue"])
        delta = curr_rev - prior_rev

        if prior_rev == 0.0:
            growth_pct = 100.0 if curr_rev > 0 else 0.0
        else:
            growth_pct = (delta / prior_rev) * 100.0

        direction = "increase" if delta >= 0 else "decrease"
        summary = (
            f"Month-over-Month net revenue {direction} of {abs(growth_pct):.2f}% (${delta:+,.2f}). "
            f"Current month ({latest_period['period']}): ${curr_rev:,.2f} vs "
            f"Prior month ({prior_period['period']}): ${prior_rev:,.2f}."
        )

        return {
            "growth_percent": round(growth_pct, 2),
            "absolute_delta": round(delta, 2),
            "current_month": str(latest_period["period"]),
            "prior_month": str(prior_period["period"]),
            "current_revenue": round(curr_rev, 2),
            "prior_revenue": round(prior_rev, 2),
            "direction": direction,
            "summary": summary
        }

    @classmethod
    def compute_top_products(cls, db: Session, limit: int = 5) -> Dict[str, Any]:
        """
        Ranks top-selling products by total revenue and units sold from order items.
        """
        results = (
            db.query(
                Product.sku,
                Product.name,
                Product.category,
                func.sum(OrderItem.quantity).label("units_sold"),
                func.sum(OrderItem.subtotal).label("total_revenue")
            )
            .join(OrderItem, Product.id == OrderItem.product_id)
            .group_by(Product.id, Product.sku, Product.name, Product.category)
            .order_by(desc("total_revenue"))
            .limit(limit)
            .all()
        )

        if not results:
            return {
                "top_products": [],
                "count": 0,
                "summary": "No product sales records available."
            }

        products_list = []
        for r in results:
            products_list.append({
                "sku": r.sku,
                "name": r.name,
                "category": r.category,
                "units_sold": int(r.units_sold),
                "total_revenue": round(float(r.total_revenue), 2)
            })

        top_name = products_list[0]["name"]
        top_rev = products_list[0]["total_revenue"]
        summary = (
            f"Top product by revenue is '{top_name}' generating ${top_rev:,.2f}. "
            f"Top {len(products_list)} products analyzed."
        )

        return {
            "top_products": products_list,
            "count": len(products_list),
            "summary": summary
        }

    @classmethod
    def compute_regional_sales(cls, db: Session) -> Dict[str, Any]:
        """
        Computes regional sales distributions and identifies top-performing geographic markets.
        """
        sales_df = BusinessDataService.get_sales_records_dataframe(db)

        if sales_df.empty:
            return {
                "regions": {},
                "top_region": None,
                "summary": "No regional sales records available."
            }

        regional = sales_df.groupby("region").agg({
            "gross_revenue": "sum",
            "net_revenue": "sum",
            "order_count": "sum"
        }).reset_index()

        total_net = float(regional["net_revenue"].sum())
        regional["share_percent"] = (regional["net_revenue"] / (total_net if total_net > 0 else 1.0)) * 100.0
        regional = regional.sort_values("net_revenue", ascending=False)

        top_row = regional.iloc[0]
        regions_dict = {}
        for _, row in regional.iterrows():
            regions_dict[row["region"]] = {
                "gross_revenue": round(float(row["gross_revenue"]), 2),
                "net_revenue": round(float(row["net_revenue"]), 2),
                "order_count": int(row["order_count"]),
                "share_percent": round(float(row["share_percent"]), 2)
            }

        summary = (
            f"Top performing region is '{top_row['region']}' with ${top_row['net_revenue']:,.2f} "
            f"({top_row['share_percent']:.1f}% of total net revenue). "
            f"Followed by {len(regional) - 1} other active regions."
        )

        return {
            "regions": regions_dict,
            "top_region": top_row["region"],
            "top_region_revenue": round(float(top_row["net_revenue"]), 2),
            "top_region_share_pct": round(float(top_row["share_percent"]), 2),
            "summary": summary
        }

    @classmethod
    def compute_customer_cohorts(cls, db: Session) -> Dict[str, Any]:
        """
        Analyzes customer purchasing distribution by tier (Enterprise, Mid-Market, SMB).
        """
        customers = db.query(Customer).all()
        if not customers:
            return {"tiers": {}, "total_customers": 0, "summary": "No customers found."}

        orders_df = BusinessDataService.get_orders_dataframe(db)
        cust_df = pd.DataFrame([{
            "id": c.id,
            "company": c.company,
            "region": c.region,
            "tier": c.tier
        } for c in customers])

        if not orders_df.empty:
            merged = pd.merge(orders_df, cust_df, left_on="customer_id", right_on="id")
            tier_agg = merged.groupby("tier")["total_amount"].agg(["sum", "count", "mean"]).reset_index()
            tier_dict = {}
            for _, row in tier_agg.iterrows():
                tier_dict[row["tier"]] = {
                    "total_spend": round(float(row["sum"]), 2),
                    "order_count": int(row["count"]),
                    "avg_order_value": round(float(row["mean"]), 2)
                }
        else:
            tier_dict = {}

        return {
            "tiers": tier_dict,
            "total_customers": len(customers),
            "summary": f"Analyzed {len(customers)} accounts across {len(tier_dict)} customer tiers."
        }

