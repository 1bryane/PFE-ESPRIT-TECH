"""
Module Candidatures — postuler, suivi, propositions directes, changement statut.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from models.candidature import Candidature, StatutCandidatureEnum
from models.offre import Offre
from schemas.candidature import CandidatureCreate, CandidatureUpdate, CandidatureOut
from services.matching_service import score_match
from services.mail_service import send_candidature_status

router = APIRouter()


@router.get("/mes", response_model=List[CandidatureOut])
def mes_candidatures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Candidature).filter(Candidature.candidat_id == current_user.id).all()


@router.post("", response_model=CandidatureOut, status_code=201)
async def postuler(
    body: CandidatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Postuler à une offre — calcule le score ML automatiquement."""
    offre = db.query(Offre).filter(Offre.id == body.offre_id, Offre.is_active == True).first()
    if not offre:
        raise HTTPException(status_code=404, detail="Offre introuvable ou fermée")

    existing = db.query(Candidature).filter(
        Candidature.candidat_id == current_user.id,
        Candidature.offre_id == body.offre_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà postulé à cette offre")

    # Score ML — signale proprement si le service est hors ligne
    score      = 0.0
    ml_warning = None
    if current_user.competences and offre.competences_requises:
        try:
            import logging as _log
            cv_text = " ".join(current_user.competences)
            result  = await score_match(cv_text, offre.competences_requises)
            # ML Engine retourne {"offer_id": ..., "result": {"score_global": X, ...}}
            score   = result.get("result", {}).get("score_global", 0.0)
        except Exception as e:
            _log.getLogger("candidatures").warning(f"[ML Engine hors ligne] score non calcule : {e}")
            ml_warning = "Score de compatibilite non calcule (service ML indisponible)."

    c = Candidature(
        candidat_id       = current_user.id,
        offre_id          = body.offre_id,
        lettre_motivation = body.lettre_motivation,
        score_ml          = score,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    if ml_warning:
        # Retourner la candidature avec avertissement dans le header
        from fastapi.responses import JSONResponse
        from schemas.candidature import CandidatureOut
        return JSONResponse(
            status_code=201,
            content={**CandidatureOut.model_validate(c).model_dump(mode="json"),
                     "warning": ml_warning},
        )
    return c


@router.patch("/{candidature_id}", response_model=CandidatureOut)
async def update_statut(
    candidature_id: int,
    body: CandidatureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["chef_admin"])),
):
    """Modifier le statut d'une candidature — RH (chef_admin) uniquement."""
    c = db.query(Candidature).filter(Candidature.id == candidature_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidature introuvable")

    old_statut = c.statut
    if body.statut:
        c.statut = body.statut
        c.date_decision = datetime.utcnow()

        # Si acceptée → passer le candidat en enseignant + notifier
        if body.statut == StatutCandidatureEnum.acceptee:
            candidat = c.candidat
            if candidat.role == RoleEnum.candidat:
                candidat.role = RoleEnum.enseignant
                db.add(candidat)
                from models.notification import Notification
                db.add(Notification(
                    user_id = candidat.id,
                    title   = "Félicitations ! Votre candidature a été acceptée",
                    body    = (
                        f"Bienvenue dans l'équipe ESPRIT ! Votre candidature pour le poste "
                        f"« {c.offre.titre} » a été validée par le RH. "
                        f"Votre compte a été promu au rôle d'Enseignant. "
                        f"Reconnectez-vous pour accéder à votre espace enseignant."
                    ),
                    type    = "success",
                    link    = "/dashboard",
                ))

    if body.commentaire_rp is not None:
        c.commentaire_rp = body.commentaire_rp

    db.commit()
    db.refresh(c)

    # Notification email (asynchrone, fire-and-forget)
    if body.statut and body.statut != old_statut:
        try:
            await send_candidature_status(c.candidat.email, c.candidat.prenom, c.statut.value)
        except Exception:
            pass

    return c


@router.post("/{user_id}/proposer/{offre_id}")
async def proposer_offre(
    user_id: int,
    offre_id: int,
    db: Session = Depends(get_db),
    current_rp: User = Depends(require_role(["chef_admin"])),
):
    """
    RH propose directement une offre à un candidat.
    Calcule le score ML, crée la candidature et notifie le candidat.
    """
    user = db.query(User).filter(User.id == user_id).first()
    offre = db.query(Offre).filter(Offre.id == offre_id).first()
    if not user or not offre:
        raise HTTPException(status_code=404, detail="Utilisateur ou offre introuvable")

    existing = db.query(Candidature).filter(
        Candidature.candidat_id == user_id, Candidature.offre_id == offre_id
    ).first()
    if existing:
        return {"message": "Candidature déjà existante", "candidature_id": existing.id}

    # Calculer le score ML
    score = 0.0
    if user.competences and offre.competences_requises:
        try:
            from services.matching_service import score_match
            cv_text = " ".join(user.competences)
            result  = await score_match(cv_text, offre.competences_requises)
            # ML Engine retourne {"offer_id": ..., "result": {"score_global": X, ...}}
            score   = result.get("result", {}).get("score_global", 0.0)
        except Exception:
            pass

    c = Candidature(
        candidat_id = user_id,
        offre_id    = offre_id,
        statut      = StatutCandidatureEnum.en_cours,
        score_ml    = score,
    )
    db.add(c)

    # Notifier le candidat qu'il reçoit une proposition directe
    from models.notification import Notification
    db.add(Notification(
        user_id = user_id,
        title   = "Vous avez recu une proposition d'offre",
        body    = f"Le responsable pedagogique vous propose le poste : « {offre.titre} ». Consultez vos candidatures pour accepter ou refuser.",
        type    = "info",
        link    = "/candidatures",
    ))

    db.commit()
    return {"message": "Proposition envoyee avec succes", "candidature_id": c.id, "score_ml": score}
