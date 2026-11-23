import json
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password,
    create_access_token,
    get_current_user,
    require_roles
)
from backend.app.models.user import User
from backend.app.models.audit import AuditLog
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserResponse

logger = logging.getLogger("enterprise_ai.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and issues a signed JWT access token.
    """
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        # Audit failed login attempt
        failed_audit = AuditLog(
            user_id=payload.username,
            user_role="unknown",
            ip_address=request.client.host if request.client else "127.0.0.1",
            endpoint="/api/auth/login",
            action="LOGIN_FAILED",
            resource_type="User",
            resource_id=None,
            status_code=401,
            details_json=json.dumps({"reason": "Invalid credentials provided"})
        )
        db.add(failed_audit)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})

    # Audit successful login
    success_audit = AuditLog(
        user_id=user.username,
        user_role=user.role,
        ip_address=request.client.host if request.client else "127.0.0.1",
        endpoint="/api/auth/login",
        action="USER_LOGIN",
        resource_type="User",
        resource_id=str(user.id),
        status_code=200,
        details_json=json.dumps({"username": user.username, "role": user.role})
    )
    db.add(success_audit)
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated user's profile and RBAC role.
    """
    return current_user

@router.get("/users", response_model=List[UserResponse])
def list_system_users(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles(["admin"]))
):
    """
    Lists registered users (restricted to administrators).
    """
    return db.query(User).all()

