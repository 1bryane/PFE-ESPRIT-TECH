"""
╔══════════════════════════════════════════════════════════════════════════╗
║              ESPRIT — Agent ARIA  ·  agent_ia.py  V2                   ║
║         Agent ReAct complet : RAG + Mémoire + Outils + API             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ARCHITECTURE :                                                         ║
║                                                                         ║
║  Message utilisateur                                                    ║
║       ↓                                                                 ║
║  [1] RAG search()      → contexte documentaire ESPRIT                  ║
║  [2] Memory recall()   → souvenirs pertinents de l'utilisateur         ║
║  [3] build_prompt()    → prompt complet : système + contexte + hist.   ║
║       ↓                                                                 ║
║  [4] Llama 3.1 8B      → décision : use_tool | final_answer            ║
║       ↓                                                                 ║
║  [5] Parser JSON       → 3 niveaux de fallback                         ║
║       ↓                                                                 ║
║  [6] tools.call()      → exécution de l'outil (si nécessaire)          ║
║       ↓  (réinjection résultat → retour étape 4)                       ║
║  [7] Réponse finale    → sauvegarde mémoire + retour utilisateur       ║
║                                                                         ║
║  LANCEMENT API :                                                        ║
║    uvicorn agent_ia:app --reload --port 8001                           ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Dict, Generator, List, Optional

import requests

from config import (
    OLLAMA_BASE_URL, LLM_MODEL, LLM_TEMPERATURE, LLM_MAX_TOKENS,
    LLM_CTX_SIZE, LLM_TOP_P, OLLAMA_TIMEOUT, OLLAMA_RETRIES,
    STREAM, AGENT_NAME, AGENT_VERSION, AGENT_ROLE, AGENT_MAX_ITER,
    MEMORY_MAX_HISTORY, RAG_TOP_K, API_HOST, API_PORT, API_RELOAD,
    API_TITLE, API_VERSION, CORS_ORIGINS, LOG_FORMAT, LOG_LEVEL
)
from rag_engine import RAGEngine
from memory    import MemoryManager, get_memory
from tools     import ARIATools, ToolResult

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger("agent_ia")


def _fix_json_newlines(text: str) -> str:
    """
    Échappe les sauts de ligne littéraux à l'intérieur des strings JSON.
    Le LLM génère souvent du JSON avec des \\n littéraux dans les valeurs,
    ce qui rend json.loads() invalide. On parcourt char par char pour ne
    toucher que l'intérieur des strings.
    """
    result = []
    in_string  = False
    escape_next = False
    for char in text:
        if escape_next:
            result.append(char)
            escape_next = False
        elif char == "\\":
            result.append(char)
            escape_next = True
        elif char == '"':
            result.append(char)
            in_string = not in_string
        elif char == "\n" and in_string:
            result.append("\\n")
        elif char == "\r" and in_string:
            result.append("\\r")
        else:
            result.append(char)
    return "".join(result)


def _try_load_json(raw_json: str) -> Optional[dict]:
    """Tente json.loads, puis avec correction des \\n littéraux."""
    cleaned = raw_json.strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass
    try:
        return json.loads(_fix_json_newlines(cleaned))
    except (json.JSONDecodeError, ValueError):
        return None


def _clean_json_envelope(text: str) -> str:
    """
    Extrait la valeur 'answer' si le LLM a renvoyé son enveloppe JSON
    au lieu du texte nu. Gère les \\n littéraux dans les strings JSON.
      1. Bloc ```json ... ```
      2. Objet JSON brut { ... }
      3. Texte tel quel
    """
    # Cas 1 : bloc ```json ... ```
    m = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if m:
        data = _try_load_json(m.group(1))
        if data and "answer" in data:
            return str(data["answer"])

    # Cas 2 : JSON brut qui commence par {
    stripped = text.strip()
    if stripped.startswith("{") and '"answer"' in stripped:
        data = _try_load_json(stripped)
        if data and "answer" in data:
            return str(data["answer"])

    return text


# ─────────────────────────────────────────────────────────────────────────
#  STRUCTURES
# ─────────────────────────────────────────────────────────────────────────

@dataclass
class AgentAction:
    """
    Décision parsée depuis la réponse JSON du LLM.
    Le LLM doit toujours choisir entre deux actions :
      - use_tool    : appeler un outil avec des paramètres
      - final_answer: répondre directement à l'utilisateur
    """
    action_type:   str                       # "use_tool" | "final_answer"
    tool_name:     Optional[str]   = None
    tool_params:   Dict            = field(default_factory=dict)
    final_answer:  Optional[str]   = None
    reasoning:     str             = ""


@dataclass
class AgentResponse:
    """Résultat complet d'un appel à l'agent."""
    answer:        str
    user_id:       str
    iterations:    int
    tools_used:    List[str]       = field(default_factory=list)
    rag_used:      bool            = False
    memory_used:   bool            = False
    duration:      float           = 0.0


# ─────────────────────────────────────────────────────────────────────────
#  CLIENT OLLAMA — CHAT MULTI-TOURS
# ─────────────────────────────────────────────────────────────────────────

class OllamaChat:
    """
    Client HTTP vers l'API Ollama /api/chat.
    Gère le mode streaming et le mode synchrone.
    """

    def __init__(self):
        self.url = f"{OLLAMA_BASE_URL}/api/chat"

    def chat(
        self,
        messages:    List[Dict[str, str]],
        temperature: float = LLM_TEMPERATURE,
        max_tokens:  int   = LLM_MAX_TOKENS,
        stream:      bool  = False,
    ) -> str | Generator[str, None, None]:
        """
        Envoie une liste de messages à Ollama et retourne la réponse.
        Si stream=True → retourne un générateur de chunks texte.
        Si stream=False → retourne le texte complet.
        """
        payload = {
            "model":    LLM_MODEL,
            "messages": messages,
            "stream":   stream,
            "options":  {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx":     LLM_CTX_SIZE,
                "top_p":       LLM_TOP_P,
            }
        }

        if stream:
            return self._stream(payload)
        else:
            return self._sync(payload)

    def _sync(self, payload: dict) -> str:
        for attempt in range(1, OLLAMA_RETRIES + 1):
            try:
                r = requests.post(self.url, json=payload, timeout=OLLAMA_TIMEOUT)
                r.raise_for_status()
                return r.json()["message"]["content"].strip()
            except Exception as e:
                logger.warning(f"[Chat] Tentative {attempt}/{OLLAMA_RETRIES} — {e}")
                if attempt < OLLAMA_RETRIES:
                    time.sleep(2 ** attempt)
        return "[Erreur : impossible de joindre Llama via Ollama]"

    def _stream(self, payload: dict) -> Generator[str, None, None]:
        try:
            with requests.post(
                self.url, json=payload, stream=True, timeout=OLLAMA_TIMEOUT
            ) as r:
                r.raise_for_status()
                for line in r.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        if not chunk.get("done"):
                            yield chunk.get("message", {}).get("content", "")
        except Exception as e:
            logger.error(f"[Chat/Stream] {e}")
            yield f"[Erreur streaming : {e}]"


# ─────────────────────────────────────────────────────────────────────────
#  PARSEUR DE RÉPONSE — 3 NIVEAUX DE FALLBACK
# ─────────────────────────────────────────────────────────────────────────

class ResponseParser:
    """
    Parse la réponse du LLM pour extraire l'action décidée.

    Le LLM est instruit de répondre en JSON. Mais parfois il déraille.
    3 stratégies de récupération successives :
      1. Chercher un bloc ```json ... ```
      2. Chercher un objet JSON brut avec regex
      3. Traiter toute la réponse comme final_answer
    """

    @staticmethod
    def parse(raw: str) -> AgentAction:
        # Nettoyer d'abord les espaces et sauts de ligne en tête
        text = raw.strip()
        
        # Stratégie 1 : bloc ```json ... ```
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            data = ResponseParser._try_parse(match.group(1))
            if data:
                return ResponseParser._build_action(data, raw)

        # Stratégie 2 : JSON brut qui commence par {
        if text.startswith("{"):
            data = ResponseParser._try_parse(text)
            if data:
                return ResponseParser._build_action(data, raw)

        # Stratégie 3 : chercher un { ... } n'importe où
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            data = ResponseParser._try_parse(match.group(0))
            if data:
                return ResponseParser._build_action(data, raw)

        # Fallback
        return AgentAction(action_type="final_answer", final_answer=text)

    @staticmethod
    def _try_parse(text: str) -> Optional[dict]:
        return _try_load_json(text)

    @staticmethod
    def _build_action(data: dict, raw: str) -> AgentAction:
        action = data.get("action", "")
        if action == "use_tool":
            return AgentAction(
                action_type  = "use_tool",
                tool_name    = data.get("tool"),
                tool_params  = data.get("params", {}),
                reasoning    = data.get("reasoning", ""),
            )
        elif action == "final_answer":
            return AgentAction(
                action_type  = "final_answer",
                final_answer = data.get("answer", raw),
                reasoning    = data.get("reasoning", ""),
            )
        # Champ "action" inconnu → fallback
        return AgentAction(
            action_type  = "final_answer",
            final_answer = data.get("answer", raw),
            reasoning    = "fallback: action inconnue"
        )


# ─────────────────────────────────────────────────────────────────────────
#  CONSTRUCTEUR DE PROMPT
# ─────────────────────────────────────────────────────────────────────────

SYSTEM_TEMPLATE = """{agent_role}

════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE OBLIGATOIRE — réponds TOUJOURS en JSON valide :

Si tu dois utiliser un outil :
```json
{{
  "action": "use_tool",
  "reasoning": "Pourquoi j'utilise cet outil",
  "tool": "nom_de_l_outil",
  "params": {{
    "param1": "valeur1"
  }}
}}
```

Si tu peux répondre directement sans outil :
```json
{{
  "action": "final_answer",
  "reasoning": "Pourquoi je réponds directement",
  "answer": "Ta réponse complète en Markdown ici"
}}
```
HIÉRARCHIE DES SOURCES (à respecter dans cet ordre) :
1. CONTEXTE ESPRIT CI-DESSOUS (priorité absolue — vérité officielle)
2. Mémoire utilisateur (préférences, historique personnel uniquement)
3. Tes connaissances générales (uniquement si les deux sources sont vides)

RÈGLES ABSOLUES — à respecter dans TOUTES les réponses :
- N'utilise un outil QUE si nécessaire. Les questions simples → réponse directe.
- La réponse "answer" doit être en français, claire et bien structurée.
- Si le CONTEXTE ESPRIT ci-dessus contient des informations pertinentes, 
  tu les utilises OBLIGATOIREMENT. Tu ne dis JAMAIS "je n'ai pas trouvé" 
  si le contexte contient des données exploitables.
- Tu n'inventes JAMAIS de critères, de processus ou de chiffres 
  qui ne figurent pas explicitement dans le contexte fourni.
- Si une information n'est pas dans le contexte, tu dis exactement :
  "Cette information ne figure pas dans les documents disponibles."
- Tu utilises search_knowledge si la question porte sur des faits 
  ESPRIT précis et que le contexte RAG ne suffit pas.

════════════════════════════════════════════════════════════
CONTEXTE ESPRIT (documents récupérés — tu DOIS baser ta réponse sur ces informations) :
{rag_context}
RÈGLE ABSOLUE : si le contexte ci-dessus contient des informations pertinentes,
tu les utilises OBLIGATOIREMENT dans ta réponse. Tu ne dis JAMAIS
"je n'ai pas trouvé" si le contexte contient des données.

════════════════════════════════════════════════════════════
MÉMOIRE UTILISATEUR (échanges et préférences mémorisés) :
{memory_context}
════════════════════════════════════════════════════════════
OUTILS DISPONIBLES :
{tools_schema}

FORMAT DE RÉPONSE : toujours JSON valide dans ```json```
"""


def build_system_prompt(
    tools_schema:   str,
    rag_context:    str,
    memory_context: str,
) -> str:
    """Construit le prompt système complet avec tous les contextes."""
    return SYSTEM_TEMPLATE.format(
        agent_role     = AGENT_ROLE,
        tools_schema   = tools_schema,
        rag_context    = rag_context    or "Aucun document ESPRIT pertinent trouvé.",
        memory_context = memory_context or "Aucun contexte mémorisé pour cet utilisateur.",
    )


# ─────────────────────────────────────────────────────────────────────────
#  AGENT ARIA — BOUCLE REACT
# ─────────────────────────────────────────────────────────────────────────

class ARIAAgent:
    """
    Agent IA ARIA — architecture ReAct (Reason + Act).

    Cycle de vie d'un message :
    1. Récupérer le contexte RAG pertinent pour la question
    2. Récupérer les souvenirs mémoire pertinents
    3. Construire le prompt système complet
    4. Envoyer à Llama → parser la décision
    5. Si use_tool → exécuter l'outil → réinjecter le résultat → retour 4
    6. Si final_answer → retourner la réponse à l'utilisateur
    7. Mémoriser l'échange

    Une instance par utilisateur actif (mis en cache dans agent_cache).
    """

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id
        self.llm     = OllamaChat()
        self.rag     = RAGEngine()
        self.memory  = get_memory(user_id)
        self.tools   = ARIATools(rag_engine=self.rag, memory=self.memory)
        self.parser  = ResponseParser()
        logger.info(
            f"[ARIA] Agent initialisé pour '{user_id}' — "
            f"RAG:{self.rag.stats()['total_chunks']} chunks, "
            f"Mémoire LT:{self.memory.memory_stats()['lt_memories']} souvenirs"
        )

    def run(self, user_message: str) -> AgentResponse:
        """
        Point d'entrée principal : traite un message et retourne la réponse.
        """
        t0         = time.time()
        tools_used = []
        rag_used   = False
        mem_used   = False

        logger.info(f"[ARIA] '{self.user_id}' → {user_message[:80]}")

        # ── 1. RAG : récupérer le contexte documentaire ───────────────────
        rag_results  = self.rag.search(user_message, k=RAG_TOP_K)
        rag_context  = self.rag.build_context(rag_results)
        rag_used     = bool(rag_context)

        # ── 2. Mémoire : récupérer les souvenirs pertinents ───────────────
        mem_context = self.memory.get_full_context(user_message)
        mem_used    = bool(mem_context)

        # ── 3. Construire le prompt système ───────────────────────────────
        system = build_system_prompt(
            tools_schema   = self.tools.get_schemas_as_str(),
            rag_context    = rag_context,
            memory_context = mem_context,
        )

        # ── 4. Construire les messages (système + historique + question) ──
        self.memory.add("user", user_message)
        messages = [{"role": "system", "content": system}]
        messages += self.memory.get_history()

        # ── 5. Boucle ReAct ───────────────────────────────────────────────
        final_answer = ""

        for iteration in range(1, AGENT_MAX_ITER + 1):
            logger.info(f"[ARIA] Itération {iteration}/{AGENT_MAX_ITER}")

            # Appel LLM
            raw = self.llm.chat(messages, stream=False)
            logger.debug(f"[ARIA] Réponse brute : {raw[:100]}")

            # Parser la décision
            action = self.parser.parse(raw)

            if action.action_type == "final_answer":
                # ── Réponse directe ───────────────────────────────────────
                final_answer = _clean_json_envelope(action.final_answer or raw)
                break


            elif action.action_type == "use_tool":
                # ── Appel d'outil ─────────────────────────────────────────
                if not action.tool_name:
                    final_answer = raw
                    break

                logger.info(
                    f"[ARIA] Outil appelé : {action.tool_name} "
                    f"avec {list(action.tool_params.keys())}"
                )
                tools_used.append(action.tool_name)

                # Exécution
                result: ToolResult = self.tools.call(
                    action.tool_name, action.tool_params
                )

                # Réinjection du résultat dans la conversation
                messages.append({"role": "assistant", "content": raw})
                messages.append({
                    "role": "user",
                    "content": (
                        f"{result.to_prompt_str()}\n\n"
                        f"En te basant sur ce résultat, donne ta réponse finale "
                        f"à l'utilisateur au format JSON (action: final_answer)."
                    )
                })

        else:
            # Boucle épuisée sans réponse finale
            final_answer = (
                "Je n'ai pas pu formuler une réponse complète. "
                "Pourriez-vous reformuler votre question ?"
            )
            logger.warning(f"[ARIA] Limite d'itérations atteinte pour '{self.user_id}'")

        # ── 6. Mémoriser la réponse ───────────────────────────────────────
        self.memory.add("assistant", final_answer)
        if rag_used:
            self.memory.save(
                f"Q: {user_message[:200]}\nR: {final_answer[:300]}",
                mem_type="conversation"
            )

        duration = round(time.time() - t0, 2)
        logger.info(
            f"[ARIA] Répondu en {duration}s — "
            f"{'Outils: ' + str(tools_used) if tools_used else 'Réponse directe'}"
        )

        return AgentResponse(
            answer      = final_answer,
            user_id     = self.user_id,
            iterations  = iteration,
            tools_used  = tools_used,
            rag_used    = rag_used,
            memory_used = mem_used,
            duration    = duration,
        )

    def stream(self, user_message: str):
        """
        Version streaming : génère la réponse chunk par chunk.
        Usage : for chunk in agent.stream("...") : print(chunk, end="")
        Note : en mode stream, les outils sont toujours exécutés en sync.
        """
        response = self.run(user_message)
        # Simuler le streaming de la réponse finale
        for word in response.answer.split(" "):
            yield word + " "
            time.sleep(0.01)

    def reset(self):
        """Réinitialise l'historique court terme."""
        self.memory.clear_history()


# ─────────────────────────────────────────────────────────────────────────
#  CACHE D'AGENTS
# ─────────────────────────────────────────────────────────────────────────

_agent_cache: Dict[str, ARIAAgent] = {}

def get_agent(user_id: str) -> ARIAAgent:
    """
    Retourne l'agent pour un utilisateur (crée et met en cache si nécessaire).
    Une instance par utilisateur actif.
    """
    if user_id not in _agent_cache:
        _agent_cache[user_id] = ARIAAgent(user_id=user_id)
    return _agent_cache[user_id]


# ─────────────────────────────────────────────────────────────────────────
#  API FASTAPI
# ─────────────────────────────────────────────────────────────────────────

try:
    from fastapi import FastAPI, HTTPException, Depends
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel, Field

    app = FastAPI(
        title       = API_TITLE,
        version     = API_VERSION,
        description = "Agent IA ARIA — Plateforme de Gestion des Talents ESPRIT",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins     = CORS_ORIGINS,
        allow_credentials = True,
        allow_methods     = ["*"],
        allow_headers     = ["*"],
    )

    # ── Schémas Pydantic ─────────────────────────────────────────────────

    class ChatRequest(BaseModel):
        user_id: str  = Field(default="default", description="Identifiant de l'enseignant")
        message: str  = Field(..., min_length=1, description="Message envoyé à ARIA")

    class ChatResponse(BaseModel):
        user_id:    str
        answer:     str
        iterations: int
        tools_used: List[str]
        rag_used:   bool
        duration:   float

    class PlanRequest(BaseModel):
        user_id:               str = "default"
        objectif:              str
        competences_actuelles: str
        duree_semaines:        int = Field(default=8, ge=1, le=52)
        niveau:                str = "intermédiaire"

    class EvalRequest(BaseModel):
        evaluations: List[Dict]
        user_id:     str = "default"

    # ── Endpoints ─────────────────────────────────────────────────────────

    @app.get("/health", tags=["Système"])
    def health():
        """Vérifie que le service est opérationnel."""
        rag   = RAGEngine()
        stats = rag.stats()
        return {
            "status":        "ok",
            "agent":         AGENT_NAME,
            "version":       AGENT_VERSION,
            "model":         LLM_MODEL,
            "rag_chunks":    stats["total_chunks"],
            "rag_by_type":   stats["by_type"],
            "active_agents": len(_agent_cache),
        }

    @app.post("/chat", response_model=ChatResponse, tags=["Agent"])
    def chat(body: ChatRequest):
        """
        Envoie un message à ARIA et reçoit une réponse.
        C'est l'endpoint principal utilisé par l'interface web ESPRIT.
        """
        try:
            agent    = get_agent(body.user_id)
            response = agent.run(body.message)
            return ChatResponse(
                user_id    = response.user_id,
                answer     = response.answer,
                iterations = response.iterations,
                tools_used = response.tools_used,
                rag_used   = response.rag_used,
                duration   = response.duration,
            )
        except Exception as e:
            logger.error(f"[API/chat] {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/chat/stream", tags=["Agent"])
    def chat_stream(body: ChatRequest):
        """
        Version streaming du chat — retourne la réponse mot par mot.
        À utiliser avec EventSource ou fetch(stream) côté frontend.
        """
        agent = get_agent(body.user_id)
        return StreamingResponse(
            agent.stream(body.message),
            media_type="text/plain"
        )

    @app.post("/plan", tags=["Agent"])
    def generate_plan(body: PlanRequest):
        """Génère directement un plan de formation via l'outil dédié."""
        try:
            agent  = get_agent(body.user_id)
            result = agent.tools.call("generate_training_plan", {
                "objectif":              body.objectif,
                "competences_actuelles": body.competences_actuelles,
                "duree_semaines":        str(body.duree_semaines),
                "niveau":                body.niveau,
            })
            return {"user_id": body.user_id, "plan": result.output, "success": result.success}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/evaluate", tags=["Agent"])
    def evaluate_evals(body: EvalRequest):
        """Synthétise les évaluations d'un enseignant."""
        try:
            agent  = get_agent(body.user_id)
            result = agent.tools.call("summarize_evaluations", {
                "evaluations_json": json.dumps(body.evaluations, ensure_ascii=False)
            })
            return {"user_id": body.user_id, "summary": result.output}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/memory/{user_id}", tags=["Mémoire"])
    def clear_memory(user_id: str):
        """
        Efface l'historique court terme d'un utilisateur.
        Conforme au droit à l'oubli (RGPD).
        """
        if user_id in _agent_cache:
            _agent_cache[user_id].reset()
        return {"cleared": True, "user_id": user_id}

    @app.delete("/memory/{user_id}/longterm", tags=["Mémoire"])
    def clear_longterm(user_id: str):
        """Efface la mémoire long terme d'un utilisateur (RGPD)."""
        mem = get_memory(user_id)
        mem.clear_longterm()
        return {"cleared": True, "user_id": user_id, "type": "long_term"}

    @app.get("/rag/stats", tags=["RAG"])
    def rag_stats():
        """Retourne les statistiques de l'index RAG."""
        return RAGEngine().stats()

    @app.get("/agents", tags=["Système"])
    def list_agents():
        """Liste les agents actifs en mémoire cache."""
        return {
            "active": list(_agent_cache.keys()),
            "count":  len(_agent_cache),
        }

    # ── PDF Generation ────────────────────────────────────────────────

    class PlanPDFRequest(BaseModel):
        plan_text:  str  = Field(..., description="Texte complet du plan généré par ARIA")
        user_name:  str  = Field(default="Enseignant")
        objectif:   str  = Field(default="Plan de Formation Personnalisé")
        duree:      int  = Field(default=8, ge=1, le=52)
        niveau:     str  = Field(default="intermédiaire")

    @app.post("/plan/pdf", tags=["Agent"], response_class=StreamingResponse)
    def plan_to_pdf(body: PlanPDFRequest):
        """
        Convertit un plan de formation (texte ARIA) en fichier PDF téléchargeable.
        Retourne un PDF binaire avec en-tête ESPRIT rouge et mise en page professionnelle.
        """
        try:
            from pdf_generator import generate_plan_pdf
            pdf_bytes = generate_plan_pdf(
                plan_text = body.plan_text,
                user_name = body.user_name,
                objectif  = body.objectif,
                duree     = body.duree,
                niveau    = body.niveau,
            )
            filename = f"plan_aria_{body.user_name.replace(' ', '_')}.pdf"
            return StreamingResponse(
                iter([pdf_bytes]),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        except Exception as e:
            logger.error(f"[API/plan/pdf] {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # ── RAG Sync — mise à jour de l'index depuis la BDD ──────────────

    class SyncRequest(BaseModel):
        formations: List[Dict] = Field(
            ...,
            description="Liste de formations [{code, titre, description, objectifs, niveau, badge}]"
        )

    @app.post("/rag/sync", tags=["RAG"])
    def sync_rag(body: SyncRequest):
        """
        Met à jour l'index RAG avec les formations fournies par la BDD principale.
        À appeler depuis esprit-talents quand une formation est ajoutée/modifiée.
        """
        rag = RAGEngine()
        indexed  = 0
        errors   = []

        for f in body.formations:
            try:
                # Construire le texte du document
                objectifs_text = "\n".join(f.get("objectifs") or [])
                doc_text = (
                    f"Formation : {f.get('titre', '')}\n"
                    f"Code : {f.get('code', '')}\n"
                    f"Niveau : {f.get('niveau', '')}\n"
                    f"Badge : {f.get('badge', '')}\n"
                    f"Description : {f.get('description', '')}\n"
                    f"Objectifs :\n{objectifs_text}"
                )
                # Injecter dans ChromaDB avec metadata formation
                doc_id = f"sync_{f.get('code', str(indexed))}"
                rag._upsert_chunks(
                    chunks=[{
                        "id":      f"{doc_id}_chunk_0",
                        "text":    doc_text,
                        "metadata": {
                            "doc_id":   doc_id,
                            "doc_type": "formation",
                            "source":   f"BDD:{f.get('code', '')}",
                            "chunk_idx": 0,
                        }
                    }]
                )
                indexed += 1
            except Exception as e:
                errors.append({"code": f.get("code"), "error": str(e)})

        stats = rag.stats()
        return {
            "indexed":      indexed,
            "errors":       errors,
            "total_chunks": stats["total_chunks"],
            "by_type":      stats["by_type"],
        }

    @app.post("/rag/reindex", tags=["RAG"])
    def reindex_all():
        """Re-indexe tous les documents depuis data/raw/ (rechargement complet)."""
        try:
            from rag_engine import index_all_documents
            stats = index_all_documents()
            return {"status": "ok", "indexed": stats}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    FASTAPI_OK = True

except ImportError:
    FASTAPI_OK = False
    logger.warning("[API] FastAPI non installé — API désactivée")


# ─────────────────────────────────────────────────────────────────────────
#  INTERFACE CLI (python agent_ia.py)
# ─────────────────────────────────────────────────────────────────────────

def cli():
    """Interface de conversation en ligne de commande."""
    print("\n" + "═" * 60)
    print(f"  {AGENT_NAME} v{AGENT_VERSION} — Agent IA ESPRIT")
    print(f"  Modèle : {LLM_MODEL}")
    print(f"  Commandes : 'quitter' | 'reset' | 'stats'")
    print("═" * 60 + "\n")

    agent = ARIAAgent(user_id="cli_user")

    while True:
        try:
            user_input = input("Vous : ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAu revoir !")
            break

        if not user_input:
            continue

        if user_input.lower() in ("quitter", "exit", "quit"):
            print("Au revoir !")
            break

        if user_input.lower() == "reset":
            agent.reset()
            print("Historique effacé.\n")
            continue

        if user_input.lower() == "stats":
            s = agent.memory.memory_stats()
            r = agent.rag.stats()
            print(f"Mémoire : {s}")
            print(f"RAG     : {r}\n")
            continue

        # Appel à l'agent
        response = agent.run(user_input)
        print(f"\nARIA : {response.answer}")
        print(
            f"\n[{response.duration}s | "
            f"iter:{response.iterations} | "
            f"outils:{response.tools_used or 'aucun'} | "
            f"RAG:{'✓' if response.rag_used else '✗'} | "
            f"mémoire:{'✓' if response.memory_used else '✗'}]\n"
        )


# ─────────────────────────────────────────────────────────────────────────
#  POINT D'ENTRÉE
# ─────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli()
