"""
Module Users — profil, photo, upload CV, liste utilisateurs.
"""

import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from core.dependencies import get_current_user, require_role
from models.user import User, RoleEnum
from schemas.user import UserOut, UserUpdate, UserSummary
from services.matching_service import extract_cv_skills

router = APIRouter()


@router.get("", response_model=List[UserSummary])
def list_users(
    role: Optional[str] = Query(None),
    departement: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Liste les utilisateurs (pour recherche chat, vue admin)."""
    q = db.query(User).filter(User.is_active == True)
    if role:
        q = q.filter(User.role == role)
    if departement:
        q = q.filter(User.departement == departement)
    if search:
        q = q.filter(
            (User.nom.ilike(f"%{search}%")) |
            (User.prenom.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    return q.limit(50).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


@router.put("/me", response_model=UserOut)
def update_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/photo", response_model=UserOut)
async def upload_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Format image non supporté (jpg/png/webp)")
    ext = file.filename.rsplit(".", 1)[-1]
    filename = f"photo_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    dest = settings.UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    current_user.photo_path = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/cv", response_model=UserOut)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload CV PDF → extraction automatique des compétences via ML Engine."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Le CV doit être un fichier PDF")

    # Sauvegarde du fichier
    filename = f"cv_{current_user.id}_{uuid.uuid4().hex[:8]}.pdf"
    dest = settings.UPLOAD_DIR / filename
    content = await file.read()
    with dest.open("wb") as f:
        f.write(content)

    # Mots trop génériques qui polluent l'extraction (apparaissent partout dans les CV)
    _NOISE_SKILLS = {
        "formation", "évaluation", "evaluation", "publication", "recherche",
        "thèse", "these", "master", "doctorat", "licence", "diplôme", "diplome",
        "automatique", "enseignement", "tutorat", "encadrement", "mentorat",
    }

    # Extraction ML des compétences
    try:
        result = await extract_cv_skills(content)
        raw_skills = result.get("profile", {}).get("all_skill_names", [])
        current_user.competences = [
            s for s in raw_skills
            if s.lower() not in _NOISE_SKILLS and len(s) > 2
        ]
    except Exception:
        current_user.competences = []

    current_user.cv_path = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/{user_id}/role")
def change_role(
    user_id: int,
    body: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(["chef_admin", "direction"])),
):
    """Changer le rôle d'un utilisateur (admin/direction uniquement)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    new_role = body.get("role")
    if new_role not in [r.value for r in RoleEnum]:
        raise HTTPException(status_code=400, detail="Rôle invalide")
    user.role = new_role
    db.commit()
    return {"message": f"Rôle mis à jour → {new_role}"}
