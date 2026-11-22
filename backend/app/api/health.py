import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from backend.app.core.config import settings
from backend.app.core.database import get_db, check_db_connection
from backend.app.schemas.health import HealthResponse, DatabaseHealthResponse

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])
_START_TIME = time.time()

def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)

@router.get("", response_model=HealthResponse)
def get_health():
    uptime = time.time() - _START_TIME
    db_ok = check_db_connection()
    return HealthResponse(
        status="healthy" if db_ok else "degraded",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=utc_now(),
        uptime_seconds=round(uptime, 2),
        services={
            "database": "connected" if db_ok else "disconnected",
            "ai_engine": "mock_mode" if settings.MOCK_AI or not settings.GEMINI_API_KEY else "gemini_ready"
        }
    )

@router.get("/db", response_model=DatabaseHealthResponse)
def get_db_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        is_sqlite = settings.DATABASE_URL.startswith("sqlite")
        return DatabaseHealthResponse(
            status="healthy",
            database_type="sqlite" if is_sqlite else "postgresql",
            connected=True,
            details={
                "table_count": len(tables),
                "tables": sorted(tables),
                "url_masked": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL.split("///")[-1]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database health check failed: {str(e)}"
        )
