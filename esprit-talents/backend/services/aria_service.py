"""
Client HTTP vers l'agent IA ARIA (esprit-aria — port 8001).
"""

import httpx
from core.config import settings

BASE = settings.ARIA_URL
TIMEOUT = 200.0


async def chat(user_id: str, message: str) -> dict:
    """
    Envoie un message à ARIA et retourne la réponse.
    Retour : {answer: str, iterations: int, tools_used: [...], rag_used: bool, duration: float}
    """
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/chat",
            json={"user_id": user_id, "message": message},
        )
        r.raise_for_status()
        return r.json()


async def generate_plan(
    user_id: str,
    objectif: str,
    competences_actuelles: str,
    duree_semaines: int = 8,
    niveau: str = "intermédiaire",
) -> dict:
    """
    Génère un plan de formation personnalisé via ARIA.
    Retour : {user_id: str, plan: str, success: bool}
    """
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/plan",
            json={
                "user_id": user_id,
                "objectif": objectif,
                "competences_actuelles": competences_actuelles,
                "duree_semaines": duree_semaines,
                "niveau": niveau,
            },
        )
        r.raise_for_status()
        return r.json()


async def aria_health() -> bool:
    """Vérifie si ARIA est disponible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{BASE}/health")
            return r.status_code == 200
    except Exception:
        return False
