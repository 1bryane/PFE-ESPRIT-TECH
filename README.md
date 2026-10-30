# ESPRIT Talents

Plateforme intelligente de gestion des talents du personnel enseignant d'ESPRIT.
Projet de fin d'études réalisé à **ESPRIT Tech** (mai – juillet 2026).

> **English summary.** Full-stack talent management platform built as a graduation project. It is split into three microservices: a hybrid NLP scoring engine (spaCy, Sentence-BERT, TF-IDF), a local LLM agent (Llama 3.1 8B via Ollama, RAG with ChromaDB, ReAct pattern) and a FastAPI backend (72 endpoints, JWT authentication, 15 roles), plus a React frontend. About 17,700 lines of code.

## Sommaire

- [Présentation](#présentation)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Les trois services](#les-trois-services)
- [Installation et lancement](#installation-et-lancement)
- [Limites connues et pistes d'amélioration](#limites-connues-et-pistes-damélioration)
- [Auteur](#auteur)

## Présentation

ESPRIT Talents aide à évaluer les profils du personnel enseignant et à recommander des formations adaptées. La plateforme combine :

- un **moteur de scoring** qui extrait les informations d'un profil et le compare à des référentiels ;
- un **agent conversationnel, ARIA**, qui répond en langage naturel et appelle des outils métier ;
- une **API sécurisée** qui gère les utilisateurs, les rôles et les données ;
- une **interface web** pour les différents profils d'utilisateurs.

## Architecture

```mermaid
flowchart LR
    U["Utilisateur"] --> F["Frontend React + Vite<br/>port 5173"]
    F --> B["Backend FastAPI<br/>port 8002"]
    B --> DB[("SQLite<br/>SQLAlchemy")]
    B --> M["Moteur ML<br/>port 8000"]
    B --> A["Agent ARIA<br/>port 8001"]
    A --> O["Ollama<br/>Llama 3.1 8B"]
    A --> C[("ChromaDB<br/>RAG")]
```

Trois microservices indépendants (moteur ML, agent ARIA, backend) communiquent par API REST. Le frontend ne parle qu'au backend, qui centralise l'authentification et l'accès aux données. Le chat en temps réel passe par WebSocket.

## Stack technique

| Domaine | Technologies |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, SQLite, JWT, WebSocket |
| Moteur ML | spaCy, RapidFuzz, TF-IDF, Sentence-BERT (`paraphrase-multilingual-MiniLM-L12-v2`) |
| Agent IA | Llama 3.1 8B (quantification Q4_K_M) via Ollama, ChromaDB, pattern ReAct |
| Frontend | React 18, Vite |

## Les trois services

### Moteur ML (port 8000)

Calcule un score d'adéquation en trois couches :

- extraction d'entités nommées avec **spaCy** ;
- similarité sémantique avec **Sentence-BERT** multilingue (embeddings de dimension 384) ;
- correspondance lexicale avec **TF-IDF**, **RapidFuzz** et des mots-clés.

La pondération est adaptative. Les poids de référence sont de 40 % pour Sentence-BERT, 35 % pour TF-IDF et 25 % pour les mots-clés.

### Agent ARIA (port 8001)

Agent conversationnel fonctionnant **en local** (aucune donnée envoyée à un service externe pour la génération).

- Modèle : Llama 3.1 8B quantifié Q4_K_M, servi par Ollama (température 0,3, fenêtre de contexte de 8192 tokens).
- **RAG** : base vectorielle ChromaDB alimentée par un corpus de connaissances.
- **Mémoire à 3 niveaux** pour garder le contexte des échanges.
- **Pattern ReAct** : l'agent raisonne, choisit un outil, observe le résultat, puis répond.
- **7 outils** : `generate_training_plan`, `evaluate_profile`, `recommend_formations`, `explain_talent_path`, `summarize_evaluations`, `search_knowledge`, `search_web`.

### Backend (port 8002)

- 15 routeurs FastAPI et **72 endpoints**.
- 13 tables gérées avec SQLAlchemy.
- Authentification **JWT** et **15 rôles** organisationnels.
- Chat temps réel par WebSocket.
- Jeu de données de test : 17 utilisateurs couvrant 10 rôles.

## Installation et lancement

### Prérequis

- Python `3.11` et pip
- Node.js `v22.15.1` et npm
- [Ollama](https://ollama.com) installé, avec le modèle téléchargé :

```bash
ollama pull llama3.1:8b
```

### 1. Cloner le dépôt

```bash
git clone https://github.com/1bryane/PFE-ESPRIT-TECH.git
cd PFE-ESPRIT-TECH
```

### 2. Lancer les services

#### Lancement automatique (Windows)

Après la première installation (voir plus bas), double-cliquer sur `start_all.bat` à la racine du dépôt. Le script démarre dans l'ordre Ollama, moteur ML, ARIA, backend et frontend, surveille chaque service (`/health`), le relance s'il s'arrête et ouvre http://localhost:5173 quand tout est prêt. `Ctrl+C` arrête tout ; `stop_all.bat` coupe les services restés actifs.

#### Première installation (une seule fois)

Les environnements virtuels doivent porter les noms ci-dessous : `start_all.ps1` les utilise.

**Moteur ML (port 8000)**

```powershell
cd SCRIPT_PYTHON_ML
python -m venv env
.\env\Scripts\activate
pip install -r requirements.txt
python -m spacy download fr_core_news_md
python -m spacy download en_core_web_md
```

**Agent ARIA (port 8001)**

```powershell
cd esprit-aria
python -m venv env
.\env\Scripts\activate
pip install -r requirements.txt
```

**Backend (port 8002)**

```powershell
cd esprit-talents\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend (port 5173)**

```powershell
cd esprit-talents\frontend
npm install
```

#### Lancement manuel (un terminal par service)

Ordre de démarrage : Ollama, moteur ML, ARIA, backend, frontend.

```powershell
ollama serve                                              # si Ollama n'est pas déjà actif
cd SCRIPT_PYTHON_ML;          .\env\Scripts\activate; uvicorn skills_engine:app --port 8000
cd esprit-aria;               .\env\Scripts\activate; uvicorn agent_ia:app --port 8001
cd esprit-talents\backend;    .\venv\Scripts\activate; python bootstrap_db.py; uvicorn main:app --port 8002
cd esprit-talents\frontend;   npm run dev
```

Chaque service Python expose `/health` (par exemple http://localhost:8002/health). `bootstrap_db.py` initialise la base de données au démarrage du backend.

### Structure du dépôt

| Dossier ou fichier | Rôle |
|---|---|
| `SCRIPT_PYTHON_ML/` | Moteur ML (port 8000) |
| `esprit-aria/` | Agent conversationnel ARIA (port 8001) |
| `esprit-talents/backend/` | API FastAPI (port 8002) |
| `esprit-talents/frontend/` | Interface React + Vite (port 5173) |
| `start_all.bat`, `start_all.ps1`, `stop_all.bat` | Lancement et arrêt unifiés (Windows) |
| `USE_CASES.md`, `RESTITUTION_TECHNIQUE.md` | Cas d'usage et documentation technique |

### Comptes de test

Des utilisateurs fictifs sont créés par le script `/esprit-talents/backend/seed.py`. Aucune donnée réelle n'est incluse dans le dépôt.

## Limites connues et pistes d'amélioration

Ce projet est un prototype académique. Ses limites actuelles :

| Limite | Piste |
|---|---|
| Aucun test automatisé | Ajouter des tests (pytest côté Python, Vitest côté frontend) et une intégration continue |
| Base SQLite | Migrer vers PostgreSQL pour la concurrence et le déploiement |
| Corpus RAG réduit (22 passages indexés) | Élargir le corpus et mesurer la qualité des réponses |
| Lancement manuel de quatre services | Conteneuriser avec Docker et orchestrer avec docker-compose |
| Historique Git créé après le développement | Travailler par branches et commits atomiques pour la suite |

## Auteur

**Harold Bryane Lys Kouassivi AGBEMAVO**
Ingénieur data science (ESPRIT, 2026), master Data Engineering for AI (DSTI Paris)

- GitHub : [github.com/1bryane](https://github.com/1bryane)
- LinkedIn : [linkedin.com/in/harold-agbemavo](https://www.linkedin.com/in/harold-agbemavo)

## Licence

Projet académique réalisé à ESPRIT Tech. 
