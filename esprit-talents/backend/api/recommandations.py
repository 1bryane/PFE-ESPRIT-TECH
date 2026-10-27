"""
Module Recommandations Talent — soumission par CUP/Chef dept/Direction + validation RH.
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from models.recommandation import RecommandationTalent, StatutRecommandationEnum
from schemas.recommandation import RecommandationCreate, RecommandationOut, RecommandationValider

router = APIRouter()

RECOMMANDANTS = ["cup", "chef_dept", "direction_etudes", "chef_admin", "direction", "direction_dept", "rp_chef", "rp_coord"]


@router.post("", response_model=RecommandationOut, status_code=201)
def creer_recommandation(
    body: RecommandationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RECOMMANDANTS)),
):
    """Soumettre une recommandation multi-dimensionnelle pour un enseignant."""
    enseignant = db.query(User).filter(User.id == body.enseignant_id).first()
    if not enseignant:
        raise HTTPException(status_code=404, detail="Enseignant introuvable.")

    # Seul le CUP (coordinateur d'une unité pédagogique précise) est restreint à son
    # unité. Le Chef de département supervise toute la filière (toutes les unités).
    if current_user.role.value in ("cup", "rp_coord") and current_user.perimetre and enseignant.perimetre != current_user.perimetre:
        raise HTTPException(
            status_code=403,
            detail=f"Vous ne pouvez recommander que les enseignants de votre unité pédagogique ({current_user.perimetre}).",
        )

    # Vérifier badge de formation (la Direction peut recommander sans badge)
    if current_user.role.value not in ("direction", "chef_admin"):
        from models.formation import Inscription, StatutInscriptionEnum
        badge = db.query(Inscription).filter(
            Inscription.enseignant_id == body.enseignant_id,
            Inscription.badge_obtenu == True,
            Inscription.statut == StatutInscriptionEnum.termine,
        ).first()
        if not badge:
            raise HTTPException(
                status_code=400,
                detail="L'enseignant doit avoir obtenu un badge de formation avant d'être recommandé.",
            )

    data = body.model_dump()
    reco = RecommandationTalent(**data, recommandant_id=current_user.id)
    db.add(reco)
    db.flush()
    db.refresh(reco)
    # Charger les relations pour la réponse sérialisée
    _ = reco.enseignant
    _ = reco.recommandant

    # Notifier l'enseignant
    from models.notification import Notification
    db.add(Notification(
        user_id=enseignant.id,
        title="Recommandation Talent reçue",
        body=f"{current_user.prenom} {current_user.nom} vous a recommandé pour le statut Talent ESPRIT (score moyen : {reco.score_moyen}/5).",
        type="info",
        link="/dashboard",
    ))
    # Notifier le RH
    rh_users = db.query(User).filter(User.role == RoleEnum.chef_admin, User.is_active == True).all()
    for rh in rh_users:
        db.add(Notification(
            user_id=rh.id,
            title="Nouvelle recommandation Talent à valider",
            body=f"{current_user.prenom} {current_user.nom} a recommandé {enseignant.prenom} {enseignant.nom} pour le statut Talent.",
            type="info",
            link="/rh/recrutement",
        ))

    db.commit()
    db.refresh(reco)
    return reco


@router.get("", response_model=List[RecommandationOut])
def lister_recommandations(
    enseignant_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    annee: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(RecommandationTalent).options(
        joinedload(RecommandationTalent.enseignant),
        joinedload(RecommandationTalent.recommandant),
    )

    # Enseignant/Talent : ses propres recommandations uniquement
    if current_user.role in (RoleEnum.enseignant, RoleEnum.talent):
        q = q.filter(RecommandationTalent.enseignant_id == current_user.id)
    elif current_user.role in (RoleEnum.cup, RoleEnum.chef_dept, RoleEnum.rp_coord, RoleEnum.rp_chef):
        # Voit ses propres soumissions + celles de son périmètre
        q = q.filter(RecommandationTalent.recommandant_id == current_user.id)
    else:
        if enseignant_id:
            q = q.filter(RecommandationTalent.enseignant_id == enseignant_id)

    if statut:
        q = q.filter(RecommandationTalent.statut == statut)
    if annee:
        q = q.filter(RecommandationTalent.annee_academique == annee)

    return q.order_by(RecommandationTalent.created_at.desc()).all()


@router.get("/enseignant/{enseignant_id}", response_model=List[RecommandationOut])
def recommandations_enseignant(
    enseignant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (RoleEnum.enseignant, RoleEnum.talent) and current_user.id != enseignant_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    return db.query(RecommandationTalent).options(
        joinedload(RecommandationTalent.enseignant),
        joinedload(RecommandationTalent.recommandant),
    ).filter(
        RecommandationTalent.enseignant_id == enseignant_id
    ).order_by(RecommandationTalent.created_at.desc()).all()


@router.get("/{reco_id}", response_model=RecommandationOut)
def detail_recommandation(
    reco_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reco = db.query(RecommandationTalent).options(
        joinedload(RecommandationTalent.enseignant),
        joinedload(RecommandationTalent.recommandant),
    ).filter(RecommandationTalent.id == reco_id).first()
    if not reco:
        raise HTTPException(status_code=404, detail="Recommandation introuvable.")
    return reco


@router.patch("/{reco_id}/valider", response_model=RecommandationOut)
def valider_recommandation(
    reco_id: int,
    body: RecommandationValider,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["chef_admin"])),
):
    """RH valide ou refuse une recommandation de talent."""
    from datetime import date
    from models.notification import Notification

    reco = db.query(RecommandationTalent).options(
        joinedload(RecommandationTalent.enseignant),
        joinedload(RecommandationTalent.recommandant),
    ).filter(RecommandationTalent.id == reco_id).first()
    if not reco:
        raise HTTPException(status_code=404, detail="Recommandation introuvable.")
    if reco.statut != StatutRecommandationEnum.en_attente:
        raise HTTPException(status_code=400, detail="Cette recommandation a déjà été traitée.")

    if body.decision not in ("valider", "refuser"):
        raise HTTPException(status_code=400, detail="decision doit être 'valider' ou 'refuser'.")

    reco.statut = StatutRecommandationEnum.validee if body.decision == "valider" else StatutRecommandationEnum.refusee
    reco.validateur_id = current_user.id
    reco.date_validation = datetime.utcnow()
    reco.commentaire_validation = body.commentaire

    enseignant = db.query(User).filter(User.id == reco.enseignant_id).first()

    if body.decision == "valider" and enseignant:
        enseignant.is_talent = True
        enseignant.role = RoleEnum.talent
        enseignant.date_talent = date.today()
        notif_title = "Félicitations ! Vous êtes maintenant Talent ESPRIT !"
        notif_body = "Votre recommandation a été validée par le RH. Accédez à vos avantages Talent."
        notif_type = "success"
    else:
        notif_title = "Recommandation Talent refusée"
        notif_body = f"La recommandation vous concernant n'a pas été retenue.{' Motif : ' + body.commentaire if body.commentaire else ''}"
        notif_type = "warning"

    if enseignant:
        db.add(Notification(user_id=enseignant.id, title=notif_title, body=notif_body, type=notif_type, link="/dashboard"))

    # Notifier le recommandant
    recommandant = db.query(User).filter(User.id == reco.recommandant_id).first()
    if recommandant:
        db.add(Notification(
            user_id=recommandant.id,
            title=f"Recommandation {reco.statut.value}",
            body=f"Votre recommandation pour {enseignant.prenom} {enseignant.nom} a été {reco.statut.value}.",
            type="info",
            link="/dashboard",
        ))

    db.commit()
    db.refresh(reco)
    return reco
