"""
Client HTTP vers le microservice ML (SCRIPT_PYTHON_ML — port 8000).
Toutes les fonctions sont async pour ne pas bloquer FastAPI.
"""

import httpx
from core.config import settings

BASE = settings.ML_URL
TIMEOUT = 30.0


async def extract_cv_skills(pdf_bytes: bytes) -> dict:
    """
    Envoie un PDF au moteur ML et retourne le profil extrait.
    Retour : {all_skill_names: [...], skills_by_category: {...}, ...}
    """
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/extract/pdf",
            files={"file": ("cv.pdf", pdf_bytes, "application/pdf")},
        )
        r.raise_for_status()
        return r.json()


async def score_match(cv_text: str, offre_skills: list) -> dict:
    """
    Score de matching entre un texte CV et une liste de compétences requises.
    Retour : {score_global: float, matched_skills: [...], ...}
    """
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{BASE}/match",
            json={
                "cv_text": cv_text,
                "offer": {
                    "offer_id": "temp",
                    "required_skills": offre_skills,
                }
            },
        )
        r.raise_for_status()
        return r.json()


async def rank_candidates(candidates: list[dict], offre_skills: list, description: str = "") -> list:
    """
    Rank N candidats contre une offre.
    candidates : [{"candidate_id": str, "cv_text": str}, ...]
    Retour : liste triée [{candidate_id, score_global, matched_skills, ...}]
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            f"{BASE}/rank",
            json={
                "candidates": candidates,
                "offer": {
                    "offer_id": "rank",
                    "required_skills": offre_skills,
                    "description": description,
                }
            },
        )
        r.raise_for_status()
        return r.json()


async def ml_health() -> bool:
    """Vérifie si le service ML est disponible."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{BASE}/health")
            return r.status_code == 200
    except Exception:
        return False
