"""
Module ARIA — proxy vers l'agent IA ESPRIT (port 8001).
Accessible uniquement aux enseignants, talents et admins.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

import httpx

from core.config import settings
from core.dependencies import get_current_user, require_role
from models.user import User
from services.aria_service import chat, generate_plan, aria_health

router = APIRouter()

ARIA_ROLES = ["enseignant", "talent", "rdff", "rp_chef", "rp_coord", "chef_admin", "direction"]


class ChatRequest(BaseModel):
    message: str


class PlanRequest(BaseModel):
    objectif: str
    competences_actuelles: Optional[str] = ""
    duree_semaines: int = 8
    niveau: str = "intermédiaire"


@router.post("/chat")
async def aria_chat(
    body: ChatRequest,
    current_user: User = Depends(require_role(ARIA_ROLES)),
):
    """Envoie un message à l'agent ARIA et retourne la réponse."""
    parts = [f"Prénom: {current_user.prenom}", f"Nom: {current_user.nom}",
             f"Rôle: {current_user.role.value}"]
    if current_user.departement:
        parts.append(f"Département: {current_user.departement}")
    if current_user.specialite:
        parts.append(f"Spécialité: {current_user.specialite}")
    if current_user.competences:
        parts.append(f"Compétences: {', '.join(current_user.competences[:15])}")
    if current_user.is_talent:
        parts.append("Statut: Talent ESPRIT")
    context_prefix = "[Profil de l'utilisateur connecté — " + " | ".join(parts) + "]\n\n"
    enriched_message = context_prefix + body.message

    try:
        result = await chat(
            user_id = f"user_{current_user.id}",
            message = enriched_message,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ARIA indisponible : {e}")


@router.post("/plan")
async def aria_plan(
    body: PlanRequest,
    current_user: User = Depends(require_role(ARIA_ROLES)),
):
    """Génère un plan de formation personnalisé via ARIA."""
    # Utiliser les compétences du profil si non précisées
    competences = body.competences_actuelles
    if not competences and current_user.competences:
        competences = ", ".join(current_user.competences[:10])

    try:
        result = await generate_plan(
            user_id               = f"user_{current_user.id}",
            objectif              = body.objectif,
            competences_actuelles = competences,
            duree_semaines        = body.duree_semaines,
            niveau                = body.niveau,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ARIA indisponible : {e}")


@router.get("/health")
async def aria_status():
    """Vérifie si l'agent ARIA est joignable."""
    ok = await aria_health()
    return {"aria_online": ok}


class SyncRAGRequest(BaseModel):
    formations: List[Dict[str, Any]]


@router.post("/sync-rag")
async def sync_rag(
    body: SyncRAGRequest,
    _: User = Depends(require_role(["rdff", "chef_admin", "direction"])),
):
    """
    Synchronise les formations de la BDD principale vers le RAG ChromaDB d'ARIA.
    À appeler après création/modification d'une formation dans esprit-talents.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{settings.ARIA_URL}/rag/sync",
                json={"formations": body.formations},
            )
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ARIA sync indisponible : {e}")


@router.post("/reindex")
async def reindex_rag(
    _: User = Depends(require_role(["rdff", "chef_admin"])),
):
    """Re-indexe tous les documents RAG d'ARIA depuis data/raw/."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(f"{settings.ARIA_URL}/rag/reindex")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"ARIA reindex indisponible : {e}")
