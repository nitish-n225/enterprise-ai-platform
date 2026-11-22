import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.services.analytics import PandasAnalyticsEngine

logger = logging.getLogger("enterprise_ai.api.analytics")

router = APIRouter(prefix="/analytics", tags=["Business Analytics"])

@router.get("/summary")
def get_total_revenue_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns enterprise financial totals: gross revenue, net revenue, order count, and AOV.
    """
    return PandasAnalyticsEngine.compute_total_revenue(db)

@router.get("/growth")
def get_month_over_month_growth(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Calculates Month-over-Month net revenue growth and absolute delta.
    """
    return PandasAnalyticsEngine.compute_month_over_month(db)

@router.get("/top-products")
def get_top_products(limit: int = 5, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Ranks top products by revenue and units sold.
    """
    return PandasAnalyticsEngine.compute_top_products(db, limit=limit)

@router.get("/regional")
def get_regional_sales(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns regional sales distribution and market shares.
    """
    return PandasAnalyticsEngine.compute_regional_sales(db)

@router.get("/customers")
def get_customer_cohorts(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns customer cohort analysis by enterprise tier.
    """
    return PandasAnalyticsEngine.compute_customer_cohorts(db)
