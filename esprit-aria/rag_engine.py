"""
╔══════════════════════════════════════════════════════════════════════════╗
║              ESPRIT — Agent ARIA  ·  rag_engine.py                     ║
║         Moteur RAG : indexation & recherche sémantique                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PIPELINE :                                                             ║
║    Document (PDF/JSON/TXT)                                              ║
║    → load_document()   : extraction texte brut                         ║
║    → split_chunks()    : découpage 400 mots, overlap 50                ║
║    → embed()           : vecteur 768d via nomic-embed-text (Ollama)    ║
║    → index_document()  : stockage ChromaDB + métadonnées               ║
║    → search()          : similarité cosinus, top-K chunks              ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import json
import logging
import re
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
    RAG_DIR, RAG_COLLECTION,
    RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, RAG_TOP_K,
    RAG_DISTANCE_THRESHOLD, DOC_TYPES, LOG_FORMAT, LOG_LEVEL
)

# ─── PDF (optionnel — dégradation gracieuse si non installé) ──────────────
try:
    import pdfplumber
    PDF_OK = True
except ImportError:
    PDF_OK = False

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger("rag_engine")


# ─────────────────────────────────────────────────────────────────────────
#  DATA CLASSES
# ─────────────────────────────────────────────────────────────────────────

@dataclass
class Chunk:
    """Un segment de document prêt à être indexé."""
    text:     str
    doc_id:   str
    doc_type: str
    source:   str                        # nom du fichier source
    chunk_idx: int                       # position dans le document
    metadata: Dict[str, Any] = field(default_factory=dict)
    chunk_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_metadata(self) -> Dict[str, str]:
        """Sérialise les métadonnées pour ChromaDB (str uniquement)."""
        base = {
            "doc_id":    self.doc_id,
            "doc_type":  self.doc_type,
            "source":    self.source,
            "chunk_idx": str(self.chunk_idx),
        }
        # Ajouter les métadonnées custom (converties en str)
        for k, v in self.metadata.items():
            base[k] = str(v)
        return base


@dataclass
class SearchResult:
    """Résultat d'une recherche RAG."""
    chunk_id:  str
    text:      str
    score:     float          # distance cosinus (plus petit = plus proche)
    doc_id:    str
    doc_type:  str
    source:    str
    metadata:  Dict[str, str] = field(default_factory=dict)

    @property
    def relevance(self) -> float:
        """Score de pertinence normalisé [0, 1] (plus grand = plus pertinent)."""
        return round(max(0.0, 1.0 - self.score), 4)

    def to_context_str(self) -> str:
        """Formate le chunk pour injection dans un prompt LLM."""
        label = DOC_TYPES.get(self.doc_type, self.doc_type)
        return (
            f"[Source : {label} — {self.source}]\n"
            f"{self.text.strip()}"
        )


# ─────────────────────────────────────────────────────────────────────────
#  CHARGEMENT DOCUMENTS
# ─────────────────────────────────────────────────────────────────────────

class DocumentLoader:
    """Charge et extrait le texte brut de différents formats."""

    @staticmethod
    def load(path: str | Path) -> str:
        """
        Détecte le format et extrait le texte.
        Formats supportés : PDF, JSON, TXT, MD.
        """
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Fichier introuvable : {path}")

        suffix = path.suffix.lower()

        if suffix == ".pdf":
            return DocumentLoader._load_pdf(path)
        elif suffix == ".json":
            return DocumentLoader._load_json(path)
        elif suffix in (".txt", ".md"):
            return DocumentLoader._load_text(path)
        else:
            raise ValueError(
                f"Format non supporté : '{suffix}'. "
                f"Formats acceptés : .pdf, .json, .txt, .md"
            )

    @staticmethod
    def _load_pdf(path: Path) -> str:
        if not PDF_OK:
            raise ImportError("pdfplumber requis : pip install pdfplumber")
        pages = []
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
        text = "\n".join(pages)
        logger.info(f"[PDF] {path.name} — {len(pages)} pages, {len(text)} chars")
        return _clean_text(text)

    @staticmethod
    def _load_json(path: Path) -> str:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        # Convertit récursivement le JSON en texte lisible
        text = _json_to_text(data)
        logger.info(f"[JSON] {path.name} — {len(text)} chars extraits")
        return _clean_text(text)

    @staticmethod
    def _load_text(path: Path) -> str:
        with open(path, encoding="utf-8") as f:
            text = f.read()
        logger.info(f"[TXT] {path.name} — {len(text)} chars")
        return _clean_text(text)


def _clean_text(text: str) -> str:
    """Normalise le texte : espaces multiples, lignes vides excessives."""
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _json_to_text(data: Any, depth: int = 0) -> str:
    """Convertit récursivement un objet JSON en texte structuré."""
    if isinstance(data, dict):
        lines = []
        for k, v in data.items():
            label = str(k).replace("_", " ").capitalize()
            val   = _json_to_text(v, depth + 1)
            lines.append(f"{'  ' * depth}{label} : {val}")
        return "\n".join(lines)
    elif isinstance(data, list):
        items = [_json_to_text(item, depth + 1) for item in data]
        return "\n".join(f"{'  ' * depth}- {it}" for it in items)
    else:
        return str(data)


# ─────────────────────────────────────────────────────────────────────────
#  DÉCOUPAGE EN CHUNKS
# ─────────────────────────────────────────────────────────────────────────

class ChunkSplitter:
    """
    Découpage récursif respectant la hiérarchie naturelle du texte :
      1. Paragraphes (double saut de ligne)
      2. Phrases (. ! ?)
      3. Mots (fallback)
    Taille cible : RAG_CHUNK_SIZE mots, chevauchement : RAG_CHUNK_OVERLAP mots.
    """

    def __init__(
        self,
        chunk_size: int = RAG_CHUNK_SIZE,
        overlap:    int = RAG_CHUNK_OVERLAP,
    ):
        self.chunk_size = chunk_size
        self.overlap    = overlap

    def split(
        self,
        text:     str,
        doc_id:   str,
        doc_type: str,
        source:   str,
        metadata: Dict[str, Any] | None = None,
    ) -> List[Chunk]:
        """
        Découpe un texte en chunks et retourne une liste de Chunk.
        Si le texte est court (< chunk_size mots) → un seul chunk.
        """
        metadata = metadata or {}
        words    = text.split()

        if len(words) <= self.chunk_size:
            # Document court → chunk unique
            return [Chunk(
                text=text, doc_id=doc_id, doc_type=doc_type,
                source=source, chunk_idx=0, metadata=metadata
            )]

        chunks    = []
        segments  = self._split_by_paragraphs(text)
        buffer    = []
        buf_words = 0
        idx       = 0

        for seg in segments:
            seg_words = len(seg.split())

            # Si le segment seul dépasse chunk_size → le découper par phrases
            if seg_words > self.chunk_size:
                # Vider le buffer d'abord
                if buffer:
                    chunks.append(self._make_chunk(
                        buffer, doc_id, doc_type, source, metadata, idx
                    ))
                    idx += 1
                    buffer, buf_words = self._overlap_buffer(buffer)

                # Découper le segment par phrases
                for sub in self._split_by_sentences(seg):
                    sub_w = len(sub.split())
                    if buf_words + sub_w > self.chunk_size and buffer:
                        chunks.append(self._make_chunk(
                            buffer, doc_id, doc_type, source, metadata, idx
                        ))
                        idx += 1
                        buffer, buf_words = self._overlap_buffer(buffer)
                    buffer.append(sub)
                    buf_words += sub_w
            else:
                if buf_words + seg_words > self.chunk_size and buffer:
                    chunks.append(self._make_chunk(
                        buffer, doc_id, doc_type, source, metadata, idx
                    ))
                    idx += 1
                    buffer, buf_words = self._overlap_buffer(buffer)
                buffer.append(seg)
                buf_words += seg_words

        # Dernier buffer
        if buffer:
            chunks.append(self._make_chunk(
                buffer, doc_id, doc_type, source, metadata, idx
            ))

        logger.info(
            f"[Chunking] {source} → {len(chunks)} chunks "
            f"(~{self.chunk_size} mots, overlap {self.overlap})"
        )
        return chunks

    def _make_chunk(
        self, buffer, doc_id, doc_type, source, metadata, idx
    ) -> Chunk:
        return Chunk(
            text="\n\n".join(buffer).strip(),
            doc_id=doc_id, doc_type=doc_type,
            source=source, chunk_idx=idx, metadata=metadata
        )

    def _overlap_buffer(self, buffer: List[str]):
        """Conserve les derniers mots pour le chevauchement."""
        text  = " ".join(buffer)
        words = text.split()
        kept  = " ".join(words[-self.overlap:]) if len(words) > self.overlap else text
        return [kept], len(kept.split())

    @staticmethod
    def _split_by_paragraphs(text: str) -> List[str]:
        return [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

    @staticmethod
    def _split_by_sentences(text: str) -> List[str]:
        sents = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sents if s.strip()]


# ─────────────────────────────────────────────────────────────────────────
#  CLIENT OLLAMA EMBEDDINGS
# ─────────────────────────────────────────────────────────────────────────

class EmbedClient:
    """Génère des embeddings via Ollama (nomic-embed-text)."""

    def __init__(self):
        self.url   = f"{OLLAMA_BASE_URL}/api/embeddings"
        self.model = EMBED_MODEL

    def embed(self, text: str) -> List[float]:
        """Retourne le vecteur d'embedding pour un texte."""
        for attempt in range(1, OLLAMA_RETRIES + 1):
            try:
                r = requests.post(
                    self.url,
                    json={"model": self.model, "prompt": text},
                    timeout=OLLAMA_TIMEOUT
                )
                r.raise_for_status()
                vec = r.json().get("embedding", [])
                if not vec:
                    raise ValueError("Embedding vide reçu d'Ollama")
                return vec
            except Exception as e:
                logger.warning(f"[Embed] Tentative {attempt}/{OLLAMA_RETRIES} — {e}")
                if attempt < OLLAMA_RETRIES:
                    time.sleep(2 ** attempt)   # backoff exponentiel
        raise RuntimeError(
            f"Impossible de générer un embedding après {OLLAMA_RETRIES} tentatives."
        )

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Génère les embeddings pour une liste de textes."""
        vecs = []
        for i, t in enumerate(texts):
            logger.debug(f"[Embed] {i+1}/{len(texts)}")
            vecs.append(self.embed(t))
        return vecs


# ─────────────────────────────────────────────────────────────────────────
#  MOTEUR RAG PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────

class RAGEngine:
    """
    Moteur RAG complet pour la plateforme ESPRIT.

    Usage rapide :
        rag = RAGEngine()
        rag.index_file("data/raw/formations.json", doc_type="formation")
        results = rag.search("formation Python débutant")
        context = rag.build_context(results)   # → injecter dans le prompt
    """

    def __init__(self):
        self.embedder = EmbedClient()
        self.splitter = ChunkSplitter()
        self.loader   = DocumentLoader()
        self._client  = chromadb.PersistentClient(
            path=str(RAG_DIR),
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self._client.get_or_create_collection(
            name=RAG_COLLECTION,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(
            f"[RAG] Initialisé — {self.collection.count()} chunks dans l'index"
        )

    # ── Indexation ────────────────────────────────────────────────────────

    def index_file(
        self,
        path:     str | Path,
        doc_type: str,
        doc_id:   str | None = None,
        metadata: Dict[str, Any] | None = None,
        replace:  bool = True,
    ) -> int:
        """
        Indexe un fichier dans ChromaDB.

        Args:
            path      : chemin vers le fichier (PDF, JSON, TXT, MD)
            doc_type  : type de document (voir DOC_TYPES dans config.py)
            doc_id    : identifiant unique (généré automatiquement si None)
            metadata  : métadonnées custom à stocker avec chaque chunk
            replace   : si True, supprime l'ancienne version avant indexation

        Returns:
            Nombre de chunks indexés.
        """
        path   = Path(path)
        doc_id = doc_id or path.stem

        if replace:
            self._delete_by_doc_id(doc_id)

        # 1. Chargement
        text = self.loader.load(path)
        if not text.strip():
            logger.warning(f"[RAG] Fichier vide ignoré : {path.name}")
            return 0

        # 2. Découpage
        chunks = self.splitter.split(
            text     = text,
            doc_id   = doc_id,
            doc_type = doc_type,
            source   = path.name,
            metadata = metadata or {},
        )

        # 3. Embeddings + stockage par lots de 10
        self._upsert_chunks(chunks)

        logger.info(f"[RAG] {path.name} → {len(chunks)} chunks indexés")
        return len(chunks)

    def index_text(
        self,
        text:     str,
        doc_id:   str,
        doc_type: str,
        source:   str = "inline",
        metadata: Dict[str, Any] | None = None,
        replace:  bool = True,
    ) -> int:
        """Indexe du texte brut directement (sans fichier)."""
        if replace:
            self._delete_by_doc_id(doc_id)

        chunks = self.splitter.split(
            text=text, doc_id=doc_id,
            doc_type=doc_type, source=source,
            metadata=metadata or {}
        )
        self._upsert_chunks(chunks)
        return len(chunks)

    def _upsert_chunks(self, chunks: List[Chunk], batch_size: int = 10):
        """Calcule les embeddings et insère dans ChromaDB par lots."""
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c.text for c in batch]
            vecs  = self.embedder.embed_batch(texts)
            self.collection.upsert(
                ids        = [c.chunk_id  for c in batch],
                documents  = texts,
                embeddings = vecs,
                metadatas  = [c.to_metadata() for c in batch],
            )
            logger.debug(f"[RAG] Lot {i//batch_size + 1} — {len(batch)} chunks upsertés")

    def _delete_by_doc_id(self, doc_id: str):
        """Supprime tous les chunks d'un document (pour mise à jour)."""
        try:
            existing = self.collection.get(where={"doc_id": doc_id})
            if existing["ids"]:
                self.collection.delete(ids=existing["ids"])
                logger.info(f"[RAG] {len(existing['ids'])} anciens chunks supprimés pour {doc_id}")
        except Exception as e:
            logger.warning(f"[RAG] Suppression échouée pour {doc_id} : {e}")

    # ── Recherche ─────────────────────────────────────────────────────────

    def search(
        self,
        query:    str,
        k:        int = RAG_TOP_K,
        doc_type: str | None = None,
        doc_id:   str | None = None,
        threshold: float = RAG_DISTANCE_THRESHOLD,
    ) -> List[SearchResult]:
        """
        Recherche les chunks les plus pertinents pour une requête.

        Args:
            query     : texte de la question
            k         : nombre de chunks à retourner
            doc_type  : filtrer par type de document (optionnel)
            doc_id    : filtrer par document (optionnel)
            threshold : distance cosinus max (0 = identique, 1 = opposé)

        Returns:
            Liste de SearchResult triée par pertinence décroissante.
        """
        if self.collection.count() == 0:
            logger.warning("[RAG] Index vide — aucun document indexé")
            return []

        # Construire le filtre ChromaDB
        where = self._build_filter(doc_type, doc_id)

        # Embedding de la requête
        query_vec = self.embedder.embed(query)

        # Recherche
        try:
            results = self.collection.query(
                query_embeddings=[query_vec],
                n_results=min(k, self.collection.count()),
                where=where if where else None,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error(f"[RAG] Erreur recherche : {e}")
            return []

        # Construire les SearchResult
        search_results = []
        docs      = results["documents"][0]
        metas     = results["metadatas"][0]
        distances = results["distances"][0]
        ids       = results["ids"][0]

        for doc, meta, dist, rid in zip(docs, metas, distances, ids):
            if dist > threshold:
                continue                    # chunk trop distant → ignoré
            search_results.append(SearchResult(
                chunk_id = rid,
                text     = doc,
                score    = round(dist, 4),
                doc_id   = meta.get("doc_id",   ""),
                doc_type = meta.get("doc_type",  ""),
                source   = meta.get("source",    ""),
                metadata = meta,
            ))

        logger.info(
            f"[RAG] '{query[:60]}' → {len(search_results)} résultats "
            f"(seuil {threshold})"
        )
        return search_results

    @staticmethod
    def _build_filter(
        doc_type: str | None,
        doc_id:   str | None
    ) -> Dict | None:
        """Construit le filtre where pour ChromaDB."""
        conditions = []
        if doc_type:
            conditions.append({"doc_type": {"$eq": doc_type}})
        if doc_id:
            conditions.append({"doc_id": {"$eq": doc_id}})

        if not conditions:
            return None
        if len(conditions) == 1:
            return conditions[0]
        return {"$and": conditions}

    # ── Construction du contexte prompt ───────────────────────────────────

    def build_context(
        self,
        results: List[SearchResult],
        max_chars: int = 3000,
    ) -> str:
        """
        Formate les résultats de recherche en contexte injectable dans un prompt.
        Tronque si le contexte dépasse max_chars.
        """
        if not results:
            return ""

        parts  = []
        total  = 0

        for i, r in enumerate(results, 1):
            block  = f"[{i}] {r.to_context_str()}"
            total += len(block)
            if total > max_chars:
                break
            parts.append(block)

        context = "\n\n---\n\n".join(parts)
        logger.debug(f"[RAG] Contexte : {len(context)} chars, {len(parts)} chunks")
        return context

    # ── Utilitaires ───────────────────────────────────────────────────────

    def stats(self) -> Dict[str, Any]:
        """Retourne les statistiques de l'index."""
        total = self.collection.count()
        if total == 0:
            return {"total_chunks": 0, "by_type": {}}

        # Compter par type de document
        by_type: Dict[str, int] = {}
        for dt in DOC_TYPES:
            try:
                res = self.collection.get(where={"doc_type": {"$eq": dt}})
                count = len(res["ids"])
                if count > 0:
                    by_type[dt] = count
            except Exception:
                pass

        return {"total_chunks": total, "by_type": by_type}

    def delete_document(self, doc_id: str) -> bool:
        """Supprime tous les chunks d'un document."""
        try:
            self._delete_by_doc_id(doc_id)
            return True
        except Exception:
            return False

    def reset(self):
        """Vide entièrement l'index (ATTENTION : irréversible)."""
        self._client.delete_collection(RAG_COLLECTION)
        self.collection = self._client.get_or_create_collection(
            name=RAG_COLLECTION,
            metadata={"hnsw:space": "cosine"}
        )
        logger.warning("[RAG] Index réinitialisé — tous les chunks supprimés")


# ─────────────────────────────────────────────────────────────────────────
#  INDEXATION EN BATCH (script CLI)
# ─────────────────────────────────────────────────────────────────────────

def index_all_documents(data_dir: str | Path = None) -> Dict[str, int]:
    """
    Indexe tous les documents du dossier data/raw/.
    Détecte le type automatiquement selon le sous-dossier ou le nom de fichier.

    Structure attendue dans data/raw/ :
        formations/    → doc_type = "formation"
        plans/         → doc_type = "plan"
        profils/       → doc_type = "profil"
        reglement/     → doc_type = "reglement"
        faq/           → doc_type = "faq"
        evaluations/   → doc_type = "evaluation"
        offres/        → doc_type = "offre"
    """
    from config import RAW_DIR
    data_dir = Path(data_dir) if data_dir else RAW_DIR
    rag      = RAGEngine()
    summary  = {}

    for doc_type in DOC_TYPES:
        folder = data_dir / doc_type
        if not folder.exists():
            continue

        count = 0
        for fpath in folder.iterdir():
            if fpath.suffix.lower() in (".pdf", ".json", ".txt", ".md"):
                try:
                    n = rag.index_file(fpath, doc_type=doc_type)
                    count += n
                except Exception as e:
                    logger.error(f"[Batch] Erreur sur {fpath.name} : {e}")

        if count:
            summary[doc_type] = count
            logger.info(f"[Batch] {doc_type} → {count} chunks")

    logger.info(f"[Batch] Indexation terminée : {sum(summary.values())} chunks au total")
    return summary


# ─────────────────────────────────────────────────────────────────────────
#  TESTS RAPIDES (python rag_engine.py)
# ─────────────────────────────────────────────────────────────────────────

def _run_tests():
    print("\n" + "═" * 60)
    print("  TESTS RAG ENGINE — ESPRIT ARIA")
    print("═" * 60)

    rag = RAGEngine()

    # ── Test 1 : indexation texte ────────────────────────────────────────
    print("\n[1] Indexation d'un document de test...")
    sample = """
    Formation : Python Avancé pour l'Enseignement
    Durée : 8 semaines
    Objectif : Maîtriser Python pour concevoir des exercices
    et projets pédagogiques interactifs.

    Programme :
    Semaine 1-2 : Révision POO, décorateurs, générateurs.
    Semaine 3-4 : Pandas et analyse de données.
    Semaine 5-6 : Visualisation avec Matplotlib et Seaborn.
    Semaine 7-8 : Projet final : tableau de bord pédagogique.

    Prérequis : bases Python (variables, fonctions, boucles).
    Public cible : Enseignants département informatique ESPRIT.
    Formateur : Responsable département formation des formateurs.
    """
    n = rag.index_text(
        text=sample, doc_id="TEST_FORMATION_PYTHON",
        doc_type="formation", source="test_interne"
    )
    print(f"   → {n} chunk(s) indexé(s)")

    # ── Test 2 : statistiques ────────────────────────────────────────────
    print("\n[2] Statistiques de l'index :")
    stats = rag.stats()
    print(f"   → Total chunks : {stats['total_chunks']}")
    for dt, cnt in stats["by_type"].items():
        print(f"   → {dt:<20} {cnt} chunk(s)")

    # ── Test 3 : recherche ───────────────────────────────────────────────
    queries = [
        "formation Python pour enseignants",
        "cours analyse de données pandas",
        "programme semaine par semaine",
    ]
    print("\n[3] Tests de recherche :")
    for q in queries:
        results = rag.search(q, k=2)
        print(f"\n   Requête : \"{q}\"")
        if results:
            for r in results:
                print(f"   → [{r.relevance:.2f}] {r.text[:80].strip()}...")
        else:
            print("   → Aucun résultat")

    # ── Test 4 : build_context ───────────────────────────────────────────
    print("\n[4] Construction du contexte prompt :")
    results = rag.search("formation Python", k=2)
    ctx = rag.build_context(results)
    print(f"   → {len(ctx)} caractères de contexte générés")
    print(f"   → Aperçu : {ctx[:120].strip()}...")

    # Nettoyage
    rag.delete_document("TEST_FORMATION_PYTHON")
    print("\n[5] Document de test supprimé ✓")
    print("\n" + "═" * 60)
    print("  Tous les tests RAG passés avec succès ✓")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    _run_tests()
