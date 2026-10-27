from __future__ import annotations
from datetime import datetime, date
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr, field_validator
from models.user import RoleEnum



class UserRegister(BaseModel):
    email: EmailStr
    password: str
    nom: str
    prenom: str
    departement: Optional[str] = None
    specialite: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    departement: Optional[str] = None
    specialite: Optional[str] = None
    telephone: Optional[str] = None
    sous_role: Optional[str] = None
    perimetre: Optional[str] = None
    competences: Optional[List[str]] = None


class UserOut(BaseModel):
    id: int
    email: str
    nom: str
    prenom: str
    role: RoleEnum
    departement: Optional[str]
    specialite: Optional[str]
    telephone: Optional[str]
    cv_path: Optional[str]
    photo_path: Optional[str]
    competences: Optional[Any]
    score_global: float
    is_active: bool
    is_talent: bool
    date_talent: Optional[date]
    sous_role: Optional[str]
    perimetre: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    """Version allégée pour les listes (ranking candidats, recherche chat, effectifs)."""
    id: int
    nom: str
    prenom: str
    email: str
    role: RoleEnum
    departement: Optional[str]
    specialite: Optional[str] = None
    telephone: Optional[str] = None
    photo_path: Optional[str]
    cv_path: Optional[str] = None
    competences: Optional[Any] = None
    is_talent: bool
    score_global: float
    sous_role: Optional[str]
    perimetre: Optional[str]

    model_config = {"from_attributes": True}
