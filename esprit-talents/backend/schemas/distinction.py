from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel
from models.distinction import TypeDistinctionEnum, TypeRecompenseEnum


class UserMini(BaseModel):
    id: int
    nom: str
    prenom: str
    departement: Optional[str] = None
    model_config = {"from_attributes": True}


class DistinctionCreate(BaseModel):
    enseignant_id: int
    annee_academique: str
    type_distinction: TypeDistinctionEnum
    libelle_custom: Optional[str] = None
    description: Optional[str] = None
    type_recompense: Optional[TypeRecompenseEnum] = None
    valeur_recompense: Optional[str] = None
    date_remise: Optional[date] = None
    avantage_id: Optional[int] = None
    recommandation_id: Optional[int] = None


class DistinctionOut(BaseModel):
    id: int
    enseignant_id: int
    attribueur_id: int
    enseignant: Optional[UserMini] = None
    attribueur: Optional[UserMini] = None
    type_distinction: TypeDistinctionEnum
    libelle_custom: Optional[str]
    description: Optional[str]
    type_recompense: Optional[TypeRecompenseEnum]
    valeur_recompense: Optional[str]
    annee_academique: str
    date_remise: Optional[date]
    avantage_id: Optional[int]
    recommandation_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
