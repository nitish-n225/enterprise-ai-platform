import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(20), default=UserRole.ANALYST.value, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

