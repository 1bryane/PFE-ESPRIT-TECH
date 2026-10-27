# RAPPORT DE STAGE DE FIN D'ÉTUDES
## Projet de Fin d'Études — Cycle Ingénieur

---

**Intitulé du projet :**
**Conception et Développement d'une Plateforme Intelligente de Gestion des Talents avec Agent IA Intégré**

---

| | |
|---|---|
| **Étudiant** | Harold AGBEMA |
| **Filière** | Génie Logiciel / Ingénierie Informatique |
| **Établissement** | ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies |
| **Maître de stage** | Mme Syrine Karoui |
| **Organisme d'accueil** | ESPRIT — Département Innovation Pédagogique |
| **Période de stage** | 13 janvier 2026 — en cours |
| **Date de soutenance** | 14 juillet 2026 |

---

---

# REMERCIEMENTS

Je tiens tout d'abord à exprimer ma sincère gratitude envers Mme Syrine Karoui, ma maître de stage, pour la confiance qu'elle m'a accordée en me confiant ce projet ambitieux, pour ses orientations précieuses et pour la liberté qu'elle m'a laissée dans les choix techniques. Ses retours, même espacés, m'ont toujours permis de recadrer mes efforts sur l'essentiel.

Je remercie également l'institution ESPRIT pour avoir été à la fois le commanditaire et le terrain d'application de ce projet, ce qui m'a permis de travailler sur un cas d'usage réel et riche en complexité.

Je remercie enfin la communauté open-source — Ollama, LangChain, ChromaDB, FastAPI, React — sans laquelle ce projet n'aurait pas pu atteindre ce niveau d'ambition dans le cadre d'un stage individuel.

---

---

# RÉSUMÉ

Ce rapport présente le travail réalisé dans le cadre de mon stage de fin d'études à ESPRIT, portant sur la conception et le développement d'une plateforme intelligente de gestion des talents enseignants. Face aux défis posés par la gestion manuelle et fragmentée des ressources humaines pédagogiques, j'ai conçu et implémenté une solution complète intégrant un backend REST, une interface web réactive, un moteur de matching par apprentissage automatique et un agent IA conversationnel basé sur les grands modèles de langage (LLM).

Le système — baptisé **ESPRIT Talents** — orchestre neuf rôles distincts (de l'candidat à la Direction Générale), automatise le recrutement, les évaluations et le développement des compétences, et intègre **ARIA** (Agent de Recommandation IA), un assistant pédagogique intelligent capable de générer des plans de formation personnalisés, d'effectuer des recherches web et de mémoriser le contexte de chaque utilisateur.

**Mots-clés :** Intelligence Artificielle, LLM, RAG, Agent ReAct, FastAPI, React.js, ChromaDB, Gestion des Talents, Matching ML.

---

**ABSTRACT**

This report presents the work carried out during my final-year internship at ESPRIT, focusing on the design and development of an intelligent talent management platform for teaching staff. Facing challenges posed by the manual and fragmented management of pedagogical human resources, I designed and implemented a complete solution integrating a REST backend, a reactive web interface, a machine-learning-based matching engine, and a conversational AI agent based on large language models (LLMs).

The system — named **ESPRIT Talents** — orchestrates nine distinct roles (from candidate to General Management), automates recruitment, evaluations and skill development, and integrates **ARIA** (AI Recommendation Agent), an intelligent pedagogical assistant capable of generating personalized training plans, conducting web searches, and memorizing each user's context.

---

---

# TABLE DES MATIÈRES

1. Introduction générale
2. Présentation de l'organisme d'accueil
3. Contexte et problématique
4. État de l'art et étude comparative
5. Méthodologie de travail
6. Architecture globale du système
7. Technologies utilisées et justification des choix
8. Conception et modélisation
9. Implémentation par module
10. Tests et validation
11. Difficultés rencontrées et solutions apportées
12. Résultats et bilan
13. Perspectives et améliorations futures
14. Conclusion générale
15. Références bibliographiques
16. Annexes

---

---

# CHAPITRE 1 — INTRODUCTION GÉNÉRALE

## 1.1 Contexte général

Dans un monde en perpétuelle évolution technologique et pédagogique, les institutions d'enseignement supérieur font face à un défi de taille : attirer, évaluer, former et retenir les meilleurs talents enseignants. ESPRIT, école d'ingénierie reconnue en Tunisie et membre du réseau Honoris United Universities, ne fait pas exception à cette réalité. La gestion de ses ressources humaines pédagogiques repose encore, dans une large mesure, sur des processus manuels, des échanges par email et des fichiers dispersés — une organisation qui ne peut plus répondre aux exigences d'une institution en croissance rapide.

C'est dans ce contexte que s'inscrit mon projet de fin d'études : concevoir et développer une plateforme numérique intelligente capable de centraliser, automatiser et enrichir l'ensemble du cycle de vie d'un talent pédagogique à ESPRIT, depuis sa première candidature jusqu'à la valorisation de son statut de "Talent ESPRIT".

## 1.2 Motivation personnelle

En tant qu'étudiant en génie logiciel, ce projet représente pour moi l'opportunité rare de combiner plusieurs domaines qui me passionnent : le développement web full-stack, l'intelligence artificielle appliquée, l'architecture logicielle et la gestion de projets. Travailler seul sur un système de cette envergure m'a contraint à m'approprier chaque couche technologique, à prendre des décisions architecturales motivées et à produire du code maintenable — des compétences directement transposables en situation professionnelle.

## 1.3 Objectifs du rapport

Ce rapport vise à documenter exhaustivement les choix techniques, architecturaux et méthodologiques effectués au cours de ce stage. Chaque décision est justifiée afin de rendre compte de la démarche intellectuelle suivie. Le rapport s'adresse à un jury technique et doit donc être suffisamment précis pour résister aux questions approfondies lors de la soutenance.

---

---

# CHAPITRE 2 — PRÉSENTATION DE L'ORGANISME D'ACCUEIL

## 2.1 ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies

Fondée en 2003, ESPRIT est l'une des écoles d'ingénierie privées les plus réputées de Tunisie. Accréditée et membre du réseau **Honoris United Universities** — le premier réseau pan-africain d'enseignement supérieur privé — ESPRIT forme chaque année des centaines d'ingénieurs dans des spécialités telles que l'informatique, le génie civil, l'électronique et le management.

La devise de l'école — *"Se former autrement"* — reflète son engagement pour une pédagogie innovante, centrée sur les compétences pratiques et l'adaptabilité aux évolutions du marché du travail.

## 2.2 Département Innovation Pédagogique

Mon stage s'est déroulé au sein du département Innovation Pédagogique, sous la supervision de Mme Syrine Karoui. Ce département est responsable du développement professionnel des enseignants, de la mise en place de formations internes et de la valorisation des compétences pédagogiques au sein de l'institution.

## 2.3 Problème identifié par l'institution

L'équipe m'a exposé un constat clair dès le début du stage : il n'existe aucun outil dédié à la gestion centralisée des talents enseignants. Les candidatures se font par email, les évaluations par fichiers Excel, les formations par bouche-à-oreille, et aucune donnée n'est croisée pour identifier les profils les plus prometteurs. Cette situation génère des inefficacités, des pertes d'information et une expérience candidat/enseignant dégradée.

---

---

# CHAPITRE 3 — CONTEXTE ET PROBLÉMATIQUE

## 3.1 Problématique générale

**Comment concevoir et déployer une plateforme numérique intelligente permettant à ESPRIT de gérer l'intégralité du cycle de vie de ses talents pédagogiques, de la candidature à la valorisation, en intégrant des mécanismes d'intelligence artificielle pour automatiser et personnaliser les interactions ?**

Cette problématique se décompose en plusieurs sous-problèmes :

### 3.1.1 Fragmentation des processus

Les processus actuels impliquent de multiples outils non interconnectés : emails pour les candidatures, tableurs pour les évaluations, réunions physiques pour les décisions de recrutement. Cette fragmentation rend impossible toute vue consolidée d'un profil enseignant.

**Solution apportée :** Conception d'une plateforme unique avec base de données relationnelle centralisée et API REST qui fédère tous les flux d'information.

### 3.1.2 Absence d'objectivité dans le tri des candidats

Les candidats sont triés manuellement, ce qui introduit des biais subjectifs et est chronophage. Un RP peut avoir des dizaines de candidatures à évaluer pour une seule offre.

**Solution apportée :** Intégration d'un moteur de matching par apprentissage automatique (ML Engine) qui calcule automatiquement un score de compatibilité entre le profil du candidat (compétences extraites du CV) et les exigences de l'offre.

### 3.1.3 Manque d'accompagnement pédagogique personnalisé

Les enseignants n'ont pas accès à un accompagnement personnalisé pour planifier leur développement de compétences. Les formations proposées sont génériques et ne tiennent pas compte du profil individuel.

**Solution apportée :** Développement de l'agent IA ARIA, capable de générer des plans de formation personnalisés semaine par semaine, d'exploiter la base de connaissances ESPRIT via le RAG et de mémoriser le contexte propre à chaque utilisateur.

### 3.1.4 Gestion opaque du statut "Talent"

La distinction "Talent ESPRIT" n'a pas de processus formalisé. Qui décide ? Sur quels critères ? Comment valoriser cette distinction ?

**Solution apportée :** Implémentation d'un workflow complet et traçable : Demande enseignant → Analyse RH → Validation Direction Générale → Attribution du badge → Accès aux avantages.

### 3.1.5 Contraintes matérielles pour l'IA

L'intégration de l'intelligence artificielle dans une institution sans infrastructure cloud dédiée soulève la question des ressources matérielles. Les LLM propriétaires (GPT-4, Claude) impliquent des coûts d'API récurrents et des questions de confidentialité des données.

**Solution apportée :** Déploiement d'un LLM open-source (Llama 3.1 8B) en local via Ollama, fonctionnant sur le hardware disponible (RTX 4060 8GB, 32GB RAM, i7-13620H).

## 3.2 Périmètre du projet

Le projet couvre les modules suivants :
- Authentification et gestion des rôles (9 rôles distincts)
- Recrutement (candidature, scoring ML, entretiens, validation)
- Évaluation des enseignants (multi-critères, statistiques)
- Formations (catalogue, inscriptions, progression, propositions IA)
- Gestion des Talents (workflow complet, valorisation)
- Communication (chat interne WebSocket, notifications)
- Agent IA ARIA (RAG, mémoire, outils, génération PDF, recherche web)

---

---

# CHAPITRE 4 — ÉTAT DE L'ART ET ÉTUDE COMPARATIVE

## 4.1 Solutions existantes de gestion des talents

Avant de concevoir la solution, j'ai analysé les plateformes existantes sur le marché pour en comprendre les forces et les limites dans notre contexte spécifique.

### 4.1.1 Solutions du marché

| Plateforme | Points forts | Limites pour ESPRIT |
|-----------|-------------|---------------------|
| **Workday** | Gestion RH complète, analytics | Coût prohibitif pour une PME, non adapté à l'enseignement |
| **SAP SuccessFactors** | Intégré, scalable | Complexité d'implémentation, pas de personnalisation IA |
| **LinkedIn Talent** | Base de données de candidats | Pas de gestion interne, RGPD, pas de formations IA |
| **Moodle + LMS** | Gestion formations | Pas de recrutement, pas d'IA conversationnelle |
| **Solutions sur mesure** | Adaptées aux besoins | Développement long, coûteux |

**Conclusion :** Aucune solution existante ne combine recrutement, évaluation, formations et IA conversationnelle dans un contexte d'institution d'enseignement tunisienne. Le développement d'une solution sur mesure s'impose.

## 4.2 État de l'art en IA pour les ressources humaines

### 4.2.1 Matching CV-offre

Deux approches principales existent :
- **Approche par mots-clés** : TF-IDF, Bag of Words — rapide mais peu précise sémantiquement
- **Approche par embeddings** : Sentence-BERT, Universal Sentence Encoder — sémantiquement riche mais plus lourde

J'ai choisi une approche hybride à trois couches (dictionnaire + TF-IDF + Sentence-BERT) pour combiner précision et robustesse.

### 4.2.2 Agents IA conversationnels

Le paradigme dominant en 2025-2026 pour les agents IA est le framework **ReAct** (Reasoning + Acting), publié par Yao et al. (2022). Contrairement à une simple chaîne de prompts, ReAct permet à l'agent de raisonner sur sa décision (Thought), d'agir (Action) et d'observer le résultat (Observation) en boucle. Ce paradigme est particulièrement adapté à ARIA qui doit décider dynamiquement entre plusieurs outils.

### 4.2.3 RAG vs Fine-tuning

Le choix entre fine-tuning et RAG (Retrieval-Augmented Generation) est crucial :

| Critère | Fine-tuning | RAG |
|---------|------------|-----|
| Intégration de données spécifiques | Possible mais figée | Dynamique |
| Coût en données d'entraînement | Milliers d'exemples | Quelques documents |
| Hardware requis | GPU haut de gamme (A100) | GPU gaming (RTX 4060) |
| Mise à jour du savoir | Réentraînement complet | Mise à jour de l'index |
| Hallucinations | Réduites mais présentes | Fortement réduites |
| **Notre contexte** | **Impossible (pas de données, hardware limité)** | **Idéal** |

**Le RAG s'impose comme seule option viable** dans notre contexte matériel et de disponibilité des données.

---

---

# CHAPITRE 5 — MÉTHODOLOGIE DE TRAVAIL

## 5.1 Contexte de travail individuel

Ce stage présente la particularité d'être réalisé **en solo**, sans équipe de développement. Cette situation, bien que challengeante, m'a contraint à adopter une rigueur méthodologique accrue : chaque décision doit être documentée, chaque composant doit être testable indépendamment, et la progression doit être mesurable.

Ma maître de stage, Mme Syrine Karoui, intervient en tant que conseillère et validatrice des orientations fonctionnelles, mais sans implication dans les choix techniques. Cette configuration m'a conféré une autonomie totale, assortie d'une responsabilité totale.

## 5.2 Méthodologie agile adaptée au travail individuel

J'ai adopté une méthodologie inspirée de **Scrum**, adaptée au contexte solo et aux contraintes d'un stage. Plutôt que des sprints en équipe avec cérémonials formels, j'ai travaillé en **itérations de 1 à 2 semaines** avec les pratiques suivantes :

### 5.2.1 Planification par priorités (MoSCoW)

À chaque itération, je classe les fonctionnalités selon la méthode MoSCoW :
- **Must-have** : Sans quoi le système ne fonctionne pas
- **Should-have** : Importante mais pas bloquante
- **Could-have** : Améliorations si le temps le permet
- **Won't-have** : Hors périmètre du PFE

### 5.2.2 Backlog personnel

J'ai maintenu un backlog évolutif de toutes les fonctionnalités, bugs et améliorations. Ce document m'a servi de fil directeur tout au long du stage et constitue la base de ce rapport.

### 5.2.3 Versionning continu

Bien qu'il n'y ait pas de dépôt Git centralisé dans ce projet, j'ai appliqué les principes du versioning en nommant mes fichiers avec des indicateurs d'état et en conservant des snapshots réguliers des composants stables.

## 5.3 Chronologie du projet

### Phase 1 : Analyse et conception (13 jan — 15 fév 2026)

Cette première phase, la plus longue en termes de réflexion, a été consacrée à :
- L'étude des besoins fonctionnels auprès de Mme Karoui
- L'analyse des solutions existantes
- La rédaction du cahier des charges
- La conception de l'architecture globale (N-tier, microservices)
- Le choix et la validation des technologies (LLM, vectorstore, framework)
- La mise en place de l'environnement de développement

**Livrable :** Cahier des charges, maquettes, diagrammes d'architecture.

### Phase 2 : Développement du cœur IA — ARIA (16 fév — 15 mars 2026)

- Développement du moteur RAG (rag_engine.py — 752 lignes)
- Développement du système de mémoire (memory.py — 568 lignes)
- Développement des outils de l'agent (tools.py — 619+ lignes)
- Développement de l'agent ReAct (agent_ia.py — 759 lignes)
- Indexation des documents ESPRIT (formations, règlement, FAQ, offres)
- Tests extensifs de l'agent en CLI
- Correction des bugs critiques (enveloppe JSON, hallucinations)

**Livrable :** Agent ARIA opérationnel en CLI et via API FastAPI (port 8001).

### Phase 3 : Développement ML Engine (16 mars — 31 mars 2026)

- Intégration du skills_engine.py (existant, 1068 lignes)
- Exposition via API FastAPI (port 8000)
- Validation du matching CV↔offre avec données réelles

**Livrable :** ML Engine exposant 7 endpoints de matching et d'extraction.

### Phase 4 : Backend principal — esprit-talents (1 avr — 30 avr 2026)

- Architecture N-tier avec séparation claire des couches
- Modèles de données SQLAlchemy (8 tables, relations)
- Schémas Pydantic (validation des entrées/sorties)
- 60 endpoints REST (auth, users, offres, candidatures, évaluations, formations, chat, ARIA, avantages, rapports)
- WebSocket pour le chat en temps réel
- Système de notifications
- Seed de données réalistes

**Livrable :** Backend complet, 60 routes, base de données peuplée.

### Phase 5 : Frontend React.js (1 mai — 31 mai 2026)

- Initialisation Vite + Tailwind + React Router v6
- Contexte d'authentification JWT
- Routing protégé par rôle
- 16+ pages fonctionnelles couvrant les 9 rôles
- Interface ARIA Chat avec génération PDF
- Chat WebSocket temps réel
- Notifications avec polling toutes les 30 secondes

**Livrable :** Interface web complète, build de production validé.

### Phase 6 : Intégration, corrections et optimisation (1 juin — en cours)

- Audit complet de sécurité (IDOR, failles d'accès)
- Correction de 14 bugs identifiés lors du diagnostic
- Ajout des fonctionnalités manquantes (avantages persistés, PDF vrai, propositions directes)
- Aide personnalisée par rôle
- Documentation du code et du rapport

## 5.4 Outils de productivité utilisés

| Outil | Usage |
|-------|-------|
| **PowerShell / CMD** | Exécution des services, tests, seed |
| **Postman** | Test des endpoints API |
| **VS Code** | IDE principal |
| **DB Browser for SQLite** | Inspection de la base de données |
| **Ollama CLI** | Gestion des modèles LLM |
| **Git (local)** | Versioning minimal |

---

---

# CHAPITRE 6 — ARCHITECTURE GLOBALE DU SYSTÈME

## 6.1 Vision architecturale

J'ai fait le choix d'une **architecture N-Tier en microservices**. Cette décision est fondamentale et mérite une justification approfondie.

### 6.1.1 Pourquoi les microservices plutôt qu'un monolithe ?

Un monolithe aurait été plus simple à démarrer mais aurait présenté des limitations critiques dans notre contexte :

**Arguments pour les microservices :**
1. **Isolation des pannes** : Si ARIA (LLM, 180s de timeout) tombe, le reste de la plateforme (recrutement, chat) continue de fonctionner.
2. **Scalabilité indépendante** : Le ML Engine (CPU/GPU intensif) peut être scalé séparément du backend REST.
3. **Remplacement technologique** : On peut remplacer Llama 3.1 par GPT-4 dans ARIA sans toucher au backend principal.
4. **Spécialisation** : Chaque service a un langage et des dépendances optimaux pour son usage.
5. **Réalisme professionnel** : Les systèmes IA modernes en production sont architecturés en microservices (ex: Netflix, Spotify).

### 6.1.2 Vue d'ensemble de l'architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    NAVIGATEUR WEB                              │
│         React 18 + Vite + Tailwind (port 5173)                │
└──────────────────────────┬─────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼─────────────────────────────────────┐
│               BACKEND PRINCIPAL (FastAPI — port 8002)          │
│  Auth JWT │ CRUD │ Chat WS │ Notifications │ Proxy ARIA/ML     │
│  SQLAlchemy ORM │ SQLite │ reportlab PDF                       │
└─────────────┬────────────────────────┬──────────────────────────┘
              │ HTTP async (httpx)     │ HTTP async (httpx)
┌─────────────▼──────────┐  ┌─────────▼──────────────────────────┐
│  ML ENGINE (port 8000) │  │      AGENT ARIA (port 8001)        │
│  skills_engine.py      │  │  agent_ia.py + rag_engine.py       │
│  3-layer ML matching   │  │  memory.py + tools.py              │
│  TF-IDF + BERT         │  │  ChromaDB + Ollama                 │
└────────────────────────┘  └─────────────────────────────────────┘
                                         │
                                ┌────────▼───────────┐
                                │  OLLAMA (GPU local) │
                                │  Llama 3.1 8B       │
                                │  nomic-embed-text   │
                                └────────────────────┘
```

### 6.1.3 Flux de données principaux

**Flux de candidature avec scoring ML :**
1. Candidat poste sur le frontend (React)
2. Le backend (port 8002) reçoit la requête
3. Le backend appelle le ML Engine (port 8000) avec le CV et les compétences de l'offre
4. Le ML Engine retourne un score (0-100%)
5. La candidature est sauvegardée en BDD avec le score
6. Le RP voit les candidats triés par score

**Flux de génération de plan ARIA :**
1. L'enseignant soumet un objectif sur le frontend
2. Le backend proxy vers ARIA (port 8001)
3. ARIA interroge ChromaDB (RAG) pour le contexte ESPRIT
4. ARIA appelle Ollama (Llama 3.1 8B) pour générer le plan
5. La réponse remonte jusqu'au frontend
6. Le frontend affiche le plan avec un bouton "Télécharger PDF"

## 6.2 Choix de la base de données

### 6.2.1 SQLite pour le développement

J'ai choisi **SQLite** pour la phase de développement et de PFE pour les raisons suivantes :
- Pas de serveur à installer ni configurer
- Fichier portable (.db) — la base entière peut être copiée et partagée
- Parfaitement supporté par SQLAlchemy
- Performances suffisantes pour un environnement de démonstration

**Limites connues et anticipées :** SQLite ne supporte pas les écritures concurrentes massives. En production, la migration vers PostgreSQL est prévue et ne nécessiterait que de changer l'URL de connexion dans le fichier .env.

### 6.2.2 ChromaDB pour les vecteurs

Deux bases de données vectorielles sont utilisées pour ARIA :
- **RAG DB** : Index des documents ESPRIT (formations, règlement, FAQ)
- **Memory DB** : Mémoire long terme per-utilisateur

ChromaDB a été choisi car il est nativement Python, local (pas de cloud), et s'intègre parfaitement avec les embeddings Ollama.

---

---

# CHAPITRE 7 — TECHNOLOGIES UTILISÉES ET JUSTIFICATION DES CHOIX

Cette section est la plus critique pour la soutenance. Chaque choix technologique doit être justifié par rapport aux alternatives.

## 7.1 Langage de programmation backend — Python

**Pourquoi Python ?**

Python s'impose naturellement pour un projet à la croisée du développement web et de l'IA :
- **Écosystème IA inégalé** : La quasi-totalité des bibliothèques ML/DL (PyTorch, scikit-learn, HuggingFace, LangChain, ChromaDB) sont nativement Python.
- **FastAPI** : Le framework web Python le plus performant pour les APIs REST async.
- **Sentence-Transformers** : La bibliothèque de référence pour les embeddings sémantiques est Python-only.
- **Maturité** : Python est le langage #1 en data science et IA depuis plusieurs années.

**Alternatives écartées :**
- **Node.js** : Excellent pour le web, mais l'écosystème ML est limité. Intégrer un LLM en Node.js nécessiterait des appels HTTP vers Python de toute façon.
- **Java/Spring** : Puissant mais verbeux et moins adapté aux projets IA.
- **Go** : Performances excellentes mais aucune bibliothèque IA mature.

## 7.2 Framework web backend — FastAPI

**Pourquoi FastAPI ?**

FastAPI, créé par Sebastián Ramírez, est le framework Python moderne de référence pour les APIs REST :

| Critère | FastAPI | Django REST | Flask |
|---------|---------|-------------|-------|
| **Performance** | Très haute (async natif) | Moyenne (WSGI) | Moyenne (WSGI) |
| **Validation automatique** | ✅ Pydantic intégré | Partielle | Manuelle |
| **Documentation auto** | ✅ Swagger/OpenAPI | Plugin requis | Plugin requis |
| **WebSocket** | ✅ Natif | Plugin | Plugin |
| **Type hints** | ✅ Obligatoires | Optionnels | Optionnels |
| **Courbe d'apprentissage** | Modérée | Élevée | Faible |

FastAPI génère automatiquement une documentation Swagger accessible à `/docs`, ce qui a considérablement facilité le développement et les tests. De plus, son support natif de l'asynchronisme (`async/await`) est indispensable pour les appels vers ARIA et le ML Engine sans bloquer l'event loop.

**Justification spécifique :** Le WebSocket du chat est géré nativement par FastAPI via Starlette, sans dépendance supplémentaire.

## 7.3 LLM — Llama 3.1 8B via Ollama

C'est le choix le plus critique du projet, qui conditionne toute la valeur ajoutée de l'agent ARIA.

### 7.3.1 Pourquoi un LLM open-source plutôt qu'un LLM propriétaire ?

| Critère | Llama 3.1 8B (local) | GPT-4 (API) | Claude 3 (API) |
|---------|---------------------|-------------|----------------|
| **Coût** | Gratuit | 0.01-0.03$/1K tokens | 0.015$/1K tokens |
| **Confidentialité** | ✅ Données locales | ❌ Données envoyées à OpenAI | ❌ Données envoyées à Anthropic |
| **Latence** | 15-80s (hardware local) | 2-10s | 3-12s |
| **Disponibilité** | 100% (local) | Dépend d'OpenAI | Dépend d'Anthropic |
| **Personnalisation** | Possible (AGENT_ROLE) | Partielle | Partielle |
| **RGPD** | ✅ Données restent locales | ⚠️ Compliance complexe | ⚠️ Compliance complexe |
| **Fine-tuning possible** | ✅ | ✅ (coûteux) | ❌ |

**Argument décisif pour ESPRIT :** Les données pédagogiques et les profils enseignants sont des données sensibles. Les envoyer vers des serveurs OpenAI ou Anthropic pose des questions légales (RGPD) et éthiques que nous avons délibérément évitées.

### 7.3.2 Pourquoi Llama 3.1 8B spécifiquement ?

Parmi les modèles open-source disponibles en janvier 2026 :
- **Llama 3.1 8B** : Excellent rapport performance/ressources, excellente compréhension du français, contexte de 128K tokens
- **Mistral 7B** : Très bon mais légèrement inférieur en compréhension contextuelle
- **Llama 3.1 70B** : Meilleures performances mais nécessite 40+ GB VRAM — incompatible avec la RTX 4060 8GB
- **Phi-3 Mini** : Plus léger (3.8B) mais moins précis sur les tâches complexes

**Le choix Llama 3.1 8B est optimal pour le hardware disponible (RTX 4060 8GB, 32GB RAM).**

### 7.3.3 Pourquoi Ollama comme runtime ?

Ollama simplifie considérablement le déploiement des LLM en local :
- Un seul CLI pour télécharger, lancer et interroger des modèles
- API HTTP locale standardisée (compatible OpenAI)
- Gestion automatique de la VRAM (quantification, offloading)
- Pas de configuration CUDA manuelle

**Alternative écartée :** llama.cpp en direct — plus flexible mais nécessite une compilation et une configuration manuelle complexes, sans bénéfice clair dans notre contexte.

## 7.4 Architecture agent — Pattern ReAct

Le pattern ReAct (Yao et al., 2022) est la fondation de l'architecture de l'agent ARIA.

**Pourquoi ReAct plutôt qu'un simple prompt ?**

Un simple appel LLM produit une réponse statique basée uniquement sur les connaissances du modèle. ReAct permet à l'agent de :
1. **Raisonner** sur ce qu'il doit faire (Thought)
2. **Décider** d'utiliser un outil ou de répondre directement (Action)
3. **Observer** le résultat de l'outil (Observation)
4. **Itérer** jusqu'à avoir suffisamment d'information

Sans ReAct, ARIA ne pourrait pas appeler les outils (génération de plan, recherche RAG, recherche web) de manière contextuelle et dynamique.

**Implémentation concrète :** L'agent dispose de 7 outils (generate_training_plan, evaluate_profile, recommend_formations, explain_talent_path, summarize_evaluations, search_knowledge, search_web) et choisit dynamiquement lequel appeler selon la question de l'utilisateur.

## 7.5 Retrieval-Augmented Generation (RAG)

### 7.5.1 Architecture RAG implémentée

```
Question utilisateur
        ↓
Embeddings (nomic-embed-text via Ollama)
        ↓
Recherche par similarité cosinus dans ChromaDB
        ↓
K=6 chunks les plus pertinents (seuil distance ≤ 0.60)
        ↓
Injection dans le prompt LLM
        ↓
Réponse ancrée dans les documents ESPRIT
```

### 7.5.2 Paramètres RAG choisis

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Taille des chunks | 400 mots | Suffisant pour contenir une idée complète sans dépasser le contexte LLM |
| Overlap | 50 mots | Évite de tronquer une idée à la frontière de deux chunks |
| K (top résultats) | 6 | Equilibre richesse du contexte et longueur du prompt |
| Seuil distance | 0.60 | Filtrage des chunks trop éloignés sémantiquement |

### 7.5.3 Modèle d'embedding — nomic-embed-text

`nomic-embed-text` est un modèle d'embedding open-source, multilingue, disponible via Ollama. Il produit des vecteurs de dimension 768, compatibles avec ChromaDB.

**Pourquoi pas OpenAI Embeddings ?** Même argument que pour le LLM : confidentialité des données et coûts récurrents.

## 7.6 Base vectorielle — ChromaDB

| Critère | ChromaDB | Pinecone | Weaviate | Qdrant |
|---------|----------|----------|----------|--------|
| **Déploiement** | Local (aucun serveur) | Cloud uniquement | Docker requis | Docker requis |
| **Coût** | Gratuit | Freemium limité | Freemium | Gratuit |
| **Python-native** | ✅ | ✅ | ✅ | ✅ |
| **Persistance locale** | ✅ PersistentClient | ❌ | Partielle | ✅ |
| **Maturité** | Bonne | Très bonne | Bonne | Bonne |

ChromaDB avec `PersistentClient` stocke les vecteurs sur disque et les recharge au redémarrage. C'est la solution la plus simple et la plus adaptée à un déploiement local sans infrastructure additionnelle.

## 7.7 Moteur de matching ML — Architecture hybride à 3 couches

Le ML Engine (SCRIPT_PYTHON_ML/skills_engine.py) implémente une architecture à 3 couches avec dégradation gracieuse :

**Couche 1 — Dictionnaire de compétences :**
Un dictionnaire de ~500 compétences classées en 17 catégories (Langages de programmation, Web Frontend, Backend, Bases de données, IA/ML, Génie Civil, etc.). La correspondance exacte et floue (RapidFuzz, similarité ≥ 88%) identifie les compétences dans le texte brut.

*Pourquoi un dictionnaire ?* La reconnaissance de compétences pédagogiques est un problème de classification, pas de génération. Un dictionnaire curé est plus fiable qu'un LLM pour cette tâche spécifique.

**Couche 2 — TF-IDF + Similarité cosinus :**
Vectorisation du texte complet du CV et de l'offre, calcul de la similarité dans l'espace vectoriel TF-IDF. Capture les compétences non présentes dans le dictionnaire.

**Couche 3 — Sentence-BERT (paraphrase-multilingual-MiniLM-L12-v2) :**
Embeddings sémantiques bilingues (FR/EN). Capture les compétences exprimées différemment ("développement logiciel" ≈ "software engineering").

**Score final :** Moyenne pondérée des trois couches, normalisée sur 100.

## 7.8 Framework frontend — React.js 18 + Vite

**Pourquoi React plutôt que Vue.js ou Angular ?**

| Critère | React 18 | Vue.js 3 | Angular 17 |
|---------|----------|----------|------------|
| **Écosystème** | Le plus riche | Bon | Bon |
| **Popularité** | #1 mondial | #2 | #3 |
| **Courbe d'apprentissage** | Modérée | Faible | Élevée |
| **Typage** | TypeScript optionnel | TypeScript optionnel | TypeScript requis |
| **React Router** | ✅ Mature | Vue Router | @angular/router |
| **Communauté** | Massive | Grande | Grande |

La complexité de l'interface (9 rôles distincts, dashboards dynamiques, chat temps réel, uploads, WebSocket) justifie React pour sa richesse écosystémique et la maturité de React Router v6 pour la gestion des routes protégées par rôle.

**Pourquoi Vite plutôt que Create React App ?**

Vite offre des performances de build 10 à 100× supérieures à CRA grâce au natif ES Modules et à la transpilation par esbuild. Un `npm run build` se fait en moins de 300ms, ce qui a significativement amélioré ma productivité.

**Pourquoi Tailwind CSS plutôt que Bootstrap ou Material UI ?**

Tailwind est une bibliothèque CSS utilitaire (utility-first) qui génère uniquement les classes utilisées — le bundle CSS final est très léger (30KB). Contrairement à Bootstrap qui impose un design figé, Tailwind permet de créer une interface fidèle à la charte graphique ESPRIT (rouge #E30613, noir #1A1A1A) sans surcharge de CSS personnalisé.

## 7.9 Authentification — JWT

JWT (JSON Web Tokens) a été choisi pour l'authentification. Le token est généré à la connexion (POST /auth/login), signé avec un secret HMAC-SHA256, et inclus dans le header Authorization de chaque requête API.

**Avantages du JWT dans notre contexte :**
- **Stateless** : Le backend ne stocke pas de sessions — parfait pour une architecture microservices
- **Contenu riche** : Le token encode l'identifiant et le rôle de l'utilisateur — le middleware peut prendre des décisions sans requête BDD supplémentaire
- **Interopérable** : Le même token authentifie le backend, le WebSocket chat et les appels vers les microservices

**Durée de validité :** 24 heures. Ce choix est un compromis entre sécurité (courte durée) et expérience utilisateur (ne pas forcer la reconnexion toutes les heures).

## 7.10 Communication temps réel — WebSocket

Le chat interne utilise WebSocket plutôt que HTTP polling pour plusieurs raisons :

**HTTP Polling :**
- Le client interroge le serveur toutes les X secondes
- Latence = intervalle de polling (2-5 secondes)
- Charge serveur élevée même sans nouveaux messages

**WebSocket :**
- Connexion persistante bidirectionnelle
- Latence quasi nulle (<100ms)
- Le serveur pousse les messages au client instantanément
- Charge serveur proportionnelle aux messages réels

Pour un chat professionnel, la latence de 2-5 secondes du polling est inacceptable. WebSocket est le choix évident.

**Implémentation :** Le token JWT est passé dans l'URL de la WebSocket (`ws://localhost:8002/chat/ws/{token}`) car les WebSockets ne supportent pas les headers personnalisés. Le backend valide le token avant d'accepter la connexion.

## 7.11 Génération PDF — ReportLab

Pour les rapports de profil et les plans de formation, j'ai choisi **ReportLab** (bibliothèque Python) plutôt que des alternatives frontend (jsPDF, html2canvas) pour plusieurs raisons :
- **Rendu serveur** : Le PDF est généré côté backend — aucune dépendance au navigateur
- **Qualité professionnelle** : Contrôle pixel par pixel du layout
- **Charte graphique ESPRIT** : Application précise des couleurs et typographies
- **Sécurité** : Le PDF généré est contrôlé par le serveur, pas par le client

---

---

# CHAPITRE 8 — CONCEPTION ET MODÉLISATION

## 8.1 Modèle de données (UML — Diagramme entité-relation)

### 8.1.1 Tables principales

**Table `users` (acteur central)**
```
users
├── id (PK)
├── email (UNIQUE, index)
├── hashed_password
├── nom, prenom
├── role (Enum: 9 valeurs)
├── departement
├── competences (JSON — liste extraite du CV)
├── score_global (Float — recalculé à chaque évaluation)
├── is_talent (Boolean)
├── date_talent (Date — settée lors de l'attribution)
└── cv_path, photo_path
```

**Table `candidatures`** (lien candidat ↔ offre)
```
candidatures
├── id (PK)
├── candidat_id (FK → users)
├── offre_id (FK → offres)
├── score_ml (Float — calculé par ML Engine)
├── statut (Enum: soumise | en_cours | entretien | acceptee | refusee)
├── commentaire_rp
└── UNIQUE(candidat_id, offre_id) — empêche la double candidature
```

**Table `formations_proposees`** (workflow ARIA → RDFF)
```
formations_proposees
├── id (PK)
├── proposeur_id (FK → users)
├── titre, plan_text, objectif, duree_semaines, niveau
├── statut (Enum: en_attente | acceptee | refusee)
├── commentaire_rdff
└── formation_id (FK → formations — si acceptée)
```

### 8.1.2 Relations

```
users ─────1:N──── candidatures ────N:1──── offres
users ─────1:N──── evaluations
users ─────1:N──── inscriptions ────N:1──── formations
users ─────1:N──── messages (sender)
users ─────1:N──── messages (receiver)
users ─────1:N──── notifications
users ─────1:N──── formations_proposees
formations ──1:N── inscriptions
```

## 8.2 Architecture des rôles

Le système implémente un **RBAC (Role-Based Access Control)** à 9 niveaux avec héritage implicite :

```
candidat
  └── hérite enseignant (si candidature acceptée)
      ├── rp_coord (RP + fonctions enseignant)
      ├── rp_chef  (Chef Dept + fonctions enseignant)
      ├── talent   (enseignant + statut spécial)
      ├── rdff
      ├── chef_admin
      ├── direction_etudes
      └── direction
```

L'héritage RP → Enseignant est une décision architecturale justifiée par la réalité métier : un RP est un enseignant qui a des responsabilités de gestion supplémentaires. Il peut donc s'inscrire aux formations, demander le statut Talent et utiliser ARIA.

## 8.3 Diagramme de séquence — Candidature avec scoring ML

```
Candidat → Frontend: clique "Postuler"
Frontend → Backend (8002): POST /candidatures {offre_id, lettre}
Backend → ML Engine (8000): POST /match {cv_text, offre_skills}
ML Engine → Backend: {score_global: 78.5, matched_skills: [...]}
Backend → BDD: INSERT candidature (score_ml=78.5)
Backend → Candidat: 201 Created {candidature}
```

## 8.4 Diagramme de séquence — Génération plan ARIA

```
Enseignant → Frontend: soumet formulaire "Mode Plan"
Frontend → Backend (8002): POST /aria/plan {objectif, competences, duree, niveau}
Backend → ARIA (8001): POST /plan {user_id, objectif, ...}
ARIA → ChromaDB: recherche k=6 chunks pertinents
ChromaDB → ARIA: [chunk1, chunk2, ..., chunk6]
ARIA → Ollama (GPU): prompt = AGENT_ROLE + contexte RAG + question
Ollama → ARIA: réponse JSON {action: final_answer, answer: "..."}
ARIA → _clean_json_envelope(): extraction du texte pur
ARIA → Backend: {plan: "## Semaine 1..."}
Backend → Frontend: {plan: "..."}
Frontend: affiche plan + boutons PDF + Soumettre RDFF
```

---

---

# CHAPITRE 9 — IMPLÉMENTATION PAR MODULE

## 9.1 Module Agent IA ARIA

### 9.1.1 Structure des fichiers ARIA

```
esprit-aria/
├── config.py (184 lignes) — configuration centrale + AGENT_ROLE
├── rag_engine.py (752 lignes) — RAG : chargement, chunking, indexation, recherche
├── memory.py (568 lignes) — mémoire CT (20 msgs) + LT (ChromaDB per-user)
├── tools.py (650+ lignes) — 7 outils de l'agent ReAct
├── agent_ia.py (759 lignes) — orchestrateur ReAct + API FastAPI
└── pdf_generator.py (280 lignes) — génération PDF ReportLab
```

### 9.1.2 Anti-hallucination — Problème central et solution

Le problème d'hallucination des LLM est documenté dans la littérature depuis 2021. Sans garde-fous, un LLM peut inventer des formations, des règlements ou des noms qui n'existent pas dans ESPRIT.

**Solution multi-couches implémentée :**

1. **AGENT_ROLE renforcé** : Instructions explicites avec hiérarchie des sources (RAG > Mémoire > Connaissances générales), interdictions absolues numérotées, phrase modèle imposée pour l'incertitude.

2. **RAG avec seuil strict** : Seuls les chunks à distance cosinus ≤ 0.60 sont injectés. Au-delà de ce seuil, le chunk est écarté même si c'est le meilleur disponible.

3. **Outil `search_knowledge` dédié** : Quand ARIA doit répondre sur des faits ESPRIT, elle utilise cet outil qui force un passage par le RAG plutôt que par les connaissances du modèle.

4. **Séparation `search_knowledge` / `search_web`** : ARIA sait clairement quand chercher dans la base ESPRIT versus quand chercher sur Internet.

### 9.1.3 Résolution du bug JSON — Problème technique critique

Lors des tests initiaux, les réponses de ARIA contenaient l'enveloppe JSON visible dans l'interface :

```
"answer": "Voici les formations disponibles :
* Formation 1
..."
```

**Cause racine identifiée :** Le LLM génère du JSON avec des sauts de ligne LITTÉRAUX (caractère \n) dans les chaînes de caractères. Or, le standard JSON interdit les sauts de ligne non échappés dans les strings. `json.loads()` échoue silencieusement, et le parser retourne le texte brut incluant l'enveloppe JSON.

**Solution :** Implémentation de `_fix_json_newlines()`, une fonction de préprocessing caractère par caractère qui échappe les `\n` littéraux uniquement à l'intérieur des strings JSON, sans toucher à la structure. Cette fonction est appliquée avant chaque `json.loads()`.

```python
def _fix_json_newlines(text: str) -> str:
    # Parcours char par char
    # Si in_string == True et char == '\n' → remplacer par '\\n'
    # Gère les séquences d'échappement existantes
```

## 9.2 Module Backend principal (esprit-talents)

### 9.2.1 Structure des couches

```
backend/
├── core/
│   ├── config.py     — Settings Pydantic (BaseSettings)
│   ├── database.py   — Engine SQLAlchemy + get_db()
│   ├── security.py   — JWT + bcrypt
│   └── dependencies.py — get_current_user + require_role()
├── models/           — SQLAlchemy ORM (9 tables)
├── schemas/          — Pydantic I/O validation
├── api/              — 11 routers FastAPI (60 endpoints)
└── services/         — Clients HTTP vers ARIA et ML Engine
```

### 9.2.2 Le middleware d'autorisation

La sécurité par rôle est implémentée via une fabrique de dépendances FastAPI :

```python
def require_role(roles: List[str]):
    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(403, detail="Accès réservé aux rôles : ...")
        return current_user
    return _guard

# Usage :
@router.post("/formations")
def create_formation(
    body: FormationCreate,
    current_user: User = Depends(require_role(["rdff", "chef_admin"])),
):
```

Cette approche garantit que chaque endpoint est protégé par le rôle approprié, directement dans la signature de la fonction.

### 9.2.3 Gestion du WebSocket Chat

Le gestionnaire de connexions WebSocket utilise un dictionnaire Python en mémoire :

```python
class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}
        # user_id → ensemble de WebSockets (multi-onglets)
```

L'identification se fait par token JWT passé dans l'URL. Le room_id est calculé de façon canonique `dm_{min(a,b)}_{max(a,b)}` pour garantir qu'une conversation A↔B est toujours la même room quel que soit le sens de l'appel.

**Fix IDOR (Insecure Direct Object Reference) :** L'endpoint `GET /chat/history/{other_user_id}` a été renforcé pour vérifier que l'utilisateur demandeur fait partie du room demandé. Le token JWT identifie `current_user.id`, et le room_id est calculé depuis `current_user.id + other_user_id` — un tiers ne peut jamais lire une conversation qui ne le concerne pas.

## 9.3 Module ML Engine

Le ML Engine expose 7 endpoints FastAPI sur le port 8000. Les trois principaux sont :

**`POST /extract/pdf`** — Extrait les compétences d'un CV PDF via les 3 couches ML

**`POST /match`** — Score de compatibilité candidat/offre (0-100)

**`POST /rank`** — Classement de N candidats pour une offre (utilisé par les RP)

Le moteur supporte la dégradation gracieuse : si `sentence-transformers` n'est pas disponible, il utilise TF-IDF seul. Si `sklearn` n'est pas disponible, il utilise le dictionnaire seul. Le système fonctionne donc même dans un environnement dégradé.

## 9.4 Module Frontend React.js

### 9.4.1 Architecture des contextes

Deux contextes React globaux gèrent l'état applicatif :

**`AuthContext`** : Token JWT (localStorage), profil utilisateur, rôle. Le token est lu au chargement de l'application via `GET /auth/me`.

**Limitation connue et documentée :** Le stockage du JWT en localStorage est vulnérable aux attaques XSS. En production, la migration vers des cookies HttpOnly est recommandée. Ce choix a été fait pour simplifier la gestion du WebSocket (qui nécessite le token dans l'URL).

### 9.4.2 Routing protégé par rôle

```jsx
function PrivateRoute({ children, roles }) {
    const { user, loading } = useAuth()
    if (!user) return <Navigate to="/login" />
    if (roles && !roles.includes(user.role)) return <Navigate to="/" />
    return children
}
```

Ce composant intercepte chaque route protégée et redirige vers `/login` si non authentifié, ou vers `/` si le rôle est insuffisant.

### 9.4.3 Aide personnalisée par rôle

Chaque rôle dispose d'une aide complète et spécifique générée depuis un dictionnaire de données statiques. L'aide présente :
- La description du rôle dans la plateforme
- La liste exhaustive des fonctionnalités (avec guides étape par étape)
- Les restrictions (ce que l'utilisateur ne peut pas faire et pourquoi)
- Des scénarios concrets d'usage
- Des raccourcis clavier et conseils pratiques

Cette aide contextuelle réduit significativement la courbe d'apprentissage et le besoin de support.

---

---

# CHAPITRE 10 — TESTS ET VALIDATION

## 10.1 Tests manuels réalisés

En l'absence d'une suite de tests automatisés formelle (contrainte de temps d'un stage individuel), j'ai procédé à des tests manuels systématiques organisés par flux métier.

### 10.1.1 Tests fonctionnels par flux

| Flux | Testé | Résultat |
|------|-------|---------|
| Inscription candidat + upload CV → extraction ML | ✅ | Compétences extraites correctement |
| Candidature → calcul score ML → notification | ✅ | Score 72-88% selon profil |
| RP accepte candidature → candidat devient enseignant | ✅ | Rôle mis à jour, notification envoyée |
| Enseignant demande Talent → RH notifié → DG valide | ✅ | Workflow complet |
| ARIA répond sans JSON visible | ✅ | Après correction _fix_json_newlines |
| RAG retourne des formations réelles ESPRIT | ✅ | 22 chunks indexés |
| ARIA génère un plan de formation téléchargeable en PDF | ✅ | PDF généré et téléchargé |
| Enseignant soumet plan → RDFF reçoit → valide | ✅ | Formation créée dans catalogue |
| Chat WebSocket temps réel (2 onglets) | ✅ | Messages échangés <100ms |
| Notifications en temps réel | ✅ | Polling 30s |
| Export rapport PDF profil enseignant | ✅ | PDF avec statistiques |

### 10.1.2 Tests des endpoints API (via Swagger /docs)

Chaque endpoint a été testé via l'interface Swagger auto-générée par FastAPI :
- Cas nominaux (données valides → réponse 2xx)
- Cas d'erreur (données manquantes → 422, token invalide → 401, rôle insuffisant → 403)
- Cas limites (fichier non-PDF → 400, offre fermée → 400)

### 10.1.3 Tests de l'agent ARIA en CLI

Les tests de l'agent ARIA ont été réalisés via l'interface CLI (python agent_ia.py) sur les requêtes suivantes :

```
"Quelles formations sont disponibles à ESPRIT ?"
→ Résultat : Liste des 5 formations sans noms de fichiers ✅

"Parle-moi de la formation Python Avancé"
→ Résultat : Description précise sans invention ✅

"Quelles sont les conditions pour devenir Talent ?"
→ Résultat : Basé sur le règlement indexé ✅

"Génère-moi un plan de formation en IA sur 8 semaines"
→ Résultat : Plan structuré en 8 sections, 82s de traitement ✅

"Quelles sont les tendances en pédagogie active en 2025 ?"
→ Résultat : Recherche web activée, résultats Internet présentés ✅
```

## 10.2 Tests de sécurité

### 10.2.1 Tests des contrôles d'accès

J'ai vérifié que chaque endpoint retourne bien le code HTTP approprié :
- Un candidat ne peut pas appeler `POST /offres` → 403 ✅
- Un enseignant ne peut pas accéder aux stats d'un autre enseignant → 403 ✅ (corrigé)
- Un chat history appartient à ses deux participants uniquement → 404 si tiers ✅ (corrigé)

### 10.2.2 Tests de validation des entrées

FastAPI + Pydantic valident automatiquement les entrées. Les tests ont confirmé :
- Email invalide → 422 Unprocessable Entity
- Mot de passe trop court → 422
- Fichier non-PDF upload → 400 Bad Request

---

---

# CHAPITRE 11 — DIFFICULTÉS RENCONTRÉES ET SOLUTIONS APPORTÉES

## 11.1 Difficulté #1 — Hallucinations persistantes du LLM

**Description :** Malgré un prompt système strict, Llama 3.1 8B inventait parfois des formations inexistantes (ex: "Développement Web avec React" qui n'est pas dans le catalogue ESPRIT).

**Analyse :** Les LLM ont une tendance inhérente à compléter les patterns. Si l'utilisateur demande "listez toutes les formations", le modèle comble les trous avec ses connaissances générales.

**Solution multi-niveaux :**
1. Renforcement du AGENT_ROLE avec interdictions explicites et numérotées
2. Règle : "Si on te demande de lister les formations, liste TOUTES celles du contexte et SEULEMENT celles-là"
3. Augmentation de K (chunks RAG) de 4 à 6 pour fournir plus de contexte
4. Ajout de la phrase modèle obligatoire en cas d'incertitude
5. Distinction claire outils `search_knowledge` vs `search_web` dans les descriptions d'outils

**Résultat :** Les réponses sont maintenant ancrées dans les documents indexés. Testé sur 15 requêtes différentes sans hallucination détectée.

## 11.2 Difficulté #2 — JSON visible dans les réponses ARIA

**Description :** L'enveloppe JSON générée par le LLM (`{"action": "final_answer", "answer": "..."}`) apparaissait dans le texte affiché à l'utilisateur.

**Analyse :** Le LLM génère du JSON avec des sauts de ligne LITTÉRAUX dans les strings. `json.loads()` échoue sur ce JSON invalide et le parser retourne le texte brut non traité.

**Solution :** Implémentation de `_fix_json_newlines()` qui prétraite le JSON avant parsing en échappant les `\n` littéraux dans les strings. Combinée avec `_clean_json_envelope()`, cette correction élimine 100% des cas de JSON visible dans les tests.

## 11.3 Difficulté #3 — Performance sur hardware limité

**Description :** Le RTX 4060 8GB est un GPU gaming, pas un GPU ML. Générer une réponse ARIA prend entre 15 et 180 secondes selon la complexité.

**Analyse :** Llama 3.1 8B quantifié en Q4_K_M occupe ~4.5GB de VRAM. La RTX 4060 peut le charger entièrement mais le débit de traitement reste limité.

**Solutions :**
1. Utilisation de la quantification Q4_K_M (compromis vitesse/qualité optimal)
2. Pas de fine-tuning (aurait saturé la VRAM)
3. Architecture async : les appels ARIA n'bloquent pas les autres endpoints
4. Indicateur de chargement animé côté frontend pour gérer les attentes utilisateur
5. Cache des agents (un agent par user_id en mémoire, pas de réinstanciation)

## 11.4 Difficulté #4 — Race condition sur les codes ARIA

**Description :** Si deux RDFF valident simultanément deux propositions, le même code ARIA001 pourrait être assigné à deux formations différentes, provoquant un `IntegrityError`.

**Analyse :** La génération du code était basée sur `count() + 1`, qui n'est pas atomique en contexte concurrent.

**Solution :** Utilisation de `with_for_update()` SQLAlchemy pour verrouiller la ligne pendant la transaction, combinée avec une recherche du dernier code ARIA existant plutôt qu'un simple comptage.

## 11.5 Difficulté #5 — Travail en solo sur un projet d'équipe

**Description :** Ce projet représente typiquement le travail de 3 à 4 développeurs (backend senior, frontend, data scientist, DevOps). Travailler seul implique des compromis.

**Stratégie adoptée :**
- Priorisation rigoureuse (MoSCoW) — le MVP fonctionnel avant les fonctionnalités avancées
- Architecture modulaire — chaque module développé et testé indépendamment
- Réutilisation maximale — SCRIPT_PYTHON_ML était un module existant intégré plutôt que redéveloppé
- Documentation au fil du développement — notes techniques maintenues en continu
- Itérations courtes — livrable fonctionnel à chaque fin de sprint

## 11.6 Difficulté #6 — Gestion des compatibilités entre versions

**Description :** `passlib` 1.7.4 n'est pas compatible avec `bcrypt` 5.0.0 (changement d'API interne).

**Symptôme :** `AttributeError: module 'bcrypt' has no attribute '__about__'` au démarrage.

**Solution :** Pin de la version bcrypt à `4.0.1` dans `requirements.txt`, dernière version compatible avec passlib 1.7.4.

**Leçon apprise :** Toujours pinner les versions dans requirements.txt et tester les montées de version dans un environnement isolé.

---

---

# CHAPITRE 12 — RÉSULTATS ET BILAN

## 12.1 Indicateurs quantitatifs

### Code produit

| Composant | Fichiers | Lignes de code |
|-----------|---------|----------------|
| ARIA (esprit-aria) | 7 fichiers Python | ~3 500 lignes |
| Backend (esprit-talents) | 25 fichiers Python | ~3 200 lignes |
| Frontend (React) | 27 fichiers JSX | ~5 000 lignes |
| **Total** | **59 fichiers** | **~11 700 lignes** |

### Fonctionnalités livrées

- **9 rôles** distincts avec dashboards dédiés
- **60 endpoints** REST documentés (Swagger auto-généré)
- **7 outils** agent ARIA (génération plan, matching RAG, recherche web, etc.)
- **22 chunks** RAG indexés (formations, règlement, FAQ, offres ESPRIT)
- **3 services** microservices interconnectés (ML:8000, ARIA:8001, Backend:8002)
- **4 types de PDF** générables (plans ARIA, rapports profil)
- **11 tables** en base de données

## 12.2 Évaluation qualitative

### Ce qui fonctionne remarquablement bien

**L'agent ARIA** est le point fort du projet. Lors des tests, il a démontré sa capacité à :
- Répondre en français sur le règlement ESPRIT sans hallucination
- Générer des plans de formation structurés en 8 sections
- Utiliser automatiquement la recherche web pour les questions sur les tendances 2025-2026
- Mémoriser le contexte de l'utilisateur d'une session à l'autre

**Le matching ML** produit des scores cohérents. Testé avec des CV de profils Informatique sur des offres Génie Civil, le score est correctement bas (15-25%). Testé avec des profils concordants, le score monte à 70-90%.

**Le workflow de recrutement** est complet et traçable : de la candidature à l'intégration comme enseignant, chaque étape est documentée, notifiée et réversible.

### Limites identifiées

**Performance ARIA :** 15 à 80 secondes par requête est acceptable pour un PFE mais insuffisant pour un déploiement en production à grande échelle. Une migration vers des GPUs A100/H100 ou une API cloud résoudrait ce point.

**Tests automatisés :** L'absence de tests pytest/vitest est une lacune que je reconnais. Elle était justifiée par les contraintes de temps d'un stage solo mais devrait être comblée avant tout déploiement production.

**SQLite :** La base de données de développement ne supporte pas bien les écritures concurrentes massives. Une migration vers PostgreSQL est prévue pour la production.

---

---

# CHAPITRE 13 — PERSPECTIVES ET AMÉLIORATIONS FUTURES

## 13.1 Court terme (0-3 mois)

**Dockerisation :** Créer un `docker-compose.yml` orchestrant les 4 services (ML, ARIA, Backend, Frontend) pour simplifier le déploiement.

```yaml
services:
  aria:       { build: ./esprit-aria, ports: ["8001:8001"] }
  ml-engine:  { build: ./SCRIPT_PYTHON_ML, ports: ["8000:8000"] }
  backend:    { build: ./esprit-talents/backend, ports: ["8002:8002"] }
  frontend:   { build: ./esprit-talents/frontend, ports: ["80:80"] }
```

**Tests automatisés :** Implémenter une suite pytest pour les flux critiques (login, candidature, workflow Talent) et Vitest pour les composants React clés.

**Migration PostgreSQL :** Remplacer SQLite par PostgreSQL en production. Avec SQLAlchemy, le changement se limite à l'URL de connexion dans `.env`.

## 13.2 Moyen terme (3-6 mois)

**Activation du mode WAL SQLite / Migration PostgreSQL :** Pour supporter 50+ utilisateurs simultanés.

**Refactoring ARIA vers l'async :** Remplacer `requests.post()` par `httpx.AsyncClient()` pour les appels Ollama, libérant l'event loop FastAPI pendant la génération.

**Fine-tuning partiel (LoRA)** : Avec un dataset suffisant d'évaluations ESPRIT, un fine-tuning LoRA sur Llama 3.1 8B permettrait d'améliorer la précision des réponses pédagogiques sans changer d'infrastructure.

**Reconnaissance vocale :** Intégrer Whisper (OpenAI) pour une interface ARIA vocale, notamment utile sur mobile.

## 13.3 Long terme (6-12 mois)

**Multi-tenancy :** La plateforme est conçue pour ESPRIT mais son architecture est générique. Changer d'institution nécessite uniquement de réindexer ChromaDB avec les documents de la nouvelle institution. Ce modèle "white-label" ouvre des perspectives commerciales.

**Analytique avancée :** Tableau de bord Direction Générale avec graphiques d'évolution des compétences, tendances de recrutement, corrélation formation/évaluation.

**Application mobile :** L'API REST existante est compatible avec une application mobile React Native ou Flutter sans modification backend.

---

---

# CHAPITRE 14 — CONCLUSION GÉNÉRALE

## 14.1 Bilan personnel

Ce stage de fin d'études a représenté pour moi une expérience formatrice à tous les niveaux. Concevoir et développer seul un système de cette envergure — intégrant un backend REST, un frontend réactif, un moteur ML et un agent IA — m'a contraint à m'approprier chaque couche technologique avec une profondeur que le travail en équipe n'aurait peut-être pas permis.

Les défis ont été nombreux : les hallucinations du LLM, les incompatibilités de versions, les erreurs JSON subtiles, les questions de sécurité et de concurrence. Chacun de ces obstacles m'a obligé à creuser dans la documentation, la littérature et les issues GitHub pour trouver des solutions robustes plutôt qu'empiriques.

Le projet m'a également appris la valeur de l'architecture réfléchie. Des décisions prises en début de projet — comme la séparation en microservices, le choix du RAG plutôt que du fine-tuning, ou l'utilisation de Llama 3.1 8B local — ont prouvé leur pertinence tout au long du développement. Une architecture bien conçue absorbe les changements de spécification sans déstabiliser l'ensemble.

## 14.2 Contribution apportée à ESPRIT

La plateforme ESPRIT Talents, dans son état actuel, constitue un premier pas concret vers la digitalisation de la gestion des ressources humaines pédagogiques de l'institution. Elle démontre qu'il est possible, avec des ressources matérielles accessibles (un GPU gaming, un serveur local) et des technologies open-source, de construire un système intelligent compétitif avec des solutions propriétaires coûteuses.

L'intégration d'un agent IA pédagogique local — respectueux de la confidentialité des données et adapté aux contraintes matérielles — est une contribution technique innovante qui positionne ESPRIT dans l'avant-garde de l'usage de l'IA dans l'enseignement supérieur tunisien.

## 14.3 Compétences acquises

Ce stage m'a permis de maîtriser ou d'approfondir :
- L'architecture microservices et les APIs REST async (FastAPI)
- Les grands modèles de langage et leur déploiement local (Ollama, Llama)
- Le RAG et les bases vectorielles (ChromaDB, nomic-embed-text)
- Les agents IA avec le pattern ReAct et la gestion des outils
- Le développement frontend moderne (React 18, Vite, Tailwind, WebSocket)
- L'apprentissage automatique appliqué au matching de compétences (TF-IDF, Sentence-BERT)
- La sécurité des APIs (JWT, RBAC, validation des entrées, IDOR)
- La gestion de projet solo avec méthodologie agile adaptée

---

---

# RÉFÉRENCES BIBLIOGRAPHIQUES

1. **Yao, S. et al.** (2022). *ReAct: Synergizing Reasoning and Acting in Language Models*. arXiv:2210.03629.

2. **Lewis, P. et al.** (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. arXiv:2005.11401. NeurIPS 2020.

3. **Meta AI** (2024). *Llama 3.1 Technical Report*. https://ai.meta.com/llama/

4. **Reimers, N. & Gurevych, I.** (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*. EMNLP 2019.

5. **FastAPI Documentation** (2024). https://fastapi.tiangolo.com/

6. **ChromaDB Documentation** (2024). https://docs.trychroma.com/

7. **Ollama Documentation** (2024). https://ollama.ai/

8. **React Documentation** (2024). https://react.dev/

9. **OWASP Top 10** (2021). *Web Application Security Risks*. https://owasp.org/Top10/

10. **Vaswani, A. et al.** (2017). *Attention Is All You Need*. NeurIPS 2017.

11. **Robertson, S. & Zaragoza, H.** (2009). *The Probabilistic Relevance Framework: BM25 and Beyond*. Foundations and Trends in Information Retrieval.

12. **Schwaber, K. & Sutherland, J.** (2020). *The Scrum Guide*. https://scrumguides.org/

---

---

# ANNEXES

## Annexe A — Stack technique complète

| Composant | Technologie | Version |
|-----------|------------|---------|
| LLM | Llama 3.1 8B (via Ollama) | 3.1 |
| Embeddings | nomic-embed-text | 1.5 |
| Agent pattern | ReAct (implémentation custom) | — |
| Vectorstore | ChromaDB PersistentClient | 0.4+ |
| Backend ARIA | FastAPI + uvicorn | 0.111+ |
| Backend principal | FastAPI + uvicorn | 0.111+ |
| ORM | SQLAlchemy | 2.0+ |
| Base de données | SQLite | 3.x |
| Auth | python-jose + passlib/bcrypt | — |
| Frontend | React 18 + Vite 8 | 18 / 8 |
| CSS | Tailwind CSS v4 | 4 |
| Routing | React Router v6 | 6 |
| HTTP client | Axios | 1.x |
| PDF | ReportLab (backend) | 4.0+ |
| ML Layer 1 | Dictionnaire + RapidFuzz | — |
| ML Layer 2 | scikit-learn TF-IDF | 1.x |
| ML Layer 3 | Sentence-BERT | 2.x |
| Web search | DDGS (DuckDuckGo) | — |
| Notifications | Polling 30s + WebSocket | — |
| Hardware GPU | RTX 4060 8GB VRAM | — |
| Hardware CPU | Intel i7-13620H | — |
| RAM | 32 GB DDR5 | — |
| OS | Windows 11 Pro | 11 |

## Annexe B — Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Candidat | candidat1@esprit.tn | cand123 |
| Candidat | candidat2@esprit.tn | cand123 |
| Enseignant (Talent) | enseignant1@esprit.tn | ens123 |
| Enseignant | enseignant2@esprit.tn | ens123 |
| RP Coordinateur | rp.coord@esprit.tn | rpcoord123 |
| Chef Département | rp.chef@esprit.tn | rpchef123 |
| RDFF | rdff@esprit.tn | rdff123 |
| Admin / RH | admin@esprit.tn | admin123 |
| Direction des Études | dir.etudes@esprit.tn | diret123 |
| Direction Générale | direction@esprit.tn | dir123 |

## Annexe C — Commandes de démarrage

```powershell
# Terminal 1 — Ollama (prérequis)
ollama serve

# Terminal 2 — ML Engine (port 8000)
cd SCRIPT_PYTHON_ML
.\env\Scripts\Activate.ps1
uvicorn skills_engine:app --port 8000

# Terminal 3 — Agent ARIA (port 8001)
cd esprit-aria
.\env\Scripts\Activate.ps1
uvicorn agent_ia:app --port 8001

# Terminal 4 — Backend principal (port 8002)
cd esprit-talents\backend
.\venv\Scripts\Activate.ps1
python seed.py  # première fois uniquement
uvicorn main:app --port 8002 --reload

# Terminal 5 — Frontend (port 5173)
cd esprit-talents\frontend
npm run dev
```

Ou via le script batch fourni :
```
Double-clic sur : Stage\start_all.bat
```

## Annexe D — Métriques de l'agent ARIA (tests du 11 mai 2026)

| Requête | Temps de réponse | Outil utilisé | Hallucination |
|---------|-----------------|---------------|---------------|
| "Quelles formations sont disponibles ?" | 27.4s | Aucun (RAG direct) | Aucune |
| "Parle-moi de Python Avancé" | 22.4s | Aucun (RAG direct) | Aucune |
| "Conditions pour devenir Talent ?" | 13.5s | Aucun (RAG direct) | Aucune |
| "Génère un plan IA sur 8 semaines" | 81.9s | generate_training_plan | Aucune |
| "Tendances pédagogie 2025 ?" | 45s | search_web | N/A (web) |

## Annexe E — Glossaire

**RAG (Retrieval-Augmented Generation)** : Technique combinant la recherche de documents pertinents dans une base vectorielle avec la génération de texte par un LLM. Permet d'ancrer les réponses dans des données spécifiques sans fine-tuning.

**LLM (Large Language Model)** : Modèle de langage de grande taille, entraîné sur des corpus massifs, capable de comprendre et générer du texte en langage naturel.

**ReAct** : Pattern d'architecture pour les agents IA combinant Raisonnement (Reasoning) et Actions (Acting) en boucle itérative.

**Embedding** : Représentation vectorielle dense d'un texte dans un espace de haute dimension, capturant la sémantique. Deux textes sémantiquement proches auront des vecteurs proches.

**Chunk** : Fragment de document de taille fixe (ici 400 mots avec overlap de 50 mots) utilisé comme unité d'indexation dans le RAG.

**IDOR (Insecure Direct Object Reference)** : Vulnérabilité de sécurité permettant à un utilisateur d'accéder aux ressources d'un autre en devinant son identifiant.

**JWT (JSON Web Token)** : Standard de token sécurisé encodant des informations (identifiant, rôle) et signé cryptographiquement.

**RBAC (Role-Based Access Control)** : Modèle de contrôle d'accès où les permissions sont associées aux rôles plutôt qu'aux individus.

**TF-IDF (Term Frequency-Inverse Document Frequency)** : Mesure statistique évaluant l'importance d'un terme dans un document par rapport à une collection.

**Sentence-BERT** : Variante de BERT optimisée pour produire des embeddings de phrases entières, permettant la comparaison sémantique rapide par similarité cosinus.

---

*Rapport rédigé par Harold AGBEMA — Stage PFE ESPRIT 2026*
*Maître de stage : Mme Syrine Karoui*
*Document confidentiel — Usage académique uniquement*
