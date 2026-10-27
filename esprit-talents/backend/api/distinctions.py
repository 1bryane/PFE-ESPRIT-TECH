"""
Module Distinctions — attribution par Direction/RH + mur des lauréats.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from models.distinction import DistinctionTalent
from schemas.distinction import DistinctionCreate, DistinctionOut

router = APIRouter()


@router.post("", response_model=DistinctionOut, status_code=201)
def attribuer_distinction(
    body: DistinctionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["chef_admin", "direction"])),
):
    enseignant = db.query(User).filter(User.id == body.enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable.")
    if not enseignant.is_talent:
        raise HTTPException(status_code=400, detail="La distinction ne peut être attribuée qu'à un Talent validé.")

    distinction = DistinctionTalent(**body.model_dump(), attribueur_id=current_user.id)
    db.add(distinction)
    db.flush()
    db.refresh(distinction)
    _ = distinction.enseignant
    _ = distinction.attribueur

    from models.notification import Notification
    libelle = body.libelle_custom if body.type_distinction.value == "autre" and body.libelle_custom else body.type_distinction.value.replace("_", " ").title()
    db.add(Notification(
        user_id=enseignant.id,
        title=f"Distinction reçue : {libelle}",
        body=f"Félicitations ! Vous avez reçu la distinction '{libelle}' pour l'année {body.annee_academique}.",
        type="success",
        link="/dashboard",
    ))

    db.commit()
    db.refresh(distinction)
    return distinction


@router.get("", response_model=List[DistinctionOut])
def lister_distinctions(
    annee: Optional[str] = Query(None),
    type_distinction: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(DistinctionTalent).options(
        joinedload(DistinctionTalent.enseignant),
        joinedload(DistinctionTalent.attribueur),
    )
    if annee:
        q = q.filter(DistinctionTalent.annee_academique == annee)
    if type_distinction:
        q = q.filter(DistinctionTalent.type_distinction == type_distinction)
    return q.order_by(DistinctionTalent.created_at.desc()).all()


@router.get("/enseignant/{enseignant_id}", response_model=List[DistinctionOut])
def distinctions_enseignant(
    enseignant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (RoleEnum.enseignant, RoleEnum.talent) and current_user.id != enseignant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    return db.query(DistinctionTalent).options(
        joinedload(DistinctionTalent.enseignant),
        joinedload(DistinctionTalent.attribueur),
    ).filter(
        DistinctionTalent.enseignant_id == enseignant_id
    ).order_by(DistinctionTalent.created_at.desc()).all()


@router.get("/annee/{annee}", response_model=List[DistinctionOut])
def distinctions_par_annee(
    annee: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(DistinctionTalent).filter(
        DistinctionTalent.annee_academique == annee
    ).order_by(DistinctionTalent.type_distinction).all()


@router.delete("/{distinction_id}", status_code=204)
def revoquer_distinction(
    distinction_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["direction"])),
):
    d = db.query(DistinctionTalent).filter(DistinctionTalent.id == distinction_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Distinction introuvable.")
    db.delete(d)
    db.commit()
