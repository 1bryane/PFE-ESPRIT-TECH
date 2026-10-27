"""
╔══════════════════════════════════════════════════════════════════════════╗
║         ESPRIT Talents — Backend principal  ·  main.py                 ║
║         FastAPI N-Tier — Port 8002                                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Services connectés :                                                   ║
║    ML Engine  → http://localhost:8000 (matching compétences)            ║
║    ARIA Agent → http://localhost:8001 (agent IA pédagogique)            ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.database import init_db

# Routers (importés après init pour éviter les imports circulaires)
from api import auth, users, offres, candidatures, evaluations, formations, chat, aria, notifications, formations_proposees, avantages, rapports, recommandations, plans_carriere, distinctions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialisation au démarrage : crée les tables + seed si vide."""
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plateforme de gestion des talents ESPRIT — Backend API",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Fichiers statiques (photos de profil, CV uploadés) ───────────────────
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────
app.include_router(auth.router,         prefix="/auth",         tags=["Auth"])
app.include_router(users.router,        prefix="/users",        tags=["Utilisateurs"])
app.include_router(offres.router,       prefix="/offres",       tags=["Offres"])
app.include_router(candidatures.router, prefix="/candidatures", tags=["Candidatures"])
app.include_router(evaluations.router,  prefix="/evaluations",  tags=["Évaluations"])
app.include_router(formations.router,   prefix="/formations",   tags=["Formations"])
app.include_router(chat.router,          prefix="/chat",          tags=["Chat"])
app.include_router(aria.router,          prefix="/aria",          tags=["ARIA"])
app.include_router(notifications.router,        prefix="/notifications",        tags=["Notifications"])
app.include_router(formations_proposees.router, prefix="/formations-proposees", tags=["Formations ARIA"])
app.include_router(avantages.router,            prefix="/avantages",           tags=["Avantages Talents"])
app.include_router(rapports.router,             prefix="/rapports",            tags=["Rapports PDF"])
app.include_router(recommandations.router,      prefix="/recommandations",     tags=["Recommandations Talent"])
app.include_router(plans_carriere.router,       prefix="/plans-carriere",      tags=["Plans de Carrière"])
app.include_router(distinctions.router,         prefix="/distinctions",        tags=["Distinctions"])


# ── Health check ──────────────────────────────────────────────────────────
@app.get("/health", tags=["Système"])
def health():
    import httpx
    services = {}
    for name, url in [("aria", settings.ARIA_URL), ("ml", settings.ML_URL)]:
        try:
            r = httpx.get(f"{url}/health", timeout=3)
            services[name] = "ok" if r.status_code == 200 else "erreur"
        except Exception:
            services[name] = "hors ligne"
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "services": services,
    }


# ── Lancement direct ──────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
