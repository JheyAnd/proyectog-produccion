from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    """Entidad de Dominio para el Usuario."""
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    allowed_directors: Optional[str] = "ALL"
    allowed_projects: Optional[str] = "ALL"
    module_features: Optional[str] = None
