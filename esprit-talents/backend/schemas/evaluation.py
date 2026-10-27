from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, model_validator


class EvaluationCreate(BaseModel):
    enseignant_id: int
    annee_academique: str
    semestre: Optional[str] = None
    note_pedagogie: Optional[float] = None
    note_ponctualite: Optional[float] = None
    note_engagement: Optional[float] = None
    note_innovation: Optional[float] = None
    note_scientifique: Optional[float] = None
    note_communicationnel: Optional[float] = None
    commentaire: Optional[str] = None
    points_forts: Optional[List[str]] = None
    axes_amelioration: Optional[List[str]] = None

    @model_validator(mode="after")
    def compute_globale(self) -> "EvaluationCreate":
        notes = [n for n in [
            self.note_pedagogie, self.note_ponctualite,
            self.note_engagement, self.note_innovation,
            self.note_scientifique, self.note_communicationnel,
        ] if n is not None]
        if notes:
            object.__setattr__(self, "note_globale", round(sum(notes) / len(notes), 2))
        return self

    note_globale: Optional[float] = None


class EvaluationOut(BaseModel):
    id: int
    enseignant_id: int
    evaluateur_id: Optional[int]
    annee_academique: str
    semestre: Optional[str]
    note_pedagogie: Optional[float]
    note_ponctualite: Optional[float]
    note_engagement: Optional[float]
    note_innovation: Optional[float]
    note_scientifique: Optional[float]
    note_communicationnel: Optional[float]
    note_globale: Optional[float]
    commentaire: Optional[str]
    points_forts: Optional[List[str]]
    axes_amelioration: Optional[List[str]]
    created_at: datetime

    model_config = {"from_attributes": True}
