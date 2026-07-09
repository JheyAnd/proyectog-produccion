from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.sql import func
from src.infrastructure.database.models.base import Base

class CronogramaSimulacion(Base):
    __tablename__ = 'cronograma_simulaciones'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(50), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    estado_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
