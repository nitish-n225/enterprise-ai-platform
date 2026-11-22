from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime

class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    timestamp: datetime
    uptime_seconds: float
    services: Dict[str, str]

class DatabaseHealthResponse(BaseModel):
    status: str
    database_type: str
    connected: bool
    details: Dict[str, Any]

