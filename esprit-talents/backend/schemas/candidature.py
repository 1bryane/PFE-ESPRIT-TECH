from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from models.candidature import StatutCandidatureEnum


class CandidatureCreate(BaseModel):
    offre_id: int
    lettre_motivation: Optional[str] = None


class CandidatureUpdate(BaseModel):
    statut: Optional[StatutCandidatureEnum] = None
    commentaire_rp: Optional[str] = None


class CandidatureOut(BaseModel):
    id: int
    candidat_id: int
    offre_id: int
    score_ml: float
    statut: StatutCandidatureEnum
    commentaire_rp: Optional[str]
    lettre_motivation: Optional[str]
    date_soumission: datetime
    date_decision: Optional[datetime]

    model_config = {"from_attributes": True}
