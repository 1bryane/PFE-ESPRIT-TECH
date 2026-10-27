"""
API Notifications — lecture, marquage lu, historique.
"""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel as _Base

from core.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.notification import Notification
from pydantic import BaseModel

router = APIRouter()


class NotifCreate(BaseModel):
    """Payload pour créer une notification depuis le frontend (recommandations, etc.)."""
    user_id: int
    title: str
    body: Optional[str] = ""
    type: Optional[str] = "info"
    link: Optional[str] = ""


class NotifOut(BaseModel):
    id: int
    title: str
    body: str | None
    type: str
    link: str | None
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("", status_code=201)
def create_notif(
    body: NotifCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Crée une notification pour un utilisateur (recommandation talent, etc.)."""
    n = Notification(
        user_id=body.user_id,
        title=body.title,
        body=body.body,
        type=body.type,
        link=body.link,
    )
    db.add(n)
    db.commit()
    return {"ok": True, "id": n.id}


@router.get("", response_model=List[NotifOut])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """50 dernières notifications de l'utilisateur connecté."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"count": n}


@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}


# ── Helper interne (utilisé par les autres modules) ────────────────────────

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str = "",
    type: str = "info",
    link: str = "",
):
    """Crée une notification en BDD pour un utilisateur."""
    n = Notification(user_id=user_id, title=title, body=body, type=type, link=link)
    db.add(n)
    # Pas de commit ici — le caller gère la transaction
