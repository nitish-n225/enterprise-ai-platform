def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Enterprise AI Business Operations Agent" in data["app"]
    assert data["docs_url"] == "/docs"

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "services" in data
    assert "database" in data["services"]
    assert data["uptime_seconds"] >= 0

def test_database_health(client):
    response = client.get("/api/health/db")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["connected"] is True
    assert "table_count" in data["details"]
    assert data["details"]["table_count"] >= 8
    expected_tables = ["customers", "products", "orders", "order_items", "sales_records", "users", "documents", "approval_requests"]
    for t in expected_tables:
        assert t in data["details"]["tables"]

