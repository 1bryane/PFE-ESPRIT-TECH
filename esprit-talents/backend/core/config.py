"""
Configuration centrale — esprit-talents backend.
Toutes les valeurs sont lues depuis le fichier .env.
"""

from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # Base de données
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/esprit_talents.db"

    # JWT
    JWT_SECRET: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # Services internes
    ARIA_URL: str = "http://localhost:8001"
    ML_URL: str = "http://localhost:8000"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Uploads
    UPLOAD_DIR: Path = BASE_DIR / "uploads"

    # Email (optionnel)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAILS_ENABLED: bool = False

    # App
    APP_NAME: str = "ESPRIT Talents"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

# Créer le dossier uploads si absent
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
