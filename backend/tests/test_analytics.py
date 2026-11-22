import pytest
from backend.app.services.analytics import PandasAnalyticsEngine

def test_analytics_total_revenue(db_session):
    metrics = PandasAnalyticsEngine.compute_total_revenue(db_session)
    assert metrics["total_gross_revenue"] > 0
    assert metrics["total_net_revenue"] > 0
    assert metrics["total_orders"] >= 50
    assert metrics["average_order_value"] > 0
    assert "Total gross enterprise revenue" in metrics["summary"]

def test_analytics_month_over_month(db_session):
    mom = PandasAnalyticsEngine.compute_month_over_month(db_session)
    assert mom["current_revenue"] > 0
    assert mom["prior_revenue"] > 0
    assert isinstance(mom["growth_percent"], float)
    assert mom["direction"] in ["increase", "decrease"]
    assert "Month-over-Month net revenue" in mom["summary"]

def test_analytics_top_products(db_session):
    top = PandasAnalyticsEngine.compute_top_products(db_session, limit=5)
    assert top["count"] == 5
    assert len(top["top_products"]) == 5
    # Verify sorting by total revenue descending
    revs = [p["total_revenue"] for p in top["top_products"]]
    assert revs == sorted(revs, reverse=True)
    assert top["top_products"][0]["units_sold"] > 0

def test_analytics_regional_sales(db_session):
    reg = PandasAnalyticsEngine.compute_regional_sales(db_session)
    assert reg["top_region"] is not None
    assert reg["top_region_revenue"] > 0
    assert len(reg["regions"]) >= 3
    # Check share percent sums close to 100%
    shares = sum(r["share_percent"] for r in reg["regions"].values())
    assert 99.0 <= shares <= 101.0

def test_analytics_customer_cohorts(db_session):
    cohorts = PandasAnalyticsEngine.compute_customer_cohorts(db_session)
    assert cohorts["total_customers"] >= 10
    assert len(cohorts["tiers"]) >= 1
    assert "Enterprise" in cohorts["tiers"] or "Mid-Market" in cohorts["tiers"]

