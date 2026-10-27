"""
Module Formations — catalogue générique, inscriptions, progression.
Routes STATIQUES déclarées AVANT les routes dynamiques /{id} (règle FastAPI).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from models.formation import Formation, Inscription, StatutInscriptionEnum
from schemas.formation import (
    FormationCreate, FormationUpdate, FormationOut,
    InscriptionCreate, InscriptionUpdate, InscriptionOut,
)

router = APIRouter()


# ── Routes STATIQUES (avant toute route dynamique) ───────────────────────

@router.get("", response_model=List[FormationOut])
def list_formations(
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Formation).filter(Formation.is_active == is_active).all()


@router.post("", response_model=FormationOut, status_code=201)
def create_formation(
    body: FormationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["rdff", "chef_admin"])),
):
    if db.query(Formation).filter(Formation.code == body.code).first():
        raise HTTPException(status_code=400, detail="Code formation déjà existant")
    f = Formation(**body.model_dump(), createur_id=current_user.id)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


# ── Inscriptions — routes statiques AVANT /{formation_id} ────────────────

@router.get("/mes-inscriptions", response_model=List[InscriptionOut])
def mes_inscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Inscriptions de l'utilisateur connecté."""
    return db.query(Inscription).options(
        joinedload(Inscription.formation)
    ).filter(Inscription.enseignant_id == current_user.id).all()


@router.patch("/inscriptions/{insc_id}", response_model=InscriptionOut)
def update_inscription(
    insc_id: int,
    body: InscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    insc = db.query(Inscription).options(
        joinedload(Inscription.formation)
    ).filter(Inscription.id == insc_id).first()
    if not insc:
        raise HTTPException(status_code=404, detail="Inscription introuvable")
    if insc.enseignant_id != current_user.id and current_user.role.value not in ["rdff", "chef_admin"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(insc, field, value)
    if body.badge_obtenu and body.statut == StatutInscriptionEnum.termine:
        from datetime import date
        insc.enseignant.is_talent   = True
        insc.enseignant.date_talent = date.today()   # Fix : date manquante
        # Notifier l'enseignant
        from models.notification import Notification
        db.add(Notification(
            user_id = insc.enseignant_id,
            title   = "Felicitations ! Vous etes maintenant Talent ESPRIT !",
            body    = f"Badge '{insc.formation.badge}' obtenu. Vous avez acces aux avantages Talent depuis votre tableau de bord.",
            type    = "success",
            link    = "/dashboard",
        ))
    db.commit()
    db.refresh(insc)
    return insc


# ── Routes DYNAMIQUES /{formation_id} ────────────────────────────────────

@router.get("/{formation_id}", response_model=FormationOut)
def get_formation(
    formation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    f = db.query(Formation).filter(Formation.id == formation_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Formation introuvable")
    return f


@router.put("/{formation_id}", response_model=FormationOut)
def update_formation(
    formation_id: int,
    body: FormationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["rdff", "chef_admin"])),
):
    f = db.query(Formation).filter(Formation.id == formation_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Formation introuvable")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(f, field, value)
    db.commit()
    db.refresh(f)
    return f


@router.post("/{formation_id}/inscrire", response_model=InscriptionOut, status_code=201)
def s_inscrire(
    formation_id: int,
    db: Session = Depends(get_db),
    # RP sont aussi enseignants → peuvent s'inscrire aux formations
    current_user: User = Depends(require_role(["enseignant", "talent", "rp_coord", "rp_chef"])),
):
    f = db.query(Formation).filter(Formation.id == formation_id, Formation.is_active == True).first()
    if not f:
        raise HTTPException(status_code=404, detail="Formation introuvable")
    existing = db.query(Inscription).filter(
        Inscription.enseignant_id == current_user.id,
        Inscription.formation_id == formation_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Déjà inscrit à cette formation")
    insc = Inscription(enseignant_id=current_user.id, formation_id=formation_id)
    db.add(insc)
    db.commit()
    db.refresh(insc)
    # Charger la relation pour la réponse
    _ = insc.formation
    return insc


@router.get("/{formation_id}/inscrits")
def inscrits_formation(
    formation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["rdff", "chef_admin", "rp_chef"])),
):
    rows = db.query(Inscription).filter(Inscription.formation_id == formation_id).all()
    return [
        {
            "inscription_id": i.id,
            "enseignant_id":  i.enseignant_id,
            "nom_complet":    i.enseignant.nom_complet,
            "email":          i.enseignant.email,
            "statut":         i.statut.value,
            "progression":    i.progression,
            "badge_obtenu":   i.badge_obtenu,
        }
        for i in rows
    ]
