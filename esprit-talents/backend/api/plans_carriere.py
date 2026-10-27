"""
Module Plans de Carrière — voie A (enseignant initie) + voie B (manager propose).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from models.plan_carriere import PlanCarriere, StatutPlanEnum
from schemas.plan_carriere import PlanCarriereCreate, PlanCarriereOut, PlanCarriereUpdate

router = APIRouter()

MANAGERS = ["chef_dept", "chef_admin", "direction", "direction_etudes", "rp_chef", "direction_dept", "cup"]


@router.post("", response_model=PlanCarriereOut, status_code=201)
def creer_plan(
    body: PlanCarriereCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Voie A : l'enseignant soumet sa propre demande (createur = lui-même → en_attente).
    Voie B : un manager crée un plan pour un enseignant (createur = manager → en_cours).
    """
    enseignant = db.query(User).filter(User.id == body.enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable.")

    voie_a = (current_user.id == body.enseignant_id)
    voie_b_roles = set(MANAGERS + ["cup"])

    if not voie_a and current_user.role.value not in voie_b_roles:
        raise HTTPException(status_code=403, detail="Seul l'enseignant lui-même ou un manager peut créer un plan.")

    # Seul le CUP (coordinateur d'une unité pédagogique précise) est restreint à son
    # unité. Le Chef de département supervise toute la filière (toutes les unités).
    if not voie_a and current_user.role.value in ("cup", "rp_coord") and current_user.perimetre and enseignant.perimetre != current_user.perimetre:
        raise HTTPException(
            status_code=403,
            detail=f"Vous ne pouvez créer un plan que pour les enseignants de votre unité pédagogique ({current_user.perimetre}).",
        )

    statut_initial = StatutPlanEnum.en_attente if voie_a else StatutPlanEnum.en_cours

    plan = PlanCarriere(
        **body.model_dump(),
        createur_id=current_user.id,
        statut=statut_initial,
        initie_par_enseignant=1 if voie_a else 0,
    )
    db.add(plan)
    db.flush()

    from models.notification import Notification
    if voie_a:
        # Notifier les managers
        managers = db.query(User).filter(
            User.role.in_([RoleEnum.chef_dept, RoleEnum.chef_admin]),
            User.is_active == True,
        ).all()
        for m in managers:
            db.add(Notification(
                user_id=m.id,
                title="Demande de plan de carrière",
                body=f"{current_user.prenom} {current_user.nom} a soumis une demande de plan de carrière ({body.type_plan.value}).",
                type="info",
                link="/dashboard",
            ))
    else:
        # Notifier l'enseignant
        db.add(Notification(
            user_id=enseignant.id,
            title="Plan de carrière créé",
            body=f"{current_user.prenom} {current_user.nom} a créé un plan de carrière pour vous : {body.titre}.",
            type="info",
            link="/dashboard",
        ))

    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=List[PlanCarriereOut])
def lister_plans(
    enseignant_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PlanCarriere).options(
        joinedload(PlanCarriere.enseignant),
        joinedload(PlanCarriere.createur),
    )

    if current_user.role in (RoleEnum.enseignant, RoleEnum.talent):
        q = q.filter(PlanCarriere.enseignant_id == current_user.id)
    else:
        if enseignant_id:
            q = q.filter(PlanCarriere.enseignant_id == enseignant_id)

    if statut:
        q = q.filter(PlanCarriere.statut == statut)

    return q.order_by(PlanCarriere.created_at.desc()).all()


@router.get("/enseignant/{enseignant_id}", response_model=List[PlanCarriereOut])
def plans_enseignant(
    enseignant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (RoleEnum.enseignant, RoleEnum.talent) and current_user.id != enseignant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    return db.query(PlanCarriere).options(
        joinedload(PlanCarriere.enseignant),
        joinedload(PlanCarriere.createur),
    ).filter(
        PlanCarriere.enseignant_id == enseignant_id
    ).order_by(PlanCarriere.created_at.desc()).all()


@router.get("/{plan_id}", response_model=PlanCarriereOut)
def detail_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.query(PlanCarriere).options(
        joinedload(PlanCarriere.enseignant),
        joinedload(PlanCarriere.createur),
    ).filter(PlanCarriere.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable.")
    return plan


@router.patch("/{plan_id}", response_model=PlanCarriereOut)
def mettre_a_jour_plan(
    plan_id: int,
    body: PlanCarriereUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager approuve/refuse/met à jour. RH approuve aussi les demandes voie A."""
    plan = db.query(PlanCarriere).options(
        joinedload(PlanCarriere.enseignant),
        joinedload(PlanCarriere.createur),
    ).filter(PlanCarriere.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan introuvable.")

    manager_roles = set(MANAGERS + ["cup"])
    is_manager = current_user.role.value in manager_roles
    is_owner = current_user.id == plan.enseignant_id

    if not is_manager and not is_owner:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    # Si plan en_attente et manager accepte/refuse → décision voie A
    if plan.statut == StatutPlanEnum.en_attente and is_manager and body.statut:
        if body.statut == StatutPlanEnum.en_cours:
            from models.notification import Notification
            db.add(Notification(
                user_id=plan.enseignant_id,
                title="Plan de carrière approuvé",
                body=f"Votre demande de plan de carrière '{plan.titre}' a été approuvée.",
                type="success",
                link="/dashboard",
            ))
        elif body.statut == StatutPlanEnum.refuse:
            from models.notification import Notification
            db.add(Notification(
                user_id=plan.enseignant_id,
                title="Plan de carrière refusé",
                body=f"Votre demande de plan de carrière '{plan.titre}' n'a pas été retenue.",
                type="warning",
                link="/dashboard",
            ))

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan
