"""SQLAlchemy model for storing dynamic project/user preferences."""
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.database.models.base import Base


class PreferenceModel(Base):
    """
    Stores generic settings/configurations formerly saved in JSON files.
    Allows for dynamic expansion of project settings without schema changes.
    """
    __tablename__ = "project_preferences"

    config_key: Mapped[str] = mapped_column(String(50), primary_key=True)
    config_value: Mapped[Any] = mapped_column(JSON, nullable=False)
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Preference {self.config_key}>"
