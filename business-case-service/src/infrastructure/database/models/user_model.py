import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database.models.base import Base


class UserModel(Base):
    """SQLAlchemy ORM model for User (Managed via Pandora)."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Granular access control
    allowed_directors: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="ALL")
    allowed_projects: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="ALL")
    module_features: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    profile_image: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role}>"