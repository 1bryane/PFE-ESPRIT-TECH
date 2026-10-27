"""
╔══════════════════════════════════════════════════════════════════════════╗
║              ESPRIT — Agent ARIA  ·  tools.py                          ║
║         Les 6 outils que l'agent peut déclencher                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  OUTILS DISPONIBLES :                                                   ║
║  1. generate_training_plan   → plan de formation personnalisé (IA)     ║
║  2. evaluate_profile         → analyse forces/faiblesses du profil     ║
║  3. recommend_formations     → formations du catalogue ESPRIT           ║
║  4. explain_talent_path      → parcours et avantages Talent ESPRIT     ║
║  5. summarize_evaluations    → synthèse des évaluations reçues         ║
║  6. search_knowledge         → recherche dans la base RAG ESPRIT       ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import requests

from config import (
    OLLAMA_BASE_URL, LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS,
    LLM_CTX_SIZE, LLM_TOP_P, OLLAMA_TIMEOUT, OLLAMA_RETRIES,
    LOG_FORMAT, LOG_LEVEL
)

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger("tools")


# ─────────────────────────────────────────────────────────────────────────
#  STRUCTURES
# ─────────────────────────────────────────────────────────────────────────

@dataclass
class ToolSchema:
    """Définition d'un outil — exposée au LLM dans le prompt système."""
    name:        str
    description: str
    parameters:  Dict[str, str]     # nom_param → description

    def to_dict(self) -> Dict:
        return {
            "name":        self.name,
            "description": self.description,
            "parameters":  self.parameters,
        }


@dataclass
class ToolResult:
    """Résultat d'un appel d'outil."""
    tool_name: str
    success:   bool
    output:    str
    error:     str = ""
    duration:  float = 0.0          # temps d'exécution en secondes

    def to_prompt_str(self) -> str:
        """Formate le résultat pour réinjection dans le prompt."""
        if self.success:
            return f"[Résultat de l'outil '{self.tool_name}']\n{self.output}"
        return (
            f"[Outil '{self.tool_name}' — Erreur]\n"
            f"{self.error}\n"
            f"Informe l'utilisateur que l'outil n'a pas pu s'exécuter."
        )


# ─────────────────────────────────────────────────────────────────────────
#  CLIENT LLM (pour les outils qui génèrent du contenu via Llama)
# ─────────────────────────────────────────────────────────────────────────

class _LLMClient:
    """Client Ollama minimal pour les appels internes aux outils."""

    def __init__(self):
        self.url = f"{OLLAMA_BASE_URL}/api/generate"

    def generate(
        self,
        prompt:      str,
        system:      str = "",
        temperature: float = LLM_TEMPERATURE,
        max_tokens:  int = LLM_MAX_TOKENS,
    ) -> str:
        payload = {
            "model":  LLM_MODEL,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx":     LLM_CTX_SIZE,
                "top_p":       LLM_TOP_P,
            }
        }
        for attempt in range(1, OLLAMA_RETRIES + 1):
            try:
                r = requests.post(self.url, json=payload, timeout=OLLAMA_TIMEOUT)
                r.raise_for_status()
                return r.json().get("response", "").strip()
            except Exception as e:
                logger.warning(f"[LLM] Tentative {attempt}/{OLLAMA_RETRIES} — {e}")
                if attempt < OLLAMA_RETRIES:
                    time.sleep(2 ** attempt)
        return "[Erreur : impossible de contacter le LLM]"


# ─────────────────────────────────────────────────────────────────────────
#  IMPLÉMENTATION DES 6 OUTILS
# ─────────────────────────────────────────────────────────────────────────

class ARIATools:
    """
    Registre et exécuteur des 6 outils d'ARIA.

    Usage :
        tools = ARIATools(rag_engine=rag, memory=mem)
        result = tools.call("generate_training_plan", {
            "objectif": "Maîtriser React",
            "competences_actuelles": "JavaScript, HTML, CSS",
            "duree_semaines": "8",
            "niveau": "intermédiaire"
        })
        print(result.output)
    """

    def __init__(
        self,
        rag_engine=None,    # instance de RAGEngine (rag_engine.py)
        memory=None,        # instance de MemoryManager (memory.py)
    ):
        self.llm    = _LLMClient()
        self.rag    = rag_engine
        self.memory = memory
        self._registry: Dict[str, Dict] = {}
        self._register_all()

    def _register_all(self):
        """Enregistre les 6 outils avec leur schéma et leur fonction."""
        tools_def = [

            # ── Outil 1 ───────────────────────────────────────────────────
            {
                "schema": ToolSchema(
                    name="generate_training_plan",
                    description=(
                        "Génère un plan de formation personnalisé et détaillé "
                        "semaine par semaine pour un enseignant ESPRIT, en fonction "
                        "de ses objectifs, compétences actuelles, durée et niveau."
                    ),
                    parameters={
                        "objectif":              "Objectif principal (ex: maîtriser React pour l'enseignement)",
                        "competences_actuelles": "Compétences déjà maîtrisées (séparées par des virgules)",
                        "duree_semaines":        "Durée souhaitée en semaines (nombre entier)",
                        "niveau":                "Niveau de départ : débutant | intermédiaire | avancé",
                    }
                ),
                "fn": self._generate_training_plan,
            },

            # ── Outil 2 ───────────────────────────────────────────────────
            {
                "schema": ToolSchema(
                    name="evaluate_profile",
                    description=(
                        "Analyse le profil d'un enseignant : identifie ses points forts, "
                        "ses lacunes et suggère les 5 compétences prioritaires à développer "
                        "pour atteindre son objectif professionnel."
                    ),
                    parameters={
                        "competences": "Liste des compétences actuelles (séparées par des virgules)",
                        "poste_vise":  "Objectif ou rôle visé (ex: enseignant senior, talent ESPRIT)",
                    }
                ),
                "fn": self._evaluate_profile,
            },

            # ── Outil 3 ───────────────────────────────────────────────────
            {
                "schema": ToolSchema(
                    name="recommend_formations",
                    description=(
                        "Recommande les formations du catalogue ESPRIT les plus adaptées "
                        "au profil et aux objectifs d'un enseignant, avec justification."
                    ),
                    parameters={
                        "profil":   "Description du profil, compétences et département",
                        "objectif": "Ce que l'enseignant souhaite accomplir",
                    }
                ),
                "fn": self._recommend_formations,
            },

            # ── Outil 4 ───────────────────────────────────────────────────
            {
                "schema": ToolSchema(
                    name="explain_talent_path",
                    description=(
                        "Explique le parcours Talent ESPRIT : conditions d'accès, "
                        "étapes à suivre, formations requises et avantages obtenus."
                    ),
                    parameters={
                        "question": "Question spécifique de l'enseignant sur le parcours Talent",
                    }
                ),
                "fn": self._explain_talent_path,
            },

            # ── Outil 5 ───────────────────────────────────────────────────
            {
                "schema": ToolSchema(
                    name="summarize_evaluations",
                    description=(
                        "Analyse et synthétise les évaluations reçues par un enseignant : "
                        "calcule les moyennes, identifie les points forts et les axes "
                        "d'amélioration, et génère un message d'encouragement."
                    ),
                    parameters={
                        "evaluations_json": (
                            "JSON des évaluations sous forme de liste : "
                            '[{"critere": "...", "note": 4.5, "commentaire": "..."}]'
                        ),
                    }
                ),
                "fn": self._summarize_evaluations,
            },

            # ── Outil 6 ───────────────────────────────────────────────────
            {
                "schema": ToolSchema(
                    name="search_knowledge",
                    description=(
                        "Recherche des informations précises dans la base de connaissances "
                        "ESPRIT (formations, règlement, procédures, FAQ). À utiliser quand "
                        "l'enseignant pose une question factuelle sur ESPRIT."
                    ),
                    parameters={
                        "query":    "La question ou le sujet à rechercher",
                        "doc_type": (
                            "Type de document à cibler (optionnel) : "
                            "formation | plan | reglement | faq | offre"
                        ),
                    }
                ),
                "fn": self._search_knowledge,
            },

            # ── Outil 7 — Recherche Web ───────────────────────────────────
            {
                "schema": ToolSchema(
                    name="search_web",
                    description=(
                        "Recherche sur Internet des informations actuelles sur un sujet "
                        "pédagogique, technologique ou professionnel. À utiliser UNIQUEMENT "
                        "quand la question porte sur des tendances récentes, des technologies "
                        "actuelles, ou des exigences du marché non présentes dans le RAG ESPRIT. "
                        "Ne pas utiliser pour des questions sur le règlement ESPRIT."
                    ),
                    parameters={
                        "query":    "La requête de recherche en français ou en anglais",
                        "max_results": "Nombre de résultats souhaités (défaut: 5, max: 10)",
                    }
                ),
                "fn": self._search_web,
            },
        ]

        for tool in tools_def:
            name = tool["schema"].name
            self._registry[name] = {
                "schema": tool["schema"],
                "fn":     tool["fn"],
            }

        logger.info(f"[Tools] {len(self._registry)} outils enregistrés")

    # ─────────────────────────────────────────────────────────────────────
    #  EXÉCUTEUR CENTRAL
    # ─────────────────────────────────────────────────────────────────────

    def call(self, tool_name: str, params: Dict[str, Any]) -> ToolResult:
        """
        Appelle un outil par son nom avec les paramètres fournis.
        Retourne toujours un ToolResult — jamais d'exception non gérée.
        """
        if tool_name not in self._registry:
            return ToolResult(
                tool_name=tool_name, success=False, output="",
                error=f"Outil inconnu : '{tool_name}'. "
                      f"Disponibles : {list(self._registry.keys())}"
            )

        fn = self._registry[tool_name]["fn"]
        t0 = time.time()
        try:
            output = fn(**params)
            return ToolResult(
                tool_name=tool_name, success=True,
                output=output, duration=round(time.time() - t0, 2)
            )
        except TypeError as e:
            return ToolResult(
                tool_name=tool_name, success=False, output="",
                error=f"Paramètres incorrects pour '{tool_name}' : {e}"
            )
        except Exception as e:
            logger.error(f"[Tools] Erreur dans '{tool_name}' : {e}")
            return ToolResult(
                tool_name=tool_name, success=False, output="",
                error=f"Erreur inattendue : {e}"
            )

    def get_schemas(self) -> List[Dict]:
        """Retourne les schémas JSON de tous les outils (pour le prompt)."""
        return [v["schema"].to_dict() for v in self._registry.values()]

    def get_schemas_as_str(self) -> str:
        """Retourne les schémas formatés en JSON lisible pour le prompt."""
        return json.dumps(self.get_schemas(), ensure_ascii=False, indent=2)

    # ─────────────────────────────────────────────────────────────────────
    #  IMPLÉMENTATIONS
    # ─────────────────────────────────────────────────────────────────────

    def _generate_training_plan(
        self,
        objectif:              str,
        competences_actuelles: str,
        duree_semaines:        str,
        niveau:                str = "intermédiaire",
    ) -> str:
        """Génère un plan de formation personnalisé via Llama."""

        # Récupérer le contexte RAG si disponible
        rag_context = ""
        if self.rag:
            results = self.rag.search(objectif, k=3, doc_type="formation")
            rag_context = self.rag.build_context(results)

        context_block = (
            f"\nFormations similaires disponibles dans le catalogue ESPRIT :\n"
            f"{rag_context}\n"
        ) if rag_context else ""

        prompt = f"""Expert pédagogique ESPRIT. Génère un plan de formation structuré :

Objectif : {objectif}
Compétences actuelles : {competences_actuelles or 'non précisées'}
Durée : {duree_semaines} semaines | Niveau : {niveau}
{context_block}
Format (respecte exactement) :
## Titre
## Objectif principal (1 phrase)
## Prérequis (liste courte)
## Programme
Semaine 1 : [thème] — [exercice]
Semaine 2 : [thème] — [exercice]
...
## Livrables
## Badge obtenu

Sois concis et pratique."""

        return self.llm.generate(prompt, temperature=0.35, max_tokens=700)

    def _evaluate_profile(
        self,
        competences: str,
        poste_vise:  str,
    ) -> str:
        """Évalue un profil enseignant et identifie les axes de progression."""

        rag_context = ""
        if self.rag:
            results = self.rag.search(f"{poste_vise} compétences requises", k=2)
            rag_context = self.rag.build_context(results)

        context_block = (
            f"\nContexte ESPRIT pertinent :\n{rag_context}\n"
        ) if rag_context else ""

        prompt = f"""Tu es un conseiller RH académique spécialisé dans l'enseignement supérieur.
{context_block}
Analyse ce profil enseignant de façon objective et bienveillante :

Compétences actuelles : {competences}
Objectif professionnel : {poste_vise}

Fournis une analyse structurée en 5 parties :
1. Points forts (top 3) — avec explication courte
2. Lacunes identifiées — sans jugement, de façon constructive
3. Compétences prioritaires à développer (top 5, par ordre d'importance)
4. Estimation réaliste du temps pour atteindre l'objectif
5. Conseil personnalisé en 2-3 phrases (ton motivant)

Sois honnête, constructif et orienté action."""

        return self.llm.generate(prompt, temperature=0.3, max_tokens=900)

    def _recommend_formations(
        self,
        profil:   str,
        objectif: str,
    ) -> str:
        """Recommande des formations adaptées depuis le catalogue ESPRIT."""

        # Chercher dans le RAG les formations disponibles
        rag_context = ""
        if self.rag:
            results = self.rag.search(
                f"{objectif} {profil}", k=4, doc_type="formation"
            )
            rag_context = self.rag.build_context(results, max_chars=2000)

        if rag_context:
            prompt = f"""Tu es le conseiller pédagogique d'ESPRIT.

Voici les formations disponibles dans le catalogue ESPRIT :
{rag_context}

Profil de l'enseignant : {profil}
Objectif : {objectif}

Recommande les 3 formations les plus pertinentes parmi celles listées ci-dessus.
Pour chacune, explique :
- Pourquoi elle est adaptée à ce profil précis
- Ce que l'enseignant gagnera concrètement
- Dans quel ordre les suivre si plusieurs sont recommandées

Base-toi UNIQUEMENT sur les formations listées, ne les invente pas."""
        else:
            # Pas de RAG disponible → réponse générique avec avertissement
            prompt = f"""Tu es le conseiller pédagogique d'ESPRIT.

Note importante : le catalogue de formations ESPRIT n'est pas encore chargé.
Propose des recommandations génériques adaptées au profil, en précisant que
les formations réelles seront disponibles une fois le catalogue indexé.

Profil : {profil}
Objectif : {objectif}"""

        return self.llm.generate(prompt, temperature=0.4, max_tokens=800)

    def _explain_talent_path(self, question: str) -> str:
        """Explique le parcours Talent ESPRIT."""

        # Chercher dans le RAG les informations sur le parcours Talent
        rag_context = ""
        if self.rag:
            results = self.rag.search("parcours Talent ESPRIT avantages conditions", k=3)
            rag_context = self.rag.build_context(results)

        context_block = (
            f"\nInformations officielles ESPRIT sur le parcours Talent :\n"
            f"{rag_context}\n"
        ) if rag_context else ""

        # Contexte par défaut si RAG vide
        default_context = """
Le parcours Talent ESPRIT fonctionne ainsi :
1. L'enseignant doit d'abord être recruté via la plateforme (statut Enseignant actif)
2. Il peut demander le statut Talent depuis son tableau de bord
3. Il accède au catalogue de formations du RDFF (Responsable Département Formation)
4. Il peut demander une formation personnalisée générée par l'agent IA ARIA
5. Une fois les formations validées par le RDFF, il reçoit le badge Talent (étoile dorée)
6. Avantages Talent : bonus financiers sur performance, missions spéciales,
   postes de responsabilité, opportunités de carrière privilégiées
7. Ces avantages sont définis par la Direction Générale dans l'espace Valorisation
"""

        context_final = context_block if context_block else default_context

        prompt = f"""{context_final}

Question de l'enseignant : {question}

Réponds de façon claire, complète et encourageante.
Si la question porte sur un avantage non détaillé dans le contexte,
indique que les détails complets sont disponibles dans l'espace Valorisation."""

        return self.llm.generate(prompt, temperature=0.3, max_tokens=700)

    def _summarize_evaluations(self, evaluations_json: str) -> str:
        """Analyse et synthétise les évaluations d'un enseignant."""
        try:
            evals = json.loads(evaluations_json)
            if not isinstance(evals, list) or not evals:
                return "Aucune évaluation fournie ou format invalide."
        except json.JSONDecodeError as e:
            return f"Format JSON invalide : {e}. Exemple attendu : [{{'critere': 'Python', 'note': 4.5, 'commentaire': 'Très bien'}}]"

        # Calcul des statistiques
        notes  = [e.get("note", 0) for e in evals if isinstance(e.get("note"), (int, float))]
        moyenne = round(sum(notes) / len(notes), 2) if notes else 0

        prompt = f"""Tu es un conseiller pédagogique bienveillant d'ESPRIT.

Voici les évaluations d'un enseignant :
{json.dumps(evals, ensure_ascii=False, indent=2)}

Moyenne calculée : {moyenne}/5

Fournis une synthèse structurée en 5 parties :
1. Moyenne générale et interprétation (excellent / bien / à améliorer)
2. Point fort dominant (le critère le mieux noté)
3. Point le plus à améliorer (le critère le moins noté)
4. Synthèse des commentaires (grands thèmes récurrents en 2-3 phrases)
5. Message d'encouragement personnalisé à l'enseignant (2-3 lignes, ton chaleureux)

Sois objectif sur les chiffres, bienveillant sur le ton."""

        return self.llm.generate(prompt, temperature=0.3, max_tokens=700)

    def _search_knowledge(
        self,
        query:    str,
        doc_type: str = "",
    ) -> str:
        """Recherche dans la base RAG ESPRIT et retourne les informations trouvées."""
        if not self.rag:
            return (
                "La base de connaissances ESPRIT n'est pas connectée. "
                "Veuillez indexer les documents avant d'utiliser cet outil."
            )

        results = self.rag.search(
            query    = query,
            k        = 4,
            doc_type = doc_type if doc_type else None,
        )

        if not results:
            return (
                f"Aucune information trouvée pour '{query}' dans la base ESPRIT. "
                f"Ce document n'est peut-être pas encore indexé."
            )

        # Formater les résultats
        lines = [f"Résultats de recherche pour '{query}' :\n"]
        for i, r in enumerate(results, 1):
            lines.append(
                f"[{i}] (pertinence : {r.relevance:.0%}) "
                f"{r.to_context_str()}"
            )
        return "\n\n".join(lines)

    def _search_web(
        self,
        query:       str,
        max_results: str = "5",
    ) -> str:
        """
        Recherche sur Internet via DuckDuckGo (sans clé API).
        Retourne un résumé des résultats les plus pertinents formaté pour le LLM.
        À utiliser pour les tendances actuelles, technologies récentes, exigences du marché.
        """
        try:
            try:
                from ddgs import DDGS          # nouveau nom du package
            except ImportError:
                from duckduckgo_search import DDGS   # fallback ancien nom
        except ImportError:
            return (
                "Le module de recherche web n'est pas disponible. "
                "Installez-le avec : pip install ddgs"
            )

        n = min(int(max_results) if str(max_results).isdigit() else 5, 10)

        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(
                    keywords = query,
                    region   = "fr-fr",
                    safesearch = "moderate",
                    max_results = n,
                ):
                    results.append(r)

            if not results:
                return f"Aucun résultat web trouvé pour : '{query}'"

            lines = [
                f"Résultats web actuels pour '{query}' :\n",
                "ATTENTION : Ces informations proviennent d'Internet. "
                "Vérifie leur pertinence avant de les intégrer à une réponse ESPRIT.\n",
            ]
            for i, r in enumerate(results, 1):
                title   = r.get("title", "Sans titre")
                snippet = r.get("body", r.get("snippet", ""))
                url     = r.get("href", r.get("link", ""))
                lines.append(
                    f"[{i}] {title}\n"
                    f"     {snippet[:300]}\n"
                    f"     Source : {url}"
                )

            return "\n\n".join(lines)

        except Exception as e:
            logger.warning(f"[search_web] Erreur DuckDuckGo : {e}")
            return (
                f"La recherche web a échoué temporairement : {e}. "
                "Essayez de reformuler votre question ou consultez directement les ressources ESPRIT."
            )


# ─────────────────────────────────────────────────────────────────────────
#  TESTS (python tools.py)
# ─────────────────────────────────────────────────────────────────────────

def _run_tests():
    print("\n" + "═" * 60)
    print("  TESTS TOOLS — ESPRIT ARIA")
    print("═" * 60)

    tools = ARIATools()   # sans RAG ni mémoire pour les tests de base

    # ── Test 1 : liste des outils ─────────────────────────────────────────
    print("\n[1] Outils enregistrés :")
    for schema in tools.get_schemas():
        print(f"   → {schema['name']}")
        print(f"      {schema['description'][:70]}...")

    # ── Test 2 : outil inexistant ─────────────────────────────────────────
    print("\n[2] Appel d'un outil inexistant...")
    result = tools.call("outil_fantome", {})
    print(f"   → success : {result.success}")
    print(f"   → error   : {result.error[:60]}")
    assert not result.success

    # ── Test 3 : paramètres manquants ─────────────────────────────────────
    print("\n[3] Appel avec paramètres manquants...")
    result = tools.call("generate_training_plan", {"objectif": "Python"})
    print(f"   → success : {result.success}")
    if not result.success:
        print(f"   → error   : {result.error[:80]}")

    # ── Test 4 : outil evaluate_profile (sans LLM) ─────────────────────
    print("\n[4] Test evaluate_profile (appel LLM réel)...")
    print("   → Génération en cours — peut prendre 15-30 secondes...")
    result = tools.call("evaluate_profile", {
        "competences": "Python, SQL, HTML basique, pédagogie",
        "poste_vise":  "Enseignant senior département Informatique"
    })
    print(f"   → success  : {result.success}")
    print(f"   → durée    : {result.duration}s")
    if result.success:
        print(f"   → aperçu   : {result.output[:150].strip()}...")
    else:
        print(f"   → erreur   : {result.error}")

    # ── Test 5 : summarize_evaluations ────────────────────────────────────
    print("\n[5] Test summarize_evaluations...")
    evals = json.dumps([
        {"critere": "Maîtrise du contenu",    "note": 4.5, "commentaire": "Très bon niveau"},
        {"critere": "Pédagogie",              "note": 3.8, "commentaire": "Peut être plus interactif"},
        {"critere": "Disponibilité",          "note": 4.9, "commentaire": "Toujours présent"},
        {"critere": "Taux de réussite",       "note": 4.2, "commentaire": "Bons résultats étudiants"},
    ])
    result = tools.call("summarize_evaluations", {"evaluations_json": evals})
    print(f"   → success : {result.success}")
    print(f"   → durée   : {result.duration}s")
    if result.success:
        print(f"   → aperçu  : {result.output[:150].strip()}...")

    # ── Test 6 : search_knowledge sans RAG ────────────────────────────────
    print("\n[6] Test search_knowledge sans RAG connecté...")
    result = tools.call("search_knowledge", {"query": "formation React"})
    print(f"   → success : {result.success}")
    print(f"   → output  : {result.output[:80]}")

    # ── Test 7 : explain_talent_path ──────────────────────────────────────
    print("\n[7] Test explain_talent_path...")
    result = tools.call("explain_talent_path", {
        "question": "Quels sont les avantages du statut Talent ?"
    })
    print(f"   → success : {result.success}")
    if result.success:
        print(f"   → aperçu  : {result.output[:150].strip()}...")

    print("\n" + "═" * 60)
    print("  Tests TOOLS terminés ✓")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    _run_tests()
