"""
Module Auth — register, login, /me, changement mot de passe.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import hash_password, verify_password, create_access_token
from core.dependencies import get_current_user
from models.user import User, RoleEnum
from schemas.auth import Token, LoginForm
from schemas.user import UserRegister, UserOut

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: UserRegister, db: Session = Depends(get_db)):
    """Inscription — rôle par défaut : candidat."""
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = User(
        email           = body.email,
        hashed_password = hash_password(body.password),
        nom             = body.nom,
        prenom          = body.prenom,
        departement     = body.departement,
        specialite      = body.specialite,
        role            = RoleEnum.candidat,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(body: LoginForm, db: Session = Depends(get_db)):
    """Connexion — retourne un JWT valable 24h."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


@router.put("/me/password")
def change_password(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Changement de mot de passe."""
    old = body.get("old_password", "")
    new = body.get("new_password", "")
    if not verify_password(old, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")
    if len(new) < 6:
        raise HTTPException(status_code=400, detail="Nouveau mot de passe trop court")
    current_user.hashed_password = hash_password(new)
    db.commit()
    return {"message": "Mot de passe modifié"}
