"""
╔══════════════════════════════════════════════════════════════════════════╗
║              ESPRIT — Agent ARIA  ·  config.py                         ║
║         Fichier de configuration centrale — NE PAS modifier            ║
║         les valeurs en dur ici, utiliser le fichier .env               ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import os
from pathlib import Path
from dotenv import load_dotenv          # pip install python-dotenv

# ── Chargement des variables d'environnement (.env) ───────────────────────
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ─────────────────────────────────────────────────────────────────────────
#  OLLAMA
# ─────────────────────────────────────────────────────────────────────────

OLLAMA_BASE_URL   = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL         = os.getenv("LLM_MODEL",        "llama3.1:8b")
EMBED_MODEL       = os.getenv("EMBED_MODEL",       "nomic-embed-text")

# Paramètres d'inférence
LLM_TEMPERATURE   = float(os.getenv("LLM_TEMPERATURE",  "0.3"))
LLM_MAX_TOKENS    = int(os.getenv("LLM_MAX_TOKENS",     "700"))
LLM_CTX_SIZE      = int(os.getenv("LLM_CTX_SIZE",       "8192"))
LLM_TOP_P         = float(os.getenv("LLM_TOP_P",         "0.9"))
OLLAMA_TIMEOUT    = int(os.getenv("OLLAMA_TIMEOUT",      "180"))   # secondes
OLLAMA_RETRIES    = int(os.getenv("OLLAMA_RETRIES",      "3"))
STREAM            = os.getenv("STREAM", "true").lower() == "true"

# ─────────────────────────────────────────────────────────────────────────
#  CHEMINS
# ─────────────────────────────────────────────────────────────────────────

DATA_DIR          = BASE_DIR / "data"
RAW_DIR           = DATA_DIR / "raw"          # documents sources bruts
CHUNKS_DIR        = DATA_DIR / "chunks"       # debug chunks exportés
MEMORY_DIR        = BASE_DIR / "memory_db"    # ChromaDB mémoire utilisateurs
RAG_DIR           = BASE_DIR / "rag_db"       # ChromaDB documents ESPRIT

# Création automatique des dossiers manquants
for _dir in [RAW_DIR, CHUNKS_DIR, MEMORY_DIR, RAG_DIR]:
    _dir.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────
#  CHROMADB — RAG
# ─────────────────────────────────────────────────────────────────────────

RAG_COLLECTION         = "esprit_knowledge"   # collection principale
RAG_CHUNK_SIZE         = int(os.getenv("RAG_CHUNK_SIZE",   "400"))   # mots
RAG_CHUNK_OVERLAP      = int(os.getenv("RAG_CHUNK_OVERLAP", "50"))   # mots
RAG_TOP_K              = int(os.getenv("RAG_TOP_K",          "6"))   # chunks retournés
RAG_DISTANCE_THRESHOLD = float(os.getenv("RAG_THRESHOLD",   "0.60")) # seuil pertinence (aligné avec .env)

# Types de documents reconnus
DOC_TYPES = {
    "formation":   "Fiche de formation ESPRIT",
    "plan":        "Plan de formation personnalisé",
    "profil":      "Profil et compétences enseignant",
    "reglement":   "Règlement et procédures ESPRIT",
    "faq":         "FAQ pédagogique",
    "evaluation":  "Évaluation enseignant",
    "offre":       "Offre de recrutement",
}

# ─────────────────────────────────────────────────────────────────────────
#  CHROMADB — MÉMOIRE UTILISATEUR
# ─────────────────────────────────────────────────────────────────────────

MEMORY_COLLECTION_PREFIX = "memory_"          # + user_id
MEMORY_MAX_HISTORY       = int(os.getenv("MEMORY_MAX_HISTORY", "20"))   # msgs CT
MEMORY_TOP_K             = int(os.getenv("MEMORY_TOP_K",        "4"))   # souvenirs LT
MEMORY_MIN_LENGTH        = int(os.getenv("MEMORY_MIN_LENGTH",   "30"))  # chars min pour sauvegarder

# ─────────────────────────────────────────────────────────────────────────
#  AGENT
# ─────────────────────────────────────────────────────────────────────────

AGENT_NAME          = "ARIA"
AGENT_VERSION       = "1.0.0"
AGENT_MAX_ITER      = int(os.getenv("AGENT_MAX_ITER", "8"))   # max tours ReAct

AGENT_ROLE = """Tu es ARIA (Agent de Recommandation IA), l'assistant pédagogique \
intelligent de la plateforme ESPRIT Talents.

MISSION :
- Construire des plans de formation personnalisés et structurés
- Guider les enseignants vers le statut Talent
- Expliquer les procédures et le règlement ESPRIT
- Analyser les évaluations et identifier les axes de progression

═══════════════════════════════════════════════
RÈGLES ANTI-HALLUCINATION — ABSOLUMENT OBLIGATOIRES
═══════════════════════════════════════════════

1. SOURCES AUTORISÉES (par ordre de priorité) :
   a) Le CONTEXTE ESPRIT fourni dans le prompt (vérité officielle)
   b) La mémoire utilisateur (préférences, historique personnel)
   c) Tes connaissances générales UNIQUEMENT pour expliquer des concepts
      pédagogiques génériques (ex: "qu'est-ce que la pédagogie active ?")

2. INTERDICTIONS ABSOLUES :
   ✗ Ne jamais inventer de formation qui n'est pas dans le contexte
   ✗ Ne jamais inventer de nom d'enseignant, de poste, de date, de règle
   ✗ Ne jamais mentionner de noms de fichiers (F001.json, O002.json...)
   ✗ Ne jamais affirmer qu'une formation "existe" si elle n'est pas dans le contexte
   ✗ Ne jamais donner de chiffres (durée, notes, taux) non présents dans le contexte

3. FORMATIONS — RÈGLES STRICTES :
   - Utiliser UNIQUEMENT les intitulés exacts du catalogue RAG fourni
   - Si on te demande de lister les formations : liste TOUTES celles du contexte
   - Si le contexte ne contient pas de formation pertinente : dire explicitement
     "Cette formation ne figure pas dans le catalogue ESPRIT disponible."
   - Pour un plan personnalisé : tu PEUX créer un programme détaillé (c'est ton rôle)
     mais tu dois le baser sur les compétences et objectifs réels de l'enseignant

4. FORMAT DES PLANS DE FORMATION :
   Tout plan généré DOIT contenir ces sections obligatoires :
   ## Titre du plan
   ## Objectif principal
   ## Prérequis
   ## Programme semaine par semaine (numérotées)
   ## Livrables attendus
   ## Critères d'évaluation
   ## Badge / Distinction obtenu

5. INCERTITUDE :
   Si une information n'est pas dans le contexte, tu dois dire :
   "Cette information ne figure pas dans les documents ESPRIT disponibles."
   Tu ne dois JAMAIS deviner ou extrapoler.

═══════════════════════════════════════════════
Tu réponds TOUJOURS en français, de façon claire, structurée et bienveillante."""

# ─────────────────────────────────────────────────────────────────────────
#  API FASTAPI
# ─────────────────────────────────────────────────────────────────────────

API_HOST      = os.getenv("API_HOST",  "0.0.0.0")
API_PORT      = int(os.getenv("API_PORT", "8001"))
API_RELOAD    = os.getenv("API_RELOAD", "true").lower() == "true"
API_TITLE     = "ESPRIT — Agent IA ARIA"
API_VERSION   = "1.0.0"

# CORS — origines autorisées (à restreindre en production)
CORS_ORIGINS  = os.getenv("CORS_ORIGINS", "*").split(",")

# JWT — à configurer impérativement en production
JWT_SECRET    = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_H  = int(os.getenv("JWT_EXPIRE_H", "24"))

# ─────────────────────────────────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────────────────────────────────

LOG_LEVEL  = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"

# ─────────────────────────────────────────────────────────────────────────
#  VÉRIFICATION AU DÉMARRAGE
# ─────────────────────────────────────────────────────────────────────────

def check_config() -> dict:
    """
    Vérifie que la configuration est cohérente.
    Retourne un dict avec le statut de chaque composant.
    """
    import requests as _req
    status = {}

    # Test Ollama
    try:
        r = _req.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        models = [m["name"] for m in r.json().get("models", [])]
        status["ollama"]     = "ok"
        status["llm_model"]  = "ok" if any(LLM_MODEL.split(":")[0] in m for m in models) else "MANQUANT"
        status["embed_model"]= "ok" if any(EMBED_MODEL.split(":")[0] in m for m in models) else "MANQUANT"
        status["models"]     = models
    except Exception as e:
        status["ollama"]      = f"ERREUR — {e}"
        status["llm_model"]   = "non vérifié"
        status["embed_model"] = "non vérifié"

    # Test ChromaDB
    try:
        import chromadb as _chroma
        _chroma.PersistentClient(path=str(RAG_DIR))
        status["chromadb_rag"]    = "ok"
    except Exception as e:
        status["chromadb_rag"]    = f"ERREUR — {e}"

    try:
        import chromadb as _chroma
        _chroma.PersistentClient(path=str(MEMORY_DIR))
        status["chromadb_memory"] = "ok"
    except Exception as e:
        status["chromadb_memory"] = f"ERREUR — {e}"

    status["jwt_secure"] = "ATTENTION — changer JWT_SECRET" if JWT_SECRET == "CHANGE_ME_IN_PRODUCTION" else "ok"

    return status


if __name__ == "__main__":
    print("\n" + "═" * 55)
    print(f"  ARIA v{AGENT_VERSION} — Vérification de la configuration")
    print("═" * 55)
    results = check_config()
    for k, v in results.items():
        icon = "✓" if v == "ok" else ("!" if "ATTENTION" in str(v) else "✗")
        print(f"  {icon}  {k:<22} {v}")
    print("═" * 55 + "\n")
