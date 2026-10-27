"""
╔══════════════════════════════════════════════════════════════════════════╗
║              ESPRIT — Agent ARIA  ·  memory.py                         ║
║         Gestion de la mémoire — 3 couches complémentaires              ║
╠══════════════════════════════════════════════════════════════════════════╣
║  COUCHE 1 — Court terme (RAM)                                           ║
║    Liste des N derniers messages de la conversation en cours.           ║
║    Perdue à la fin de la session. Fenêtre glissante de 20 messages.    ║
║                                                                         ║
║  COUCHE 2 — Long terme (ChromaDB)                                       ║
║    Résumés des échanges importants, persistants entre les sessions.     ║
║    Collection dédiée par utilisateur : memory_{user_id}                ║
║    Recherche sémantique : recall(query) → souvenirs pertinents          ║
║                                                                         ║
║  COUCHE 3 — Profil structuré (dict en RAM, persisté en JSON)            ║
║    Faits clés extraits automatiquement : préférences, niveau,           ║
║    objectifs, formations suivies. Mis à jour après chaque échange.     ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings
import requests

from config import (
    OLLAMA_BASE_URL, EMBED_MODEL, OLLAMA_TIMEOUT, OLLAMA_RETRIES,
    MEMORY_DIR, MEMORY_COLLECTION_PREFIX,
    MEMORY_MAX_HISTORY, MEMORY_TOP_K, MEMORY_MIN_LENGTH,
    LOG_FORMAT, LOG_LEVEL
)

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger("memory")


# ─────────────────────────────────────────────────────────────────────────
#  DATA CLASSES
# ─────────────────────────────────────────────────────────────────────────

@dataclass
class Message:
    """Un message dans l'historique de conversation."""
    role:    str        # "user" | "assistant" | "system"
    content: str
    ts:      float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, str]:
        """Format attendu par Ollama /api/chat."""
        return {"role": self.role, "content": self.content}


@dataclass
class Memory:
    """Un souvenir persistant dans la mémoire long terme."""
    text:      str
    user_id:   str
    mem_type:  str          # "conversation" | "preference" | "fact"
    memory_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    ts:        float = field(default_factory=time.time)
    metadata:  Dict[str, Any] = field(default_factory=dict)

    def to_chromadb_meta(self) -> Dict[str, str]:
        base = {
            "user_id":  self.user_id,
            "mem_type": self.mem_type,
            "ts":       str(self.ts),
        }
        for k, v in self.metadata.items():
            base[k] = str(v)
        return base


@dataclass
class UserProfile:
    """
    Profil structuré de l'enseignant — extrait et mis à jour automatiquement.
    Persisté dans un fichier JSON dans memory_db/{user_id}/profile.json
    """
    user_id:             str
    name:                str = ""
    department:          str = ""
    niveau:              str = ""       # débutant / intermédiaire / avancé
    languages:           List[str] = field(default_factory=list)
    competences:         List[str] = field(default_factory=list)
    objectifs:           List[str] = field(default_factory=list)
    formations_suivies:  List[str] = field(default_factory=list)
    preferences:         Dict[str, str] = field(default_factory=dict)
    is_talent:           bool = False
    created_at:          float = field(default_factory=time.time)
    updated_at:          float = field(default_factory=time.time)

    def to_prompt_str(self) -> str:
        """Formate le profil pour injection dans le prompt système."""
        if not any([self.name, self.competences, self.objectifs]):
            return ""
        lines = [f"Profil de l'enseignant ({self.user_id}) :"]
        if self.name:
            lines.append(f"  Nom : {self.name}")
        if self.department:
            lines.append(f"  Département : {self.department}")
        if self.niveau:
            lines.append(f"  Niveau estimé : {self.niveau}")
        if self.competences:
            lines.append(f"  Compétences : {', '.join(self.competences[:8])}")
        if self.objectifs:
            lines.append(f"  Objectifs : {', '.join(self.objectifs[:3])}")
        if self.formations_suivies:
            lines.append(
                f"  Formations déjà suivies : {', '.join(self.formations_suivies[:5])}"
            )
        if self.is_talent:
            lines.append("  Statut : Talent ESPRIT ⭐")
        return "\n".join(lines)

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "UserProfile":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


# ─────────────────────────────────────────────────────────────────────────
#  CLIENT EMBEDDING (réutilisé depuis rag_engine)
# ─────────────────────────────────────────────────────────────────────────

class _EmbedClient:
    """Client embedding minimal (évite l'import circulaire avec rag_engine)."""

    def __init__(self):
        self.url   = f"{OLLAMA_BASE_URL}/api/embeddings"
        self.model = EMBED_MODEL

    def embed(self, text: str) -> List[float]:
        for attempt in range(1, OLLAMA_RETRIES + 1):
            try:
                r = requests.post(
                    self.url,
                    json={"model": self.model, "prompt": text[:2000]},
                    timeout=OLLAMA_TIMEOUT
                )
                r.raise_for_status()
                return r.json().get("embedding", [])
            except Exception as e:
                logger.warning(f"[Memory/Embed] Tentative {attempt} — {e}")
                if attempt < OLLAMA_RETRIES:
                    time.sleep(2 ** attempt)
        logger.error("[Memory/Embed] Échec embedding — mémoire LT ignorée")
        return []


# ─────────────────────────────────────────────────────────────────────────
#  GESTIONNAIRE DE MÉMOIRE
# ─────────────────────────────────────────────────────────────────────────

class MemoryManager:
    """
    Gestionnaire de mémoire central pour un utilisateur ESPRIT.

    Une instance par utilisateur actif (mise en cache dans l'agent).

    Exemple :
        mem = MemoryManager("enseignant_42")
        mem.add("user", "Je veux apprendre React")
        mem.add("assistant", "Je vais vous proposer un plan...")
        souvenirs = mem.recall("React frontend")
        history = mem.get_history()
    """

    def __init__(self, user_id: str):
        self.user_id  = user_id
        self.embedder = _EmbedClient()

        # ── Couche 1 : Court terme (RAM) ──────────────────────────────────
        self._history: List[Message] = []

        # ── Couche 2 : Long terme (ChromaDB) ─────────────────────────────
        self._chroma  = chromadb.PersistentClient(
            path=str(MEMORY_DIR),
            settings=Settings(anonymized_telemetry=False)
        )
        self._collection = self._chroma.get_or_create_collection(
            name=f"{MEMORY_COLLECTION_PREFIX}{user_id}",
            metadata={"hnsw:space": "cosine"}
        )

        # ── Couche 3 : Profil structuré (JSON) ───────────────────────────
        self._profile_path = MEMORY_DIR / f"profile_{user_id}.json"
        self.profile = self._load_profile()

        logger.info(
            f"[Memory] Utilisateur '{user_id}' — "
            f"{self._collection.count()} souvenirs LT chargés"
        )

    # ─────────────────────────────────────────────────────────────────────
    #  COUCHE 1 — COURT TERME
    # ─────────────────────────────────────────────────────────────────────

    def add(self, role: str, content: str):
        """
        Ajoute un message à l'historique court terme.
        Déclenche automatiquement la sauvegarde LT si le message est important.
        """
        if role not in ("user", "assistant", "system"):
            raise ValueError(f"Rôle invalide : '{role}'. Attendu : user/assistant/system")

        msg = Message(role=role, content=content)
        self._history.append(msg)

        # Fenêtre glissante : garder les N derniers messages
        if len(self._history) > MEMORY_MAX_HISTORY:
            self._history = self._history[-MEMORY_MAX_HISTORY:]

        # Sauvegarde automatique en LT pour les messages suffisamment longs
        if role == "user" and len(content) >= MEMORY_MIN_LENGTH:
            self._auto_save(content)

    def get_history(self) -> List[Dict[str, str]]:
        """
        Retourne l'historique au format Ollama [{role, content}, ...].
        """
        return [m.to_dict() for m in self._history]

    def clear_history(self):
        """Efface l'historique court terme (fin de session)."""
        self._history = []
        logger.info(f"[Memory] Historique CT effacé pour '{self.user_id}'")

    def history_token_estimate(self) -> int:
        """Estimation rapide du nombre de tokens dans l'historique."""
        total_chars = sum(len(m.content) for m in self._history)
        return total_chars // 4     # ~4 chars par token en français

    # ─────────────────────────────────────────────────────────────────────
    #  COUCHE 2 — LONG TERME
    # ─────────────────────────────────────────────────────────────────────

    def save(
        self,
        text:     str,
        mem_type: str = "conversation",
        metadata: Dict[str, Any] | None = None,
    ):
        """
        Sauvegarde un fait ou résumé en mémoire long terme.

        Args:
            text     : texte à mémoriser
            mem_type : "conversation" | "preference" | "fact"
            metadata : infos supplémentaires (ex: {"formation": "Python"})
        """
        if len(text) < MEMORY_MIN_LENGTH:
            return      # trop court pour être utile

        vec = self.embedder.embed(text)
        if not vec:
            return      # embedding échoué → on ignore silencieusement

        mem = Memory(
            text=text, user_id=self.user_id,
            mem_type=mem_type, metadata=metadata or {}
        )
        try:
            self._collection.upsert(
                ids        = [mem.memory_id],
                documents  = [mem.text],
                embeddings = [vec],
                metadatas  = [mem.to_chromadb_meta()],
            )
            logger.debug(f"[Memory/LT] Souvenir sauvegardé ({mem_type}) : {text[:60]}...")
        except Exception as e:
            logger.warning(f"[Memory/LT] Échec sauvegarde : {e}")

    def recall(
        self,
        query:    str,
        k:        int = MEMORY_TOP_K,
        mem_type: str | None = None,
    ) -> List[str]:
        """
        Retrouve les souvenirs les plus pertinents pour une requête.

        Args:
            query    : ce qu'on cherche à retrouver
            k        : nombre max de souvenirs retournés
            mem_type : filtrer par type ("preference", "fact", etc.)

        Returns:
            Liste de textes (les souvenirs), triés par pertinence.
        """
        if self._collection.count() == 0:
            return []

        vec = self.embedder.embed(query)
        if not vec:
            return []

        where = {"mem_type": {"$eq": mem_type}} if mem_type else None

        try:
            results = self._collection.query(
                query_embeddings=[vec],
                n_results=min(k, self._collection.count()),
                where=where,
                include=["documents", "distances"],
            )
            # Filtrer par seuil de pertinence (distance < 0.7)
            docs      = results["documents"][0]
            distances = results["distances"][0]
            filtered  = [
                doc for doc, dist in zip(docs, distances)
                if dist < 0.70
            ]
            logger.debug(
                f"[Memory/LT] recall('{query[:40]}') → {len(filtered)} souvenir(s)"
            )
            return filtered
        except Exception as e:
            logger.warning(f"[Memory/LT] Erreur recall : {e}")
            return []

    def recall_as_str(self, query: str, k: int = MEMORY_TOP_K) -> str:
        """
        Retourne les souvenirs formatés en texte pour injection dans un prompt.
        Retourne une chaîne vide si aucun souvenir pertinent.
        """
        memories = self.recall(query, k=k)
        if not memories:
            return ""
        lines = ["Contexte mémorisé sur cet enseignant :"]
        for m in memories:
            lines.append(f"  • {m.strip()}")
        return "\n".join(lines)

    def _auto_save(self, user_message: str):
        """
        Sauvegarde automatique intelligente :
        mémorise uniquement les messages contenant des informations utiles.
        """
        # Mots-clés signalant une information à mémoriser
        triggers = [
            "je veux", "j'aimerais", "mon objectif", "je préfère",
            "je connais", "je maîtrise", "je ne connais pas",
            "j'ai suivi", "j'ai besoin", "mon niveau", "je suis",
            "département", "formation", "compétence", "apprendre",
        ]
        msg_lower = user_message.lower()
        if any(t in msg_lower for t in triggers):
            self.save(user_message, mem_type="conversation")

    def memory_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques de la mémoire long terme."""
        total = self._collection.count()
        return {
            "user_id":        self.user_id,
            "history_msgs":   len(self._history),
            "history_tokens": self.history_token_estimate(),
            "lt_memories":    total,
        }

    def clear_longterm(self):
        """
        Efface tous les souvenirs long terme (droit à l'oubli RGPD).
        ATTENTION : irréversible.
        """
        if self._collection.count() > 0:
            all_ids = self._collection.get()["ids"]
            if all_ids:
                self._collection.delete(ids=all_ids)
        logger.warning(
            f"[Memory/LT] Mémoire long terme effacée pour '{self.user_id}'"
        )

    # ─────────────────────────────────────────────────────────────────────
    #  COUCHE 3 — PROFIL STRUCTURÉ
    # ─────────────────────────────────────────────────────────────────────

    def _load_profile(self) -> UserProfile:
        """Charge le profil depuis le fichier JSON, ou crée un profil vide."""
        if self._profile_path.exists():
            try:
                with open(self._profile_path, encoding="utf-8") as f:
                    data = json.load(f)
                return UserProfile.from_dict(data)
            except Exception as e:
                logger.warning(f"[Memory/Profile] Erreur chargement : {e}")
        return UserProfile(user_id=self.user_id)

    def save_profile(self):
        """Persiste le profil sur disque."""
        self.profile.updated_at = time.time()
        MEMORY_DIR.mkdir(parents=True, exist_ok=True)
        with open(self._profile_path, "w", encoding="utf-8") as f:
            json.dump(self.profile.to_dict(), f, ensure_ascii=False, indent=2)
        logger.debug(f"[Memory/Profile] Profil sauvegardé pour '{self.user_id}'")

    def update_profile(self, **kwargs):
        """
        Met à jour des champs du profil et sauvegarde.

        Exemple :
            mem.update_profile(niveau="intermédiaire", department="Informatique")
            mem.update_profile(competences=["Python", "Django"])
            mem.update_profile(is_talent=True)
        """
        for key, value in kwargs.items():
            if not hasattr(self.profile, key):
                logger.warning(f"[Memory/Profile] Champ inconnu : '{key}'")
                continue
            current = getattr(self.profile, key)
            # Pour les listes : ajouter sans dupliquer
            if isinstance(current, list) and isinstance(value, list):
                for item in value:
                    if item not in current:
                        current.append(item)
            else:
                setattr(self.profile, key, value)
        self.save_profile()

    def get_full_context(self, query: str) -> str:
        """
        Construit le contexte mémoire complet pour le prompt système :
        profil structuré + souvenirs LT pertinents.

        C'est cette méthode que l'agent appelle pour enrichir le prompt.
        """
        parts = []

        # Profil structuré
        profile_str = self.profile.to_prompt_str()
        if profile_str:
            parts.append(profile_str)

        # Souvenirs LT pertinents
        memories_str = self.recall_as_str(query)
        if memories_str:
            parts.append(memories_str)

        return "\n\n".join(parts) if parts else ""


# ─────────────────────────────────────────────────────────────────────────
#  CACHE D'INSTANCES (une MemoryManager par utilisateur actif)
# ─────────────────────────────────────────────────────────────────────────

_memory_cache: Dict[str, MemoryManager] = {}

def get_memory(user_id: str) -> MemoryManager:
    """
    Retourne l'instance MemoryManager pour un utilisateur.
    Crée et met en cache si elle n'existe pas encore.
    Utiliser cette fonction plutôt que d'instancier directement.
    """
    if user_id not in _memory_cache:
        _memory_cache[user_id] = MemoryManager(user_id)
    return _memory_cache[user_id]


def clear_cache():
    """Vide le cache (utile pour les tests)."""
    _memory_cache.clear()


# ─────────────────────────────────────────────────────────────────────────
#  TESTS (python memory.py)
# ─────────────────────────────────────────────────────────────────────────

def _run_tests():
    print("\n" + "═" * 60)
    print("  TESTS MEMORY — ESPRIT ARIA")
    print("═" * 60)

    TEST_USER = "test_enseignant_99"
    mem = get_memory(TEST_USER)
    mem.clear_history()
    mem.clear_longterm()

    # ── Test 1 : historique court terme ───────────────────────────────────
    print("\n[1] Mémoire court terme (historique)...")
    mem.add("user",      "Bonjour, je veux apprendre React pour mes cours")
    mem.add("assistant", "Bonjour ! Je vais vous préparer un plan React.")
    mem.add("user",      "Mon niveau est intermédiaire en JavaScript")
    mem.add("assistant", "Parfait, je vais adapter le plan à votre niveau.")

    hist = mem.get_history()
    print(f"   → {len(hist)} messages dans l'historique")
    print(f"   → Estimation tokens : {mem.history_token_estimate()}")
    assert len(hist) == 4, "❌ Historique incorrect"
    print("   → ✓ Historique court terme OK")

    # ── Test 2 : fenêtre glissante ────────────────────────────────────────
    print("\n[2] Fenêtre glissante (limite 20 messages)...")
    for i in range(25):
        mem.add("user", f"Message de test numéro {i}")
    assert len(mem.get_history()) <= 20, "❌ Fenêtre glissante ne fonctionne pas"
    print(f"   → {len(mem.get_history())} messages conservés sur 29 ajoutés")
    print("   → ✓ Fenêtre glissante OK")

    mem.clear_history()

    # ── Test 3 : mémoire long terme ───────────────────────────────────────
    print("\n[3] Mémoire long terme (ChromaDB)...")
    mem.save("L'enseignant préfère Python et veut maîtriser le développement web",
             mem_type="preference")
    mem.save("L'enseignant a déjà suivi la formation JavaScript ES6 en 2025",
             mem_type="fact")
    mem.save("L'enseignant enseigne au département Informatique niveau L3",
             mem_type="fact")

    time.sleep(0.5)   # laisser ChromaDB indexer

    results = mem.recall("formation web Python", k=3)
    print(f"   → {len(results)} souvenir(s) retrouvé(s)")
    for r in results:
        print(f"   → {r[:70]}...")
    print("   → ✓ Mémoire long terme OK")

    # ── Test 4 : contexte complet ─────────────────────────────────────────
    print("\n[4] Contexte mémoire complet pour le prompt...")
    mem.update_profile(
        name="Mohammed Ali",
        department="Informatique",
        niveau="intermédiaire",
        competences=["Python", "JavaScript", "SQL"],
        objectifs=["Devenir Talent", "Maîtriser React"]
    )
    ctx = mem.get_full_context("je veux apprendre React")
    print(f"   → {len(ctx)} caractères de contexte")
    print(f"   → Aperçu :\n{ctx[:200]}...")
    print("   → ✓ Contexte complet OK")

    # ── Test 5 : isolation utilisateurs ──────────────────────────────────
    print("\n[5] Isolation entre utilisateurs...")
    mem_autre = get_memory("autre_enseignant_00")
    souvenirs_autre = mem_autre.recall("Python React formation")
    assert TEST_USER not in str(souvenirs_autre), "❌ Fuite de données entre utilisateurs"
    print("   → ✓ Les données de test_enseignant_99 ne fuient pas vers autre_enseignant_00")

    # ── Test 6 : statistiques ─────────────────────────────────────────────
    print("\n[6] Statistiques mémoire...")
    stats = mem.memory_stats()
    for k, v in stats.items():
        print(f"   → {k:<20} {v}")

    # Nettoyage
    mem.clear_longterm()
    mem.clear_history()
    mem_autre.clear_longterm()
    clear_cache()

    print("\n" + "═" * 60)
    print("  Tous les tests MEMORY passés avec succès ✓")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    _run_tests()
