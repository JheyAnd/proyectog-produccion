from dataclasses import dataclass

@dataclass
class User:
    """Entidad de Dominio para el Usuario."""
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
