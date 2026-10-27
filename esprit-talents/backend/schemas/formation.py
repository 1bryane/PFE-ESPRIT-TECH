from __future__ import annotations
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel
from models.formation import NiveauEnum, StatutInscriptionEnum


class FormationCreate(BaseModel):
    code: str
    titre: str
    description: Optional[str] = None
    objectifs: Optional[List[str]] = None
    prerequis: Optional[List[str]] = None
    duree_semaines: Optional[int] = None
    niveau: NiveauEnum = NiveauEnum.intermediaire
    badge: Optional[str] = None
    competences_cibles: Optional[List[str]] = None
    programme: Optional[str] = None


class FormationUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    objectifs: Optional[List[str]] = None
    duree_semaines: Optional[int] = None
    programme: Optional[str] = None
    is_active: Optional[bool] = None


class FormationOut(BaseModel):
    id: int
    code: str
    titre: str
    description: Optional[str]
    objectifs: Optional[List[str]]
    prerequis: Optional[List[str]]
    duree_semaines: Optional[int]
    niveau: NiveauEnum
    badge: Optional[str]
    competences_cibles: Optional[List[str]]
    programme: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class InscriptionCreate(BaseModel):
    formation_id: int


class InscriptionUpdate(BaseModel):
    statut: Optional[StatutInscriptionEnum] = None
    progression: Optional[float] = None
    note_finale: Optional[float] = None
    badge_obtenu: Optional[bool] = None


class FormationMini(BaseModel):
    id: int
    titre: str
    code: str
    niveau: NiveauEnum
    badge: Optional[str] = None
    model_config = {"from_attributes": True}


class InscriptionOut(BaseModel):
    id: int
    enseignant_id: int
    formation_id: int
    formation: Optional[FormationMini] = None
    statut: StatutInscriptionEnum
    progression: float
    note_finale: Optional[float]
    badge_obtenu: bool
    date_inscription: date

    model_config = {"from_attributes": True}
