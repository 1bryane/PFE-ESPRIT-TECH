"""
Module Évaluations — CRUD + stats par enseignant + demande talent + validation RH.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from models.evaluation import Evaluation
from schemas.evaluation import EvaluationCreate, EvaluationOut

router = APIRouter()

# Rôles autorisés à créer une évaluation (nouveaux rôles inclus)
EVALUATEURS = ["rp_coord", "rp_chef", "direction", "direction_etudes",
               "chef_admin", "cup", "chef_dept"]


@router.get("", response_model=List[EvaluationOut])
def list_evaluations(
    enseignant_id: Optional[int] = Query(None),
    annee: Optional[str] = Query(None),
    departement: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from models.user import User as UserModel
    q = db.query(Evaluation)

    if current_user.role in (RoleEnum.enseignant, RoleEnum.talent):
        q = q.filter(Evaluation.enseignant_id == current_user.id)
    else:
        if enseignant_id:
            q = q.filter(Evaluation.enseignant_id == enseignant_id)
        if departement:
            q = (
                q.join(UserModel, UserModel.id == Evaluation.enseignant_id)
                .filter(UserModel.departement == departement)
            )

    if annee:
        q = q.filter(Evaluation.annee_academique == annee)

    return q.order_by(Evaluation.created_at.desc()).all()


@router.post("", response_model=EvaluationOut, status_code=201)
def create_evaluation(
    body: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(EVALUATEURS)),
):
    enseignant = db.query(User).filter(User.id == body.enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable.")
    # Seul le CUP (coordinateur d'une unité pédagogique précise) est restreint à son
    # unité. Le Chef de département supervise toute la filière (toutes les unités) et
    # les rôles à périmètre large (Direction, RH...) ne sont pas limités.
    if current_user.role.value in ("cup", "rp_coord") and current_user.perimetre and enseignant.perimetre != current_user.perimetre:
        raise HTTPException(
            status_code=403,
            detail=f"Vous ne pouvez évaluer que les enseignants de votre unité pédagogique ({current_user.perimetre}).",
        )

    ev = Evaluation(**body.model_dump(), evaluateur_id=current_user.id)
    db.add(ev)
    db.flush()

    avg = db.query(func.avg(Evaluation.note_globale)).filter(
        Evaluation.enseignant_id == body.enseignant_id
    ).scalar()
    if avg is not None:
        enseignant = db.query(User).filter(User.id == body.enseignant_id).first()
        if enseignant:
            enseignant.score_global = round(float(avg) * 5, 1)

    db.commit()
    db.refresh(ev)
    return ev


@router.get("/stats/{enseignant_id}")
def stats_enseignant(
    enseignant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ROLES_AUTORISES = {
        RoleEnum.rp_coord, RoleEnum.rp_chef, RoleEnum.rdff,
        RoleEnum.chef_admin, RoleEnum.direction, RoleEnum.direction_etudes,
        RoleEnum.cup, RoleEnum.chef_dept, RoleEnum.direction_dept,
    }
    if current_user.role not in ROLES_AUTORISES and current_user.id != enseignant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    result = db.query(
        func.avg(Evaluation.note_globale).label("moyenne_globale"),
        func.avg(Evaluation.note_pedagogie).label("moyenne_pedagogie"),
        func.avg(Evaluation.note_ponctualite).label("moyenne_ponctualite"),
        func.avg(Evaluation.note_engagement).label("moyenne_engagement"),
        func.avg(Evaluation.note_innovation).label("moyenne_innovation"),
        func.avg(Evaluation.note_scientifique).label("moyenne_scientifique"),
        func.avg(Evaluation.note_communicationnel).label("moyenne_communicationnel"),
        func.count(Evaluation.id).label("nb_evaluations"),
    ).filter(Evaluation.enseignant_id == enseignant_id).first()

    return {
        "enseignant_id": enseignant_id,
        "nb_evaluations": result.nb_evaluations or 0,
        "moyenne_globale": round(result.moyenne_globale or 0, 2),
        "moyenne_pedagogie": round(result.moyenne_pedagogie or 0, 2),
        "moyenne_ponctualite": round(result.moyenne_ponctualite or 0, 2),
        "moyenne_engagement": round(result.moyenne_engagement or 0, 2),
        "moyenne_innovation": round(result.moyenne_innovation or 0, 2),
        "moyenne_scientifique": round(result.moyenne_scientifique or 0, 2),
        "moyenne_communicationnel": round(result.moyenne_communicationnel or 0, 2),
    }


@router.post("/demande-talent")
def demande_talent(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["enseignant", "talent", "rp_coord", "rp_chef", "cup", "chef_dept"])),
):
    """Un enseignant demande le statut Talent. Prérequis : avoir un badge de formation."""
    if not current_user.is_talent:
        # Vérifier qu'il a au moins une inscription avec badge obtenu
        from models.formation import Inscription, StatutInscriptionEnum
        badge = db.query(Inscription).filter(
            Inscription.enseignant_id == current_user.id,
            Inscription.badge_obtenu == True,
            Inscription.statut == StatutInscriptionEnum.termine,
        ).first()
        if not badge:
            raise HTTPException(
                status_code=400,
                detail="Badge de formation requis : terminez une formation du catalogue avec badge avant de demander le statut Talent.",
            )

    nb = db.query(Evaluation).filter(Evaluation.enseignant_id == current_user.id).count()
    if nb == 0:
        raise HTTPException(status_code=400, detail="Aucune évaluation disponible pour appuyer la demande.")

    from models.notification import Notification
    rh_users = db.query(User).filter(User.role == RoleEnum.chef_admin, User.is_active == True).all()
    for rh in rh_users:
        db.add(Notification(
            user_id=rh.id,
            title="Demande de statut Talent",
            body=f"{current_user.prenom} {current_user.nom} demande le statut Talent ESPRIT.",
            type="info",
            link="/rh/recrutement",
        ))
    db.commit()
    return {"message": "Demande enregistrée — le RH a été notifié."}


@router.post("/valider-talent/{user_id}")
def valider_talent(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["chef_admin", "direction"])),
):
    """RH valide ou refuse une demande de statut Talent."""
    from datetime import date
    from models.notification import Notification

    decision = body.get("decision")  # "valider" | "refuser"
    commentaire = body.get("commentaire", "")

    if decision not in ("valider", "refuser"):
        raise HTTPException(status_code=400, detail="decision doit être 'valider' ou 'refuser'.")

    enseignant = db.query(User).filter(User.id == user_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if decision == "valider":
        enseignant.is_talent = True
        enseignant.role = RoleEnum.talent
        enseignant.date_talent = date.today()
        notif_title = "Félicitations ! Vous êtes maintenant Talent ESPRIT !"
        notif_body = "Votre demande a été validée. Vous avez accès aux avantages Talent depuis votre tableau de bord."
        notif_type = "success"
    else:
        notif_title = "Demande de statut Talent refusée"
        notif_body = f"Votre demande n'a pas été retenue.{' Motif : ' + commentaire if commentaire else ''}"
        notif_type = "warning"

    db.add(Notification(
        user_id=enseignant.id,
        title=notif_title,
        body=notif_body,
        type=notif_type,
        link="/dashboard",
    ))
    db.commit()
    return {"message": f"Décision '{decision}' appliquée pour {enseignant.prenom} {enseignant.nom}."}


@router.patch("/{eval_id}", response_model=EvaluationOut)
def update_evaluation(
    eval_id: int,
    body: dict,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(EVALUATEURS)),
):
    ev = db.query(Evaluation).filter(Evaluation.id == eval_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Évaluation introuvable.")
    for field, value in body.items():
        if hasattr(ev, field):
            setattr(ev, field, value)
    db.commit()
    db.refresh(ev)
    return ev
