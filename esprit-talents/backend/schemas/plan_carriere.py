from __future__ import annotations
from datetime import datetime, date
from typing import List, Optional, Any
from pydantic import BaseModel
from models.plan_carriere import TypePlanEnum, StatutPlanEnum


class PlanCarriereCreate(BaseModel):
    enseignant_id: int
    type_plan: TypePlanEnum
    titre: str
    description: Optional[str] = None
    poste_cible: Optional[str] = None
    formations_suggerees: Optional[Any] = None
    competences_cibles: Optional[Any] = None
    echeance: Optional[date] = None


class PlanCarriereUpdate(BaseModel):
    statut: Optional[StatutPlanEnum] = None
    notes_suivi: Optional[str] = None
    formations_suggerees: Optional[Any] = None
    competences_cibles: Optional[Any] = None
    echeance: Optional[date] = None
    poste_cible: Optional[str] = None


class EnseignantMini(BaseModel):
    id: int
    nom: str
    prenom: str
    departement: Optional[str]

    model_config = {"from_attributes": True}


class PlanCarriereOut(BaseModel):
    id: int
    enseignant_id: int
    createur_id: int
    type_plan: TypePlanEnum
    titre: str
    description: Optional[str]
    poste_cible: Optional[str]
    formations_suggerees: Optional[Any]
    competences_cibles: Optional[Any]
    echeance: Optional[date]
    statut: StatutPlanEnum
    notes_suivi: Optional[str]
    initie_par_enseignant: int
    enseignant: Optional[EnseignantMini] = None
    createur: Optional[EnseignantMini] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
