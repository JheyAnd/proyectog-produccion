"""Application configuration using pydantic-settings."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Patio Sur - Gestión de Proyectos"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    
    @property
    def DEBUG(self) -> bool:
        return self.APP_ENV == "development"
    
    API_V1_PREFIX: str = "/api/v1"

    # Database - MySQL (PROD)
    DATABASE_URL: str = "" # Debe definirse en .env
    DATABASE_ECHO: bool = False

    AUTH_SERVICE_URL: str = "https://pandora.pcmejia.com"
    AUTH_SERVICE_SECRET: str = "ms_auth_super_secret_key_987654321"

    # Azure AD / Sharepoint
    AZURE_CLIENT_ID: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""

    # JWT Auth
    JWT_SECRET: str = "pcmejia-patio-sur-s3cr3t-k3y-ch4ng3-1n-pr0d"
    JWT_SECRET_APPLICATION: str = "ProyectoG2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8 hours
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    JWT_CLOCK_LEEWAY_SECONDS: int = 60

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    # Reports
    REPORTS_OUTPUT_DIR: str = "./reports_output"
    COMPANY_LOGO_PATH: str = "./assets/logo.png"
    COMPANY_NAME: str = "Patio Sur - Obra Eléctrica"

    # Alerts thresholds
    BUDGET_WARNING_THRESHOLD: float = 95.0
    INVOICE_DUE_ALERT_DAYS: int = 15
    
    # Timezone
    TZ: str = "America/Bogota"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
