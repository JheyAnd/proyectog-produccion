from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.infrastructure.database.models.base import Base

class CronogramaSimulacion(Base):
    """
    Simulation metadata scenario.
    """
    __tablename__ = 'cronograma_simulaciones'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String(50), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    estado_json = Column(Text, nullable=True)  # Maintained for backwards compatibility
    description = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # One-to-many relationship with simulation details/deltas (Disabled to avoid missing table error)
    # detalles = relationship("CronogramaSimulacionDetalle", back_populates="simulacion", cascade="all, delete-orphan")

# class CronogramaSimulacionDetalle(Base):
#     """
#     Delta values for specific activities modified in a simulation scenario.
#     """
#     __tablename__ = 'cronograma_simulacion_detalles'
# 
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     simulacion_id = Column(Integer, ForeignKey('cronograma_simulaciones.id', ondelete='CASCADE'), nullable=False)
#     activity_id = Column(String(50), nullable=False, index=True)
#     simulated_progress = Column(Numeric(5, 2), nullable=False)  # Simulated progress (e.g. 0.85 for 85%)
# 
#     simulacion = relationship("CronogramaSimulacion", back_populates="detalles")
