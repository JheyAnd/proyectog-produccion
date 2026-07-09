"""Activity log model."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import mapped_column, Mapped

from src.infrastructure.database.models.base import Base

class ActivityLogModel(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False)
    user_name: Mapped[str] = mapped_column(String(100), nullable=False)
    user_role: Mapped[str] = mapped_column(String(50), nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=True)
    page: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=True)
    before_state: Mapped[str] = mapped_column(Text, nullable=True)
    after_state: Mapped[str] = mapped_column(Text, nullable=True)
    target_link: Mapped[str] = mapped_column(String(255), nullable=True)
    project_id: Mapped[str] = mapped_column(String(100), nullable=True) # Campo faltante en el modelo pero presente en DB
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
