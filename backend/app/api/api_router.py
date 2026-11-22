from fastapi import APIRouter
from backend.app.api.health import router as health_router
from backend.app.api.chat import router as chat_router
from backend.app.api.documents import router as documents_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.reports import router as reports_router
from backend.app.api.approvals import router as approvals_router
from backend.app.api.auth import router as auth_router
from backend.app.api.audit import router as audit_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(chat_router)
api_router.include_router(documents_router)
api_router.include_router(analytics_router)
api_router.include_router(reports_router)
api_router.include_router(approvals_router)
api_router.include_router(auth_router)
api_router.include_router(audit_router)
