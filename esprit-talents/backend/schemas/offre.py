from __future__ import annotations
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel
from models.offre import StatutOffreEnum


class OffreCreate(BaseModel):
    titre: str
    description: str
    departement: str
    type_contrat: str = "CDI"
    competences_requises: Optional[List[str]] = []
    date_expiration: Optional[date] = None
    nb_postes: int = 1


class OffreUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    competences_requises: Optional[List[str]] = None
    statut: Optional[StatutOffreEnum] = None
    nb_postes: Optional[int] = None
    date_expiration: Optional[date] = None


class OffreOut(BaseModel):
    id: int
    titre: str
    description: str
    departement: str
    type_contrat: str
    competences_requises: Optional[List[str]]
    date_publication: date
    date_expiration: Optional[date]
    statut: StatutOffreEnum
    nb_postes: int
    createur_id: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}
