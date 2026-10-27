"""
Module Offres — CRUD + liste publique + candidats rankés.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User
from models.offre import Offre, StatutOffreEnum
from models.candidature import Candidature
from schemas.offre import OffreCreate, OffreUpdate, OffreOut

router = APIRouter()


@router.get("", response_model=List[OffreOut])
def list_offres(
    departement: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste des offres (filtrées par département et/ou statut)."""
    q = db.query(Offre).filter(Offre.is_active == True)
    if departement:
        q = q.filter(Offre.departement == departement)
    if statut:
        q = q.filter(Offre.statut == statut)
    return q.order_by(Offre.created_at.desc()).all()


@router.get("/{offre_id}", response_model=OffreOut)
def get_offre(offre_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    offre = db.query(Offre).filter(Offre.id == offre_id).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    return offre


@router.post("", response_model=OffreOut, status_code=201)
def create_offre(
    body: OffreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["rp_coord", "rp_chef", "chef_admin"])),
):
    offre = Offre(**body.model_dump(), createur_id=current_user.id)
    db.add(offre)
    db.commit()
    db.refresh(offre)
    return offre


@router.put("/{offre_id}", response_model=OffreOut)
def update_offre(
    offre_id: int,
    body: OffreUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["rp_coord", "rp_chef", "chef_admin"])),
):
    offre = db.query(Offre).filter(Offre.id == offre_id).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(offre, field, value)
    db.commit()
    db.refresh(offre)
    return offre


@router.delete("/{offre_id}", status_code=204)
def delete_offre(
    offre_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["rp_chef", "chef_admin"])),
):
    offre = db.query(Offre).filter(Offre.id == offre_id).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    offre.is_active = False
    db.commit()


@router.get("/{offre_id}/candidats")
def candidats_par_offre(
    offre_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["rp_coord", "rp_chef", "chef_admin", "rdff"])),
):
    """Retourne les candidatures pour une offre, triées par score ML décroissant."""
    rows = (
        db.query(Candidature)
        .filter(Candidature.offre_id == offre_id)
        .order_by(Candidature.score_ml.desc())
        .all()
    )
    result = []
    for c in rows:
        u = c.candidat
        result.append({
            "candidature_id": c.id,
            "candidat_id": u.id,
            "nom_complet": u.nom_complet,
            "email": u.email,
            "departement": u.departement,
            "competences": u.competences,
            "cv_path": u.cv_path,
            "photo_path": u.photo_path,
            "score_ml": c.score_ml,
            "statut": c.statut.value,
            "date_soumission": c.date_soumission,
        })
    return result
