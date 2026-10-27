# Projet ESPRIT — Agent IA ARIA

## Contexte
Plateforme de gestion des talents pour l'école ESPRIT (Tunis).
Agent IA local appelé ARIA — 100% local, zéro API externe.

## Stack technique
- LLM : Llama 3.1 8B via Ollama (localhost:11434)
- Embeddings : nomic-embed-text via Ollama
- Vectorstore : ChromaDB (persistant local)
- API : FastAPI + uvicorn
- Language : Python 3.11+

## Hardware cible
- GPU : RTX 4060 Laptop 8GB VRAM
- RAM : 32 GB
- OS : Windows 11

## Architecture (5 fichiers principaux)
- config.py         → toutes les constantes
- rag_engine.py     → indexation + recherche ChromaDB
- memory.py         → mémoire CT (historique) + LT (ChromaDB par user)
- tools.py          → 6 outils de l'agent
- agent_ia.py       → boucle ReAct + API FastAPI

## Fichiers déjà générés (à récupérer dans le chat Claude)
- skills_engine.py  → moteur ML extraction compétences CV
- agent_ia.py       → version V1 de l'agent (à améliorer avec RAG)

## Phases de développement
Phase 01 : environnement ✓ (à faire)
Phase 02 : moteur RAG
Phase 03 : mémoire
Phase 04 : agent ReAct
Phase 05 : API + tests

## Ce que l'agent fait
- Génère des plans de formation personnalisés (IA)
- Évalue les profils enseignants
- Recommande des formations du catalogue ESPRIT
- Répond aux questions procédurales
- Se souvient des préférences par utilisateur (mémoire persistante)