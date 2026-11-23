import pytest

def test_login_successful_admin(client):
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "wrong-password-999"
    })
    assert res.status_code == 401
    assert "Incorrect username or password" in res.json()["detail"]

def test_get_current_user_profile(client):
    login_res = client.post("/api/auth/login", json={
        "username": "analyst",
        "password": "analyst123"
    })
    token = login_res.json()["access_token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["username"] == "analyst"
    assert user_data["role"] == "analyst"

def test_rbac_admin_allowed_list_users(client):
    login_res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    token = login_res.json()["access_token"]

    users_res = client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 3
    usernames = [u["username"] for u in users]
    assert "admin" in usernames
    assert "analyst" in usernames
    assert "viewer" in usernames

def test_rbac_analyst_forbidden_list_users(client):
    login_res = client.post("/api/auth/login", json={
        "username": "analyst",
        "password": "analyst123"
    })
    token = login_res.json()["access_token"]

    users_res = client.get("/api/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert users_res.status_code == 403
    assert "Forbidden" in users_res.json()["detail"]

def test_audit_logging_and_stats(client):
    # 1. Fetch audit logs
    audit_res = client.get("/api/audit")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) >= 1

    # 2. Fetch stats
    stats_res = client.get("/api/audit/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_events"] >= 1
    assert "actions_breakdown" in stats
    assert "recent_activity" in stats

