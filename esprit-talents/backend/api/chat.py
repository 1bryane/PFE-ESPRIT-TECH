"""
Module Chat — WebSocket temps réel + historique messages.
"""

import json
from typing import Dict, List, Set

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import get_current_user
from core.security import decode_access_token
from models.user import User
from models.message import Message
from schemas.message import MessageOut

router = APIRouter()


# ── Gestionnaire de connexions WebSocket ──────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # user_id → set de WebSockets (multi-onglets)
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(ws)
            if not self.active[user_id]:
                del self.active[user_id]

    async def send_to(self, user_id: int, data: dict):
        sockets = self.active.get(user_id, set())
        dead = set()
        for ws in sockets:
            try:
                await ws.send_json(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            sockets.discard(ws)

    def online_users(self) -> List[int]:
        return list(self.active.keys())


manager = ConnectionManager()


def _room_id(a: int, b: int) -> str:
    """ID de salle canonique pour deux utilisateurs."""
    return f"dm_{min(a, b)}_{max(a, b)}"


# ── Endpoint WebSocket ─────────────────────────────────────────────────────

@router.websocket("/ws/{token}")
async def websocket_endpoint(token: str, websocket: WebSocket, db: Session = Depends(get_db)):
    """
    WebSocket authentifié par token JWT dans l'URL.
    Le client envoie : {"to": user_id, "content": "message"}
    Il reçoit  : {"from": user_id, "content": "...", "created_at": "...", "id": int}
    """
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        await websocket.close(code=4003)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            receiver_id = data.get("to")
            content = data.get("content", "").strip()
            if not content or not receiver_id:
                continue

            room = _room_id(user_id, receiver_id)
            msg = Message(
                sender_id   = user_id,
                receiver_id = receiver_id,
                room_id     = room,
                content     = content,
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            payload_out = {
                "id":         msg.id,
                "from":       user_id,
                "to":         receiver_id,
                "content":    content,
                "room_id":    room,
                "created_at": msg.created_at.isoformat(),
            }
            # Envoyer à l'expéditeur et au destinataire
            await manager.send_to(user_id, payload_out)
            await manager.send_to(receiver_id, payload_out)

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


# ── REST — historique et utilisateurs en ligne ─────────────────────────────

@router.get("/history/{other_user_id}", response_model=List[MessageOut])
def history(
    other_user_id: int,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne l'historique de la conversation PRIVÉE entre current_user et other_user_id.
    Fix IDOR : on filtre par room_id calculé depuis les deux IDs — un tiers ne peut
    jamais accéder à cette room car le token identifie current_user.id.
    """
    # Vérifier que l'autre utilisateur existe et est actif
    from fastapi import HTTPException
    other = db.query(User).filter(User.id == other_user_id, User.is_active == True).first()
    if not other:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # room_id canonique — garantit l'isolation : room(A,B) != room(A,C)
    room = _room_id(current_user.id, other_user_id)
    msgs = (
        db.query(Message)
        .filter(Message.room_id == room)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    # Marquer comme lus uniquement les messages reçus par current_user
    for m in msgs:
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
    db.commit()
    return list(reversed(msgs))


@router.get("/online")
def online_users(_: User = Depends(get_current_user)):
    """Liste des user_id actuellement connectés via WebSocket."""
    return {"online": manager.online_users()}


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nombre total de messages non lus — pour la pastille de notification globale."""
    count = (
        db.query(Message)
        .filter(Message.receiver_id == current_user.id, Message.is_read == False)
        .count()
    )
    return {"unread": count}


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Liste des conversations de l'utilisateur, triées par message le plus récent,
    avec le nombre de messages non lus par conversation.
    """
    from sqlalchemy import or_

    msgs = (
        db.query(Message)
        .filter(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id))
        .filter(Message.receiver_id.isnot(None))
        .order_by(Message.created_at.desc())
        .all()
    )

    convos: dict[int, dict] = {}
    for m in msgs:
        other_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id
        if other_id not in convos:
            convos[other_id] = {
                "user_id":         other_id,
                "last_message":    m.content,
                "last_message_at": m.created_at,
                "unread":          0,
            }
        if m.receiver_id == current_user.id and not m.is_read:
            convos[other_id]["unread"] += 1

    if not convos:
        return []

    users = db.query(User).filter(User.id.in_(list(convos.keys()))).all()
    users_by_id = {u.id: u for u in users}

    result = []
    for oid, c in convos.items():
        u = users_by_id.get(oid)
        if not u:
            continue
        result.append({
            "user_id":         oid,
            "nom":             u.nom,
            "prenom":          u.prenom,
            "role":            u.role.value,
            "photo_path":      u.photo_path,
            "last_message":    c["last_message"],
            "last_message_at": c["last_message_at"].isoformat(),
            "unread":          c["unread"],
        })

    result.sort(key=lambda x: x["last_message_at"], reverse=True)
    return result
