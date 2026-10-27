"""
API Formations Proposées — workflow ARIA → Enseignant → RDFF → Catalogue.

Flux :
  1. Enseignant génère un plan avec ARIA → le soumet au RDFF via POST /proposer
  2. RDFF consulte les propositions en attente via GET /
  3. RDFF valide (PATCH /{id}/accepter) → la formation est créée dans le catalogue
     RDFF refuse  (PATCH /{id}/refuser)  → notification envoyée à l'enseignant
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User
from models.formation_proposee import FormationProposee, StatutProposeeEnum
from models.formation import Formation, NiveauEnum
from models.notification import Notification

router = APIRouter()


# ── Schémas ───────────────────────────────────────────────────────────────

class PropositionCreate(BaseModel):
    titre:          str
    plan_text:      str
    objectif:       Optional[str] = ""
    duree_semaines: Optional[int] = 8
    niveau:         Optional[str] = "intermediaire"


class PropositionOut(BaseModel):
    id:              int
    proposeur_id:    int
    titre:           str
    plan_text:       Optional[str] = None
    objectif:        Optional[str]
    duree_semaines:  Optional[int]
    niveau:          Optional[str]
    statut:          StatutProposeeEnum
    commentaire_rdff: Optional[str]
    formation_id:    Optional[int]
    created_at:      datetime
    validated_at:    Optional[datetime]

    model_config = {"from_attributes": True}


class RefusBody(BaseModel):
    commentaire: str


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/proposer", response_model=PropositionOut, status_code=201)
def soumettre_proposition(
    body: PropositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["enseignant", "talent"])),
):
    """
    L'enseignant soumet un plan généré par ARIA au RDFF pour validation.
    Le plan reste en statut 'en_attente' jusqu'à décision du RDFF.
    """
    prop = FormationProposee(
        proposeur_id   = current_user.id,
        titre          = body.titre,
        plan_text      = body.plan_text,
        objectif       = body.objectif,
        duree_semaines = body.duree_semaines,
        niveau         = body.niveau,
    )
    db.add(prop)

    # Notifier le RDFF (notification globale de type info)
    rdff_users = db.query(User).filter(User.role == "rdff", User.is_active == True).all()
    for rdff in rdff_users:
        db.add(Notification(
            user_id = rdff.id,
            title   = "Nouvelle proposition de formation",
            body    = f"{current_user.prenom} {current_user.nom} a soumis un plan : « {body.titre} »",
            type    = "info",
            link    = "/rdff/formations",
        ))

    db.commit()
    db.refresh(prop)
    return prop


@router.get("/proposees", response_model=List[PropositionOut])
def lister_propositions(
    statut: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    RDFF : toutes les propositions (filtrables par statut).
    Enseignant : uniquement ses propres propositions.
    """
    q = db.query(FormationProposee)
    if current_user.role.value in ("enseignant", "talent"):
        q = q.filter(FormationProposee.proposeur_id == current_user.id)
    if statut:
        q = q.filter(FormationProposee.statut == statut)
    return q.order_by(FormationProposee.created_at.desc()).all()


@router.patch("/proposees/{prop_id}/accepter", response_model=PropositionOut)
def accepter_proposition(
    prop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["rdff", "chef_admin"])),
):
    """
    RDFF accepte la proposition → création automatique dans le catalogue
    + notification de succès à l'enseignant.
    """
    prop = db.query(FormationProposee).filter(FormationProposee.id == prop_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Proposition introuvable")
    if prop.statut != StatutProposeeEnum.en_attente:
        raise HTTPException(status_code=400, detail="Proposition déjà traitée")

    # Créer la formation dans le catalogue
    niveau_map = {
        "debutant": NiveauEnum.debutant,
        "intermediaire": NiveauEnum.intermediaire,
        "avance": NiveauEnum.avance,
        "expert": NiveauEnum.expert,
    }
    niveau_enum = niveau_map.get(prop.niveau or "intermediaire", NiveauEnum.intermediaire)

    # Générer un code ARIA unique — verrouillage pessimiste pour éviter les races conditions
    last_aria = (
        db.query(Formation)
        .filter(Formation.code.like("ARIA%"))
        .order_by(Formation.code.desc())
        .with_for_update()   # lock sur cette ligne pendant la transaction
        .first()
    )
    if last_aria and last_aria.code[4:].isdigit():
        next_num = int(last_aria.code[4:]) + 1
    else:
        next_num = 1
    code = f"ARIA{next_num:03d}"

    formation = Formation(
        code           = code,
        titre          = prop.titre,
        description    = prop.objectif or "",
        objectifs      = [prop.objectif] if prop.objectif else [],
        duree_semaines = prop.duree_semaines,
        niveau         = niveau_enum,
        badge          = f"Badge {prop.titre}",
        programme      = prop.plan_text,
        createur_id    = current_user.id,
    )
    db.add(formation)
    db.flush()

    prop.statut       = StatutProposeeEnum.acceptee
    prop.validated_at = datetime.utcnow()
    prop.formation_id = formation.id

    # Notifier l'enseignant
    db.add(Notification(
        user_id = prop.proposeur_id,
        title   = "Formation acceptee et ajoutee au catalogue !",
        body    = f"Votre proposition « {prop.titre} » a ete validee par le RDFF et est maintenant disponible dans le catalogue sous le code {code}.",
        type    = "success",
        link    = "/formations",
    ))

    db.commit()
    db.refresh(prop)
    return prop


@router.patch("/proposees/{prop_id}/refuser", response_model=PropositionOut)
def refuser_proposition(
    prop_id: int,
    body: RefusBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["rdff", "chef_admin"])),
):
    """
    RDFF refuse la proposition avec un commentaire obligatoire
    + notification de refus envoyée à l'enseignant.
    """
    prop = db.query(FormationProposee).filter(FormationProposee.id == prop_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Proposition introuvable")
    if prop.statut != StatutProposeeEnum.en_attente:
        raise HTTPException(status_code=400, detail="Proposition déjà traitée")

    prop.statut          = StatutProposeeEnum.refusee
    prop.commentaire_rdff = body.commentaire
    prop.validated_at    = datetime.utcnow()

    # Notifier l'enseignant du refus avec le commentaire
    db.add(Notification(
        user_id = prop.proposeur_id,
        title   = "Proposition de formation refusee",
        body    = f"Votre proposition « {prop.titre} » a ete refusee par le RDFF.\n\nMotif : {body.commentaire}\n\nVous pouvez modifier votre plan et le resoumettre.",
        type    = "error",
        link    = "/aria",
    ))

    db.commit()
    db.refresh(prop)
    return prop
