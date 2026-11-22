import pytest
from backend.app.agent.safe_sql import SafeSQLEngine

def test_safe_sql_valid_select():
    is_valid, err, sql = SafeSQLEngine.validate_query("SELECT id, order_number, total_amount FROM orders WHERE status = 'Completed'")
    assert is_valid is True
    assert err is None
    assert "LIMIT 100" in sql

def test_safe_sql_valid_join_and_group_by():
    query = (
        "SELECT p.sku, p.name, SUM(oi.quantity) as units_sold "
        "FROM products p JOIN order_items oi ON p.id = oi.product_id "
        "GROUP BY p.sku, p.name"
    )
    is_valid, err, sql = SafeSQLEngine.validate_query(query)
    assert is_valid is True
    assert err is None
    assert "LIMIT 100" in sql

def test_safe_sql_rejects_insert():
    is_valid, err, _ = SafeSQLEngine.validate_query("INSERT INTO products (sku, name, unit_price, cost_price) VALUES ('SKU-1', 'Test', 10, 5)")
    assert is_valid is False
    assert "Forbidden" in err or "INSERT" in err

def test_safe_sql_rejects_update():
    is_valid, err, _ = SafeSQLEngine.validate_query("UPDATE customers SET status = 'Churned' WHERE id = 1")
    assert is_valid is False
    assert "Forbidden" in err or "UPDATE" in err

def test_safe_sql_rejects_delete():
    is_valid, err, _ = SafeSQLEngine.validate_query("DELETE FROM orders WHERE id = 1")
    assert is_valid is False
    assert "Forbidden" in err or "DELETE" in err

def test_safe_sql_rejects_drop():
    is_valid, err, _ = SafeSQLEngine.validate_query("DROP TABLE customers")
    assert is_valid is False
    assert "Forbidden" in err or "DROP" in err

def test_safe_sql_rejects_alter():
    is_valid, err, _ = SafeSQLEngine.validate_query("ALTER TABLE products ADD COLUMN secret_key VARCHAR(100)")
    assert is_valid is False
    assert "Forbidden" in err or "ALTER" in err

def test_safe_sql_rejects_multiple_statements():
    query = "SELECT * FROM orders; DROP TABLE customers;"
    is_valid, err, _ = SafeSQLEngine.validate_query(query)
    assert is_valid is False
    assert "Multiple" in err or "Forbidden" in err

def test_safe_sql_rejects_unauthorized_users_table():
    is_valid, err, _ = SafeSQLEngine.validate_query("SELECT id, username, hashed_password FROM users")
    assert is_valid is False
    assert "Access denied" in err
    assert "users" in err

def test_safe_sql_rejects_system_tables():
    is_valid, err, _ = SafeSQLEngine.validate_query("SELECT * FROM sqlite_master")
    assert is_valid is False
    assert "Access denied" in err

def test_safe_sql_clamps_large_limit():
    is_valid, err, sql = SafeSQLEngine.validate_query("SELECT id FROM orders LIMIT 1000")
    assert is_valid is True
    assert "LIMIT 100" in sql

def test_safe_sql_execution_success(db_session):
    res = SafeSQLEngine.execute_safe_query("SELECT sku, name, unit_price FROM products LIMIT 5", db_session)
    assert res["success"] is True
    assert res["row_count"] >= 1
    assert len(res["data"]) >= 1
    assert "sku" in res["data"][0]

def test_safe_sql_execution_blocked_mutation(db_session):
    res = SafeSQLEngine.execute_safe_query("DELETE FROM orders", db_session)
    assert res["success"] is False
    assert res["row_count"] == 0
    assert "Security Validation Blocked" in res["summary"]

