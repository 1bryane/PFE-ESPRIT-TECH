"""
API Avantages Talents — CRUD géré par la Direction Générale.
Accessible en lecture par tous, en écriture par direction uniquement.
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User
from models.avantage_talent import AvantageTalent

router = APIRouter()

AVANTAGES_DEFAUT = [
    {"categorie": "Financier",      "libelle": "Bonus sur performance annuelle"},
    {"categorie": "Financier",      "libelle": "Prime de reconnaissance Talent"},
    {"categorie": "Carriere",       "libelle": "Acces aux postes de responsabilite"},
    {"categorie": "Carriere",       "libelle": "Charge de missions strategiques"},
    {"categorie": "Opportunite",    "libelle": "Benefice d'opportunites de publication"},
    {"categorie": "Reconnaissance", "libelle": "Distinction institutionnelle ESPRIT"},
    {"categorie": "Reconnaissance", "libelle": "Profil mis en avant sur la plateforme"},
]


class AvantageCreate(BaseModel):
    categorie: str
    libelle:   str


class AvantageOut(BaseModel):
    id:         int
    categorie:  str
    libelle:    str
    is_active:  bool
    created_at: datetime
    model_config = {"from_attributes": True}


@router.get("", response_model=List[AvantageOut])
def list_avantages(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Lecture de tous les avantages actifs (tous les rôles)."""
    avantages = db.query(AvantageTalent).filter(AvantageTalent.is_active == True).all()
    # Seed automatique si table vide
    if not avantages:
        for a in AVANTAGES_DEFAUT:
            db.add(AvantageTalent(**a))
        db.commit()
        avantages = db.query(AvantageTalent).filter(AvantageTalent.is_active == True).all()
    return avantages


@router.post("", response_model=AvantageOut, status_code=201)
def create_avantage(
    body: AvantageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["direction"])),
):
    """Direction Générale ajoute un avantage."""
    a = AvantageTalent(**body.model_dump(), createur_id=current_user.id)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{avantage_id}", status_code=204)
def delete_avantage(
    avantage_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["direction"])),
):
    """Direction Générale supprime (désactive) un avantage."""
    a = db.query(AvantageTalent).filter(AvantageTalent.id == avantage_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Avantage introuvable")
    a.is_active = False
    db.commit()
