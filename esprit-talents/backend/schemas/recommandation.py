from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, model_validator
from models.recommandation import StatutRecommandationEnum


class UserMini(BaseModel):
    id: int
    nom: str
    prenom: str
    departement: Optional[str] = None
    is_talent: bool = False
    model_config = {"from_attributes": True}


class RecommandationCreate(BaseModel):
    enseignant_id: int
    annee_academique: str
    dim_scientifique: Optional[float] = None
    dim_pedagogique: Optional[float] = None
    dim_communicationnel: Optional[float] = None
    dim_comportemental: Optional[float] = None
    dim_autres: Optional[float] = None
    justif_scientifique: Optional[str] = None
    justif_pedagogique: Optional[str] = None
    justif_communicationnel: Optional[str] = None
    justif_comportemental: Optional[str] = None
    justif_autres: Optional[str] = None
    commentaire_global: Optional[str] = None

    @model_validator(mode="after")
    def compute_score_moyen(self) -> "RecommandationCreate":
        scores = [s for s in [
            self.dim_scientifique, self.dim_pedagogique,
            self.dim_communicationnel, self.dim_comportemental, self.dim_autres,
        ] if s is not None]
        if scores:
            object.__setattr__(self, "score_moyen", round(sum(scores) / len(scores), 2))
        return self

    score_moyen: Optional[float] = None


class RecommandationValider(BaseModel):
    decision: str           # "valider" | "refuser"
    commentaire: Optional[str] = None


class RecommandationOut(BaseModel):
    id: int
    enseignant_id: int
    recommandant_id: int
    enseignant: Optional[UserMini] = None
    recommandant: Optional[UserMini] = None
    annee_academique: str
    dim_scientifique: Optional[float]
    dim_pedagogique: Optional[float]
    dim_communicationnel: Optional[float]
    dim_comportemental: Optional[float]
    dim_autres: Optional[float]
    justif_scientifique: Optional[str]
    justif_pedagogique: Optional[str]
    justif_communicationnel: Optional[str]
    justif_comportemental: Optional[str]
    justif_autres: Optional[str]
    commentaire_global: Optional[str]
    score_moyen: Optional[float]
    statut: StatutRecommandationEnum
    validateur_id: Optional[int]
    date_validation: Optional[datetime]
    commentaire_validation: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
