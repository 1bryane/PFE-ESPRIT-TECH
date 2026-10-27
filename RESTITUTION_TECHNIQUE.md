# RESTITUTION TECHNIQUE — ESPRIT Talents
## Préparation complète à la soutenance

---

# TABLE DES MATIÈRES

1. [Vue d'ensemble de l'architecture](#1-vue-densemble)
2. [Service 1 — Backend FastAPI (port 8002)](#2-backend-fastapi)
3. [Service 2 — ML Engine (port 8000)](#3-ml-engine)
4. [Service 3 — Agent ARIA (port 8001)](#4-agent-aria)
5. [Service 4 — Frontend React (port 5173)](#5-frontend-react)
6. [Service 5 — Ollama / LLaMA 3.1 (port 11434)](#6-ollama--llama)
7. [Base de données SQLite + SQLAlchemy](#7-base-de-données)
8. [Système d'authentification JWT](#8-jwt--authentification)
9. [WebSocket — Chat temps réel](#9-websocket--chat)
10. [Système de rôles et périmètres](#10-rôles-et-périmètres)
11. [Workflow de promotion Talent](#11-workflow-talent)
12. [RAG — Retrieval-Augmented Generation](#12-rag)
13. [Communication inter-services](#13-communication-inter-services)
14. [Launcher unifié (start_all.ps1)](#14-launcher-unifié)
15. [Questions probables et réponses](#15-questions-probables)

---

# 1. VUE D'ENSEMBLE

## Topologie globale

```
Navigateur (React 18 — port 5173)
        │
        │  HTTP/REST  (JWT Bearer)
        ▼
Backend FastAPI (port 8002)  ◄──────── SQLite (esprit.db)
        │                │
        │ HTTP           │ HTTP
        ▼                ▼
ML Engine           Agent ARIA
(port 8000)         (port 8001)
                         │
                         │ HTTP
                         ▼
                    Ollama / LLaMA 3.1 8B
                    (port 11434)
                         +
                    ChromaDB (vecteurs locaux)
```

## Pourquoi cette architecture micro-services ?

**Raison principale : isolation des charges et des dépendances.**

- Le ML Engine charge des modèles lourds (SBERT ~400 Mo, spaCy ~40 Mo). S'il est dans le backend principal, le démarrage de toute la plateforme est bloqué par ces chargements.
- Ollama + LLaMA 3.1 peut consommer 4–8 Go de RAM et prendre 30–180 s par requête. Isolé sur son propre processus, une requête ARIA lente ne bloque pas les autres utilisateurs.
- Le backend principal peut répondre à des requêtes CRUD en < 50 ms même si ARIA est en train de générer une réponse.
- Chaque service peut être redémarré indépendamment sans affecter les autres.

---

# 2. BACKEND FASTAPI

**Fichier principal :** `esprit-talents/backend/main.py`
**Port :** 8002
**Framework :** FastAPI 0.110+ avec Python 3.11

## 2.1 Structure N-Tier

```
backend/
├── main.py              ← point d'entrée, enregistrement des routers
├── core/
│   ├── config.py        ← variables d'environnement (Settings Pydantic)
│   ├── database.py      ← engine SQLAlchemy, session, init_db()
│   ├── security.py      ← hash bcrypt, JWT encode/decode
│   └── dependencies.py  ← get_current_user(), require_role()
├── models/              ← classes SQLAlchemy (ORM)
├── schemas/             ← classes Pydantic (validation I/O)
└── api/                 ← routers FastAPI (un par domaine)
```

**Pourquoi FastAPI et non Flask ou Django ?**
- FastAPI génère automatiquement la documentation OpenAPI (Swagger UI sur `/docs`), indispensable pour tester sans Postman.
- Support natif `async/await` : les endpoints peuvent être asynchrones (ex. WebSocket, appels HTTP vers ML/ARIA) sans bloquer le serveur.
- Validation automatique des données via Pydantic : si un champ est manquant ou du mauvais type, FastAPI retourne une erreur 422 détaillée sans écrire une seule ligne de code de validation.
- Performance : basé sur Starlette + Uvicorn ASGI, nettement plus rapide que Flask (WSGI synchrone).

## 2.2 Routers enregistrés

| Prefix | Fichier | Rôles accédants |
|--------|---------|-----------------|
| /auth | auth.py | public |
| /users | users.py | tous (authentifié) |
| /offres | offres.py | cup, rp_coord, chef_dept, rp_chef, direction |
| /candidatures | candidatures.py | candidat, cup, rp_coord, chef_dept |
| /evaluations | evaluations.py | cup, chef_dept, direction_etudes, chef_admin |
| /formations | formations.py | tous + rdff pour création |
| /chat | chat.py | tous |
| /aria | aria.py | tous |
| /notifications | notifications.py | tous |
| /formations-proposees | formations_proposees.py | tous |
| /avantages | avantages.py | direction, chef_admin |
| /rapports | rapports.py | tous |
| /recommandations | recommandations.py | cup, chef_dept, direction, chef_admin |
| /plans-carriere | plans_carriere.py | tous |
| /distinctions | distinctions.py | direction, chef_admin |

## 2.3 Lifespan (démarrage)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()   # crée les tables si elles n'existent pas
    yield
```

`init_db()` appelle `Base.metadata.create_all(engine)`. SQLAlchemy compare le schéma existant avec les modèles et crée uniquement les tables manquantes. Il ne supprime pas les données existantes.

**Pourquoi bootstrap_db.py séparé ?**
`bootstrap_db.py` appelle en plus `seed.py` pour peupler la base avec des utilisateurs de test. Il ne s'exécute que si la base est vide ou que le schéma a changé. Cela évite de répéter le seed à chaque démarrage.

## 2.4 CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,   # ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Pourquoi CORS ?** Le frontend React tourne sur le port 5173, le backend sur 8002. Les navigateurs bloquent par défaut les requêtes cross-origin (CORS policy). Le middleware ajoute les headers `Access-Control-Allow-*` nécessaires.
`allow_credentials=True` est obligatoire pour que le navigateur envoie les cookies (ou headers Authorization) avec les requêtes cross-origin.

## 2.5 Fichiers statiques uploadés

```python
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
```

Les CV (PDF) et photos de profil uploadés sont stockés sur le disque local dans un dossier `/uploads`. FastAPI les sert directement comme fichiers statiques. Une URL du type `http://localhost:8002/uploads/cv/user_3.pdf` est accessible directement depuis le navigateur.

**Pourquoi pas un bucket S3 ou cloud ?** Contexte de démo locale : simplicité, pas de dépendance réseau externe, pas de coûts.

## 2.6 Dépendances réutilisables (core/dependencies.py)

### get_current_user()

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(401, "Token invalide ou expiré")
    return user
```

`oauth2_scheme` est un `OAuth2PasswordBearer` qui extrait automatiquement le token du header `Authorization: Bearer <token>`.

### require_role()

```python
def require_role(roles: List[str]):
    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in roles:
            raise HTTPException(403, f"Accès réservé aux rôles : {', '.join(roles)}")
        return current_user
    return _guard
```

C'est une **fabrique de dépendances** (higher-order function). Elle retourne une fonction qui elle-même est une dépendance FastAPI. Usage : `Depends(require_role(["rdff", "chef_admin"]))`. Si le rôle ne correspond pas → 403 automatique avant même d'entrer dans la fonction de l'endpoint.

---

# 3. ML ENGINE

**Fichier :** `SCRIPT_PYTHON_ML/skills_engine.py`
**Port :** 8000
**Rôle :** Extraction des compétences depuis un CV PDF + scoring de matching CV/offre

## 3.1 Architecture hybride 3 couches

```
CV PDF → pdfplumber (extraction texte brut)
              ↓
    Layer 1 — NLP (spaCy NER + dictionnaire)
              ↓
    Layer 2 — ML  (TF-IDF + Cosine similarity, sklearn)
              ↓
    Layer 3 — DL  (Sentence-BERT, sentence-transformers)
              ↓
    Fusion des résultats + déduplication + filtre bruit
              ↓
    Liste finale de compétences
```

**Pourquoi 3 couches ?**

- **Layer 1 (NLP)** : rapide (< 100 ms), ne nécessite pas de GPU, mais faux positifs élevés car basé sur un dictionnaire. Sert de fallback et de première passe.
- **Layer 2 (TF-IDF)** : statistical, détecte les termes techniques récurrents dans le texte. Fonctionne sans modèle pré-entraîné, robuste aux abréviations.
- **Layer 3 (SBERT)** : sémantique. Comprend que "apprentissage automatique" et "machine learning" sont identiques. Mais lent (200–500 ms par document) et nécessite le modèle chargé en mémoire.

La **dégradation gracieuse** est intégrée : si `sentence-transformers` n'est pas installé, le moteur tourne avec les deux premières couches. Si `spaCy` est absent, seulement TF-IDF. Les imports sont wrappés dans des `try/except`.

## 3.2 Filtre de bruit (backend/api/users.py)

Après l'extraction ML, le backend filtre les mots parasites :

```python
_NOISE_SKILLS = {
    "formation", "évaluation", "publication", "automatique",
    "recherche", "thèse", "master", "doctorat", "licence",
    "enseignement", "tutorat", "encadrement", "mentorat"
}
```

**Pourquoi ?** Les CV d'enseignants contiennent des sections "Formation", "Publications", "Encadrement" — mots récurrents mais pas des compétences techniques. Le ML les détectait comme termes TF-IDF importants car ils apparaissent souvent.

## 3.3 Endpoint clé : POST /extract

Appelé par le backend principal quand un enseignant uploade son CV :
```
POST http://localhost:8000/extract
Content-Type: multipart/form-data
Body: file=<pdf_binary>
```
Retourne : `{"skills": ["Python", "Machine Learning", "Docker", ...], "confidence": 0.87}`

## 3.4 Endpoint : POST /match

Utilisé pour le scoring de matching candidature/offre :
```
POST http://localhost:8000/match
Body: {"cv_skills": [...], "offer_skills": [...]}
```
Retourne un score entre 0 et 1. Le backend stocke ce score dans `Candidature.score_matching`.

---

# 4. AGENT ARIA

**Fichier :** `esprit-aria/agent_ia.py`
**Port :** 8001
**Rôle :** Assistant IA conversationnel pour les enseignants et managers ESPRIT

## 4.1 Architecture ReAct (Reason + Act)

Le pattern **ReAct** est une technique d'agent IA où le modèle alterne entre deux actions :
- **Reason** : réfléchir au problème, décider si un outil est nécessaire
- **Act** : appeler un outil avec des paramètres, injecter le résultat, recommencer

```
Message utilisateur
        ↓
[RAG] Recherche dans ChromaDB (top-K documents pertinents)
        ↓
[Mémoire] Souvenirs personnels de l'utilisateur
        ↓
[Build Prompt] Système + contexte RAG + mémoire + historique
        ↓
[LLM] Llama 3.1 → JSON {"action": "use_tool" | "final_answer"}
        ↓
    use_tool ? → Exécuter l'outil → réinjecter → retour LLM
    final_answer ? → Retourner la réponse
        ↓
[Mémoriser] Sauvegarder l'échange (mémoire court terme + long terme si RAG utilisé)
```

**Maximum 8 itérations** (AGENT_MAX_ITER = 8) pour éviter les boucles infinies. Si épuisé sans réponse → message d'erreur explicatif.

## 4.2 Outils disponibles (ARIATools)

| Outil | Description |
|-------|-------------|
| `search_knowledge` | Recherche dans ChromaDB (documents ESPRIT) |
| `generate_training_plan` | Génère un plan de formation personnalisé |
| `summarize_evaluations` | Synthétise les évaluations d'un enseignant |
| `search_formations` | Cherche des formations dans le catalogue |

**Pourquoi des outils et pas juste le LLM ?** Le LLM seul "hallucine" des formations qui n'existent pas. Avec les outils, il interroge des données réelles (ChromaDB, catalogue BDD) et ne peut répondre qu'avec ce qui existe vraiment.

## 4.3 Parseur robuste — 3 niveaux de fallback

Le LLM doit retourner du JSON, mais parfois il déraille (texte libre, JSON mal formé, etc.) :

```python
# Stratégie 1 : bloc ```json ... ```
match = re.search(r"```json\s*([\s\S]*?)\s*```", text)

# Stratégie 2 : JSON brut commençant par {
if text.startswith("{"):
    data = json.loads(text)

# Stratégie 3 : chercher { ... } n'importe où dans le texte
match = re.search(r"\{[\s\S]*\}", text)

# Fallback ultime : tout le texte = final_answer
return AgentAction(action_type="final_answer", final_answer=text)
```

**Problème réel résolu :** Llama génère souvent des `\n` littéraux dans les strings JSON (pas échappés), ce qui rend `json.loads()` invalide. La fonction `_fix_json_newlines()` parcourt le texte caractère par caractère et échappe correctement les sauts de ligne à l'intérieur des strings JSON.

## 4.4 Cache d'agents

```python
_agent_cache: Dict[str, ARIAAgent] = {}

def get_agent(user_id: str) -> ARIAAgent:
    if user_id not in _agent_cache:
        _agent_cache[user_id] = ARIAAgent(user_id=user_id)
    return _agent_cache[user_id]
```

**Pourquoi ?** Créer un agent instancie RAGEngine, MemoryManager, OllamaChat — opération coûteuse. Avec le cache, chaque utilisateur a son agent persistant en RAM, avec sa mémoire courte conservée entre les messages de la même session serveur.

## 4.5 Contexte utilisateur injecté (backend/api/aria.py)

Avant d'envoyer le message à ARIA, le backend injecte le profil de l'utilisateur connecté :

```python
parts = [
    f"Prénom: {current_user.prenom}",
    f"Nom: {current_user.nom}",
    f"Rôle: {current_user.role.value}",
    f"Département: {current_user.departement}",
    f"Spécialité: {current_user.specialite}",
    f"Compétences: {', '.join(competences[:15])}",
    f"Statut Talent: {'Oui' if current_user.is_talent else 'Non'}",
]
context_prefix = "[Profil utilisateur — " + " | ".join(parts) + "]\n\n"
enriched_message = context_prefix + body.message
```

**Pourquoi ?** ARIA peut ainsi personnaliser ses réponses ("tu maîtrises déjà Python, je te recommande donc de progresser vers le Deep Learning") sans avoir besoin d'un outil dédié pour récupérer le profil.

## 4.6 Timeout — problème et solution

**Problème :** Llama 3.1 8B peut prendre 30–180 secondes pour générer une réponse selon la charge CPU. Axios avait un timeout global de 15 secondes → ARIA semblait "hors ligne".

**Solution :** Override du timeout par requête dans le client axios :
```javascript
// frontend/src/api/aria.js
const ARIA_TIMEOUT = 180_000   // 180 secondes
export const ariaChat = (message) =>
  api.post('/aria/chat', { message }, { timeout: ARIA_TIMEOUT })
```

Le timeout global reste à 15 s pour toutes les autres requêtes. Seules les requêtes ARIA bénéficient des 180 s.

---

# 5. FRONTEND REACT

**Répertoire :** `esprit-talents/frontend/`
**Port :** 5173 (Vite dev server)
**Stack :** React 18 + Vite + React Router v6 + Tailwind CSS + Axios

## 5.1 Structure des pages

```
src/
├── api/              ← clients Axios (un fichier par domaine)
│   ├── index.js      ← instance Axios avec interceptors
│   ├── aria.js       ← ariaChat(), ariaPlan() avec timeout 180s
│   ├── chat.js       ← getConversations(), getUnreadCount()
│   └── users.js      ← getUsers(), updateMe(), uploadCV()
├── contexts/
│   └── AuthContext.jsx  ← token JWT, user courant, login/logout
├── router/
│   └── AppRouter.jsx    ← routes protégées par rôle
├── components/
│   └── Layout/
│       └── Sidebar.jsx  ← menu adaptatif selon le rôle
└── pages/
    ├── candidat/
    ├── enseignant/
    ├── talent/
    ├── cup/            ← et rp_coord (même menu)
    ├── chef_dept/      ← et rp_chef (même menu)
    ├── rdff/
    ├── direction/
    └── shared/         ← ARIAChat, ChatPage, Recommandations, PlansCarriere
```

## 5.2 Instance Axios et interceptors

```javascript
// src/api/index.js
const api = axios.create({
  baseURL: 'http://localhost:8002',
  timeout: 15000,
})

// Injecter le JWT automatiquement sur chaque requête
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Rediriger vers /login si le token expire
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
```

**Pourquoi les interceptors ?** Sans eux, il faudrait écrire `headers: {Authorization: ...}` sur chaque appel API — source d'oublis et de duplication. L'interceptor centralise cette logique.

## 5.3 AuthContext

```jsx
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { username: email, password })
    localStorage.setItem('token', data.access_token)
    setToken(data.access_token)
    // Récupérer le profil complet
    const { data: me } = await api.get('/users/me')
    setUser(me)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null); setToken(null)
  }
}
```

**Pourquoi Context API et non Redux ?** L'état d'auth est simple (user, token) et rarement modifié. Redux ajoute une complexité disproportionnée (actions, reducers, store) pour ce cas d'usage. Context API + useState suffisent.

## 5.4 Routes protégées (AppRouter.jsx)

```jsx
function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" />
  return children
}
```

Chaque route déclare ses rôles autorisés. `HomeRedirect` oriente l'utilisateur vers son dashboard selon son rôle au moment du login.

## 5.5 Persistance ARIA (localStorage)

```javascript
// ARIAChat.jsx — sauvegarder à chaque nouveau message
const STORAGE_KEY = `aria_chat_${user?.id}`
localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))

// Restaurer au montage du composant
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) setMessages(JSON.parse(saved))
}, [user?.id])
```

**Problème résolu :** React réinitialise le state à chaque démontage de composant. Sans persistance, naviguer vers une autre page et revenir à ARIA effaçait toute la conversation. Avec localStorage keyed par `user.id`, chaque utilisateur conserve son historique même après navigation.

## 5.6 Badge "non lus" (Sidebar + ChatPage)

Le sidebar poll toutes les 15 s le endpoint `/chat/unread-count` et affiche un badge rouge si > 0. La page Chat poll toutes les 10 s la liste des conversations triées par `last_message_at DESC`.

---

# 6. OLLAMA / LLAMA

**Port :** 11434
**Modèle :** `llama3.1:8b` (Meta, 8 milliards de paramètres)
**Rôle :** LLM local pour les réponses d'ARIA

## 6.1 Pourquoi un LLM local ?

- **Confidentialité :** les données des enseignants (CV, évaluations, plans de carrière) ne quittent jamais le réseau ESPRIT. Pas d'envoi vers OpenAI ou Anthropic.
- **Coût zéro à l'usage :** pas de tokens facturés après le téléchargement du modèle.
- **Disponibilité hors internet :** fonctionne en intranet complet.

## 6.2 Pourquoi LLaMA 3.1 8B ?

- **Taille raisonnable :** 4,5 Go en quantification Q4 (format GGUF). Tourne sur CPU avec 8+ Go de RAM.
- **Multilinguisme :** supporte le français nativement (moins bien qu'en anglais, mais fonctionnel).
- **Instruction-tuned :** le modèle `llama3.1:8b-instruct` est entraîné pour suivre des instructions JSON structurées, ce que le pattern ReAct requiert.

## 6.3 Communication via Ollama API

```python
# OllamaChat._sync()
payload = {
    "model": "llama3.1:8b",
    "messages": [...],
    "stream": False,
    "options": {
        "temperature": 0.3,
        "num_predict": 700,
        "num_ctx": 8192,
        "top_p": 0.9
    }
}
r = requests.post("http://localhost:11434/api/chat", json=payload, timeout=180)
return r.json()["message"]["content"]
```

**Paramètres expliqués (valeurs réelles — config.py) :**
- `temperature: 0.3` : peu de créativité, réponses factuelles et déterministes. Choix délibéré pour ARIA : on veut des réponses précises sur les formations ESPRIT, pas de variabilité incontrôlée.
- `num_ctx: 8192` : fenêtre de contexte étendue. Permet d'inclure l'historique + les 6 chunks RAG + le profil utilisateur simultanément.
- `num_predict: 700` : longueur max de la réponse générée. Suffisant pour un plan structuré ; évite les réponses trop longues qui ralentissent l'inférence CPU.
- `top_p: 0.9` : nucleus sampling — ne considère que les tokens dont la probabilité cumulée atteint 90%.

**Retry exponentiel :**
```python
for attempt in range(1, OLLAMA_RETRIES + 1):
    try:
        return r.json()[...]
    except:
        time.sleep(2 ** attempt)  # 2s, 4s, 8s...
```

---

# 7. BASE DE DONNÉES

## 7.1 SQLAlchemy ORM

**Pourquoi SQLAlchemy ?**
- ORM (Object-Relational Mapper) : les tables SQL sont des classes Python, les lignes sont des objets. Plus de SQL brut à écrire pour les opérations courantes.
- Portable : le même code ORM fonctionne sur SQLite (dev) et PostgreSQL (prod) en changeant uniquement l'URL de connexion.
- `Base.metadata.create_all()` crée les tables automatiquement depuis les modèles.

## 7.2 Pourquoi SQLite ?

- **Zéro configuration** : pas de serveur à installer, pas d'authentification, le fichier `esprit.db` EST la base.
- **Parfait pour une démo** : la base est un fichier unique, facile à sauvegarder/réinitialiser.
- **Limite :** SQLite ne supporte pas les écritures concurrentes. En production avec plusieurs workers Uvicorn, il faudrait PostgreSQL.

## 7.3 Colonnes JSON

```python
competences = Column(JSON, nullable=True)     # User
objectifs   = Column(JSON, nullable=True)     # Formation
```

SQLite stocke les colonnes JSON comme TEXT. SQLAlchemy les sérialise/désérialise automatiquement. Cela évite de créer une table `competences` séparée pour ce qui est une liste simple.

## 7.4 Problème joinedload — lazy loading

**Problème :** SQLAlchemy charge les relations en "lazy" par défaut : une relation n'est chargée que quand on y accède. Mais si la session SQLAlchemy est fermée (après le `yield` dans `get_db()`), accéder à une relation non chargée lève `DetachedInstanceError`.

```python
# MAUVAIS — relation formation pas chargée, session fermée avant sérialisation Pydantic
insc = db.query(Inscription).filter(...).first()
return insc   # → DetachedInstanceError sur insc.formation

# BON — relation chargée en une seule requête SQL avec JOIN
insc = db.query(Inscription).options(
    joinedload(Inscription.formation)
).filter(...).first()
```

`joinedload` génère un SQL avec `LEFT OUTER JOIN` et charge la relation en une seule requête. La relation est disponible même après fermeture de la session.

## 7.5 Pydantic v2 — ORM mode

```python
class InscriptionOut(BaseModel):
    id: int
    formation: Optional[FormationMini]

    model_config = {"from_attributes": True}
```

`from_attributes = True` (Pydantic v2) permet à Pydantic de lire les attributs d'un objet SQLAlchemy directement, sans convertir manuellement en dict. En Pydantic v1, c'était `orm_mode = True`.

## 7.6 Tables principales

| Table | Rôle |
|-------|------|
| users | Tous les comptes (15 rôles) |
| offres | Offres de recrutement |
| candidatures | Candidatures + score ML |
| evaluations | Notes par dimension (pédagogique, etc.) |
| formations | Catalogue de formations |
| inscriptions | Lien enseignant↔formation + progression |
| messages | Messages DM entre utilisateurs |
| notifications | Alertes in-app |
| recommandations_talent | Workflow de recommandation en 5 dimensions |
| plans_carriere | Plans d'évolution créés par managers |
| distinctions_talent | Prix et récompenses (Enseignant de l'Année…) |
| avantages_talents | Avantages associés au statut Talent |

---

# 8. JWT — AUTHENTIFICATION

## 8.1 Flux complet

```
1. POST /auth/login  { username, password }
        ↓
2. Backend : vérifier bcrypt(password) == user.hashed_password
        ↓
3. Si OK → créer JWT :
   payload = { "sub": str(user.id), "exp": now + 24h }
   token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        ↓
4. Retourner { access_token, token_type: "bearer" }
        ↓
5. Frontend : stocker dans localStorage
        ↓
6. Chaque requête suivante :
   Authorization: Bearer <token>
        ↓
7. Backend intercepte (OAuth2PasswordBearer) → decode_access_token()
   → extraire user.id → charger User depuis BDD
```

## 8.2 Pourquoi JWT et non session serveur ?

- **Stateless :** le serveur ne stocke pas de session. Le token contient toutes les informations nécessaires (user_id, expiration). Scalable horizontalement.
- **Standard industriel :** REST APIs modernes utilisent JWT. Compatible avec tous les clients (mobile, web, CLI).
- **24h d'expiration :** équilibre entre UX (ne pas forcer re-login trop fréquemment) et sécurité.

## 8.3 Sécurité du token

- Signé avec `HS256` (HMAC-SHA256) et une `SECRET_KEY` longue.
- Si quelqu'un modifie le payload (ex: changer son `user_id`), la signature est invalide → rejeté.
- **Limite :** HS256 est un algorithme symétrique (même clé pour signer et vérifier). En production multi-serveurs, RS256 (asymétrique) serait préférable.

---

# 9. WEBSOCKET — CHAT

## 9.1 Pourquoi WebSocket et non polling HTTP ?

- **Polling HTTP** : le client interroge le serveur toutes les N secondes ("j'ai des nouveaux messages ?"). Même sans messages, des centaines de requêtes inutiles.
- **WebSocket** : connexion persistante bidirectionnelle. Le serveur pousse les messages dès qu'ils arrivent. Latence proche de 0, 0 requêtes inutiles.

## 9.2 ConnectionManager

```python
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}  # user_id → websocket

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    async def send_to(self, user_id: str, data: dict):
        if user_id in self.active:
            await self.active[user_id].send_json(data)

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)
```

**Une connexion WebSocket par utilisateur** identifiée par `user_id`. Quand A envoie un message à B, le backend appelle `send_to(B.id, message)`. Si B n'est pas connecté (pas de WebSocket actif), le message est quand même sauvegardé en BDD et B le verra à sa prochaine connexion.

## 9.3 Room ID canonique

```python
room_id = f"dm_{min(sender_id, receiver_id)}_{max(sender_id, receiver_id)}"
```

**Pourquoi `min/max` ?** Cela garantit que la room entre utilisateurs A (id=3) et B (id=7) est toujours `dm_3_7`, que ce soit A ou B qui initie la conversation. Sans ça, on aurait des rooms `dm_3_7` et `dm_7_3` en double.

---

# 10. RÔLES ET PÉRIMÈTRES

## 10.1 15 rôles dans RoleEnum

```python
class RoleEnum(str, enum.Enum):
    candidat, enseignant, talent,
    rp_chef, rp_coord,           # legacy (rétro-compat)
    rdff, chef_admin, direction_etudes, direction,
    cup, chef_dept, direction_dept,
    responsable, cps, charge_mission
```

**Pourquoi `str, enum.Enum` ?** En héritant de `str`, les valeurs de l'enum sont des strings Python normales. `user.role.value == "cup"` ET `user.role == "cup"` fonctionnent tous les deux. Comparaison plus naturelle, sérialisation JSON directe.

## 10.2 Colonnes sous_role et perimetre

```python
sous_role = Column(String(100), nullable=True)
# Exemples : "cup_algorithmique", "direction_financiere"

perimetre = Column(String(200), nullable=True)
# Exemples : "Algorithmique", "Web & Mobile", "Informatique"
```

**Pourquoi ne pas créer 25 valeurs d'enum distinctes ?**
- Chaque nouveau rôle nécessiterait des modifications dans : RoleEnum, guards des endpoints, menus Sidebar, routes AppRouter, seed.py.
- Avec `sous_role` + `perimetre`, on ajoute de la granularité sans multiplier les conditions dans le code.
- Le `perimetre` est la valeur métier qui change : un CUP peut gérer "Algorithmique" ou "Web & Mobile" — même rôle, périmètre différent.

## 10.3 Restriction par périmètre (cup/rp_coord uniquement)

```python
# api/evaluations.py
if current_user.role.value in ("cup", "rp_coord") \
   and current_user.perimetre \
   and enseignant.perimetre != current_user.perimetre:
    raise HTTPException(403, f"Vous ne pouvez évaluer que les enseignants de votre unité pédagogique ({current_user.perimetre}).")
```

**Pourquoi `role in ("cup", "rp_coord")` et pas `chef_dept` ?**
`chef_dept` a `perimetre = "Informatique"` (département entier). Les enseignants ont des périmètres comme "Algorithmique" ou "Web & Mobile" (sous-unités). Si on appliquait le filtre d'égalité à chef_dept, il ne pourrait évaluer personne car `"Informatique" != "Algorithmique"`. La restriction ne s'applique qu'aux CUP qui gèrent une unité pédagogique spécifique.

## 10.4 Rétro-compatibilité rp_coord/rp_chef

`rp_coord` et `rp_chef` sont conservés dans l'enum pour ne pas casser les comptes existants en base. Ils ont les mêmes droits que `cup` et `chef_dept` respectivement. Les guards incluent les deux : `["cup", "rp_coord"]`.

---

# 11. WORKFLOW TALENT

## 11.1 Trois chemins vers le statut Talent

### Voie A — Enseignant initie → Manager approuve
```
Enseignant : POST /plans-carriere → statut = "en_attente"
        ↓
Manager (cup/chef_dept) : PATCH /plans-carriere/{id} → statut = "en_cours"
        ↓
[Travail effectué]
        ↓
Manager : PATCH → statut = "realise"
```

### Voie B — Manager crée directement
```
Manager : POST /plans-carriere (enseignant_id fourni)
        → statut = "en_cours" dès la création (pas de validation nécessaire)
```

**Comment distinguer A de B ?**
```python
# plans_carriere.py
if body.enseignant_id == current_user.id:
    # L'enseignant crée son propre plan → Voie A
    statut = StatutPlanEnum.en_attente
else:
    # Un manager crée pour un autre → Voie B
    statut = StatutPlanEnum.en_cours
```

### Voie C — Badge de formation (RDFF)
```
RDFF : PATCH /formations/inscriptions/{id}
       { statut: "terminé", badge_obtenu: true }
        ↓
Backend : user.is_talent = True + notification "Félicitations !"
```
Cette voie ne change pas le `role` de l'enseignant, seulement `is_talent = True`.

## 11.2 Recommandation formelle de talent

```
Recommandant (cup/chef_dept/direction/chef_admin) :
POST /recommandations {enseignant_id, scores 5 dimensions, justifications}
        ↓
RH (chef_admin) : PATCH /recommandations/{id}/valider
        ↓
Notification + is_talent = True + role = "talent"
```

**5 dimensions d'évaluation :**
- dim_scientifique (publications, recherche)
- dim_pedagogique (cours, méthodes)
- dim_communicationnel (relationnel, présentation)
- dim_comportemental (ponctualité, engagement)
- dim_autres (autres mérites)

Score moyen calculé automatiquement : `(s1 + s2 + s3 + s4 + s5) / 5`

## 11.3 Raccourci Direction/Chef Admin

```python
# POST /evaluations/valider-talent/{user_id}
# Réservé à ["chef_admin", "direction"]
user.is_talent = True
user.role = RoleEnum.talent
user.date_talent = date.today()
```

Ce raccourci bypasse le workflow formel de recommandation. Utilisé quand la direction veut promouvoir directement sans passer par la procédure complète.

---

# 12. RAG — RETRIEVAL-AUGMENTED GENERATION

## 12.1 Principe

Le RAG (Génération Augmentée par Récupération) est une technique qui enrichit les réponses du LLM avec des données réelles :

```
Question utilisateur
        ↓
[Embedding] sentence-transformers → vecteur de la question
        ↓
[ChromaDB] recherche des K documents les plus similaires (cosine similarity)
        ↓
[Contexte] les K documents sont injectés dans le prompt du LLM
        ↓
[LLM] génère une réponse BASÉE sur ces documents (et non pas ses seuls paramètres)
```

**Sans RAG :** ARIA invente des formations ESPRIT qui n'existent pas (hallucination).
**Avec RAG :** ARIA cite uniquement les formations qui figurent dans ChromaDB.

## 12.2 ChromaDB

ChromaDB est une base de données vectorielle embarquée (comme SQLite, mais pour des vecteurs). Les documents sont stockés avec leur embedding (vecteur numérique de dimension 384 pour MiniLM).

```python
# Recherche top-K documents pertinents
results = collection.query(
    query_embeddings=[embedding],
    n_results=RAG_TOP_K,   # ex: 5
)
```

**Pourquoi ChromaDB et non Pinecone ou Weaviate ?** ChromaDB tourne entièrement en local, sans dépendance réseau, sans compte cloud. Idéal pour une démo sur machine locale.

## 12.3 Modèle d'embedding

```
paraphrase-multilingual-MiniLM-L12-v2
```

- **Multilingue** : supporte le français, l'anglais, et 48 autres langues dans le même espace vectoriel.
- **Léger** : 118 Mo, génère des vecteurs de dimension 384. Beaucoup plus rapide que les gros modèles (OpenAI ada-002 → 1536 dimensions, API payante).
- **MiniLM** : distillé depuis un modèle plus grand, excellent rapport qualité/performance.

## 12.4 Synchronisation RAG ↔ BDD

Quand une formation est créée/modifiée dans la BDD principale, le backend appelle :

```python
POST http://localhost:8001/rag/sync
Body: [{"code": "F001", "titre": "...", "description": "...", ...}]
```

ARIA indexe la formation dans ChromaDB avec `_upsert_chunks()` (insert ou update si l'ID existe déjà). Ainsi l'index RAG reste synchronisé avec le catalogue réel.

---

# 13. COMMUNICATION INTER-SERVICES

## 13.1 Backend → ML Engine

```python
# api/users.py — upload CV
import httpx
r = httpx.post(
    f"{settings.ML_URL}/extract",
    files={"file": (filename, pdf_bytes, "application/pdf")},
    timeout=60,
)
skills = r.json().get("skills", [])
```

`httpx` est utilisé à la place de `requests` car il supporte nativement l'async. `timeout=60` pour laisser le temps au ML de traiter le PDF.

## 13.2 Backend → ARIA

```python
# api/aria.py
import httpx
r = httpx.post(
    f"{settings.ARIA_URL}/chat",
    json={"user_id": str(current_user.id), "message": enriched_message},
    timeout=180,   # Llama peut prendre jusqu'à 3 minutes
)
```

## 13.3 ARIA → Ollama

```python
# agent_ia.py — OllamaChat._sync()
r = requests.post(
    "http://localhost:11434/api/chat",
    json=payload,
    timeout=OLLAMA_TIMEOUT,   # 180s
)
```

## 13.4 Health check centralisé

```python
# main.py
@app.get("/health")
def health():
    for name, url in [("aria", ARIA_URL), ("ml", ML_URL)]:
        try:
            r = httpx.get(f"{url}/health", timeout=3)
            services[name] = "ok" if r.status_code == 200 else "erreur"
        except:
            services[name] = "hors ligne"
    return {"status": "ok", "services": services}
```

Un seul appel à `GET /health` du backend retourne l'état de tous les services connectés.

---

# 14. LAUNCHER UNIFIÉ

**Fichier :** `Stage/start_all.ps1`

## 14.1 Problème résolu

Avant : 5 terminaux séparés à ouvrir manuellement dans le bon ordre, surveiller chacun, redémarrer manuellement en cas de crash.

Après : un seul `start_all.bat` → une seule fenêtre PowerShell avec :
- Ordre de démarrage respecté (Ollama → ML → ARIA → Backend → Frontend)
- Logs de tous les services avec préfixe coloré [Nom]
- Health check toutes les 8 s avec auto-redémarrage
- Ouverture automatique du navigateur quand tout est opérationnel
- Arrêt propre de tous les processus au `Ctrl+C`

## 14.2 Gestion de l'ordre de démarrage

```powershell
$services = [ordered]@{
    Ollama   = @{ Port = 11434; SkipIfUp = $true; ... }
    MLEngine = @{ Port = 8000; ... }
    ARIA     = @{ Port = 8001; ... }
    Backend  = @{ Port = 8002; ... }
    Frontend = @{ Port = 5173; ... }
}
```

`[ordered]@{}` est un OrderedDictionary PowerShell — les clés sont itérées dans l'ordre d'insertion. La boucle de démarrage respecte donc Ollama → ML → ARIA → Backend → Frontend avec 2 secondes entre chaque.

**Pourquoi cet ordre ?** ARIA a besoin d'Ollama dès son démarrage (RAGEngine initialise ChromaDB). Le backend a besoin d'ARIA et ML pour ses health checks. Le frontend est en dernier car il ne dépend que du backend.

## 14.3 Ollama SkipIfUp

```powershell
if ($svc.SkipIfUp -and (Test-Url $svc.Health $svc.HealthTimeout)) {
    Write-Host "[$Name] déjà actif — réutilisé tel quel"
    $status[$Name] = "OK"
    return
}
```

Ollama tourne souvent en tant que service système Windows. Le démarrer une deuxième fois causerait `Error: listen tcp 127.0.0.1:11434: bind: address already in use`. `SkipIfUp = $true` vérifie d'abord si le port 11434 répond avant de tenter le démarrage.

## 14.4 Lecture des logs en temps réel (tail)

```powershell
$stream = [System.IO.File]::Open($logFile, 'Open', 'Read', 'ReadWrite')
$stream.Seek($logPos[$name][$kind], 'Begin')
$reader  = New-Object System.IO.StreamReader($stream)
$newText = $reader.ReadToEnd()
$logPos[$name][$kind] = $stream.Position
```

PowerShell n'a pas de `tail -f` natif. Cette implémentation ouvre le fichier log en lecture partagée (mode `ReadWrite` requis pour lire un fichier ouvert en écriture par un autre process), se positionne où on s'est arrêté la dernière fois (`logPos`), lit le nouveau contenu, et met à jour la position. Exécuté toutes les 500 ms.

---

# 15. QUESTIONS PROBABLES ET RÉPONSES

## Q1 : Pourquoi ne pas avoir utilisé une seule application monolithique (ex: Django full-stack) ?

**Réponse :** La séparation en micro-services répond à des besoins techniques réels :
- Le ML Engine charge des modèles de 400+ Mo. Dans un monolithe, le démarrage de l'app web attendrait ce chargement.
- Ollama/Llama est bloquant (30–180 s par requête). Dans un monolithe synchrone, toute l'API serait bloquée pendant ce temps.
- Chaque service peut être mis à jour et redéployé indépendamment.
- La séparation des responsabilités facilite la maintenance : un bug dans le ML n'affecte pas le chat, les notifs, etc.

## Q2 : Comment garantir la sécurité des données enseignants ?

**Réponse :**
- Toutes les routes sont protégées par JWT (sauf `/auth/login`).
- `require_role()` applique le principe du moindre privilège : seul rdff/chef_admin peut créer des formations.
- Les mots de passe sont hashés avec bcrypt (coût adaptatif, résistant aux attaques par dictionnaire).
- Le LLM est local (Ollama) : aucune donnée n'est envoyée à des API cloud.
- La restriction par périmètre empêche un CUP d'évaluer des enseignants hors de son unité.

## Q3 : Que se passe-t-il si Ollama tombe en panne ?

**Réponse :**
- Le backend détecte via le health check que ARIA est "hors ligne" (`GET /health` → `"aria": "hors ligne"`).
- Le frontend affiche "ARIA indisponible — le service IA est hors ligne. Réessayez plus tard."
- Toutes les autres fonctionnalités (chat, formations, évaluations, plans de carrière) continuent de fonctionner normalement car elles ne dépendent pas d'ARIA.
- `start_all.ps1` détecte la panne et tente un redémarrage automatique.

## Q4 : Pourquoi SQLite et pas PostgreSQL ?

**Réponse :** SQLite est parfait pour le contexte du projet :
- Zéro configuration serveur, zéro infrastructure.
- Démo 100% locale sans dépendance réseau.
- Le code SQLAlchemy est identique — migrer vers PostgreSQL se résume à changer `DATABASE_URL = "postgresql://..."` dans `.env`.
- Limite : SQLite ne supporte pas plusieurs écritures simultanées (WAL mode possible mais non configuré ici). En production à fort trafic, PostgreSQL serait nécessaire.

## Q5 : Comment fonctionne le matching de compétences ?

**Réponse :** Triple couche hybride :
1. **spaCy NER** extrait les entités nommées techniques du texte du CV (noms propres, acronymes techniques).
2. **TF-IDF** (Term Frequency–Inverse Document Frequency) pondère les termes selon leur fréquence dans le CV vs un corpus de référence. Les termes rares mais présents sont considérés plus significatifs.
3. **Sentence-BERT** encode le texte en vecteurs sémantiques. La similarité cosinus entre le vecteur CV et le vecteur de l'offre donne un score entre 0 et 1.

Les trois couches sont fusionnées : si au moins deux couches détectent une compétence, elle est retenue. Le filtre de bruit supprime ensuite les faux positifs lexicaux (formation, évaluation, etc.).

## Q6 : Qu'est-ce que le pattern ReAct ?

**Réponse :** ReAct (Reason + Act) est une architecture d'agent IA publiée en 2022 (Yao et al.). Le LLM alterne entre :
- **Reason** : analyser la question, décider si un outil est nécessaire (ex: "l'utilisateur demande des formations sur Python → je dois chercher dans le catalogue").
- **Act** : appeler l'outil, récupérer le résultat, le réinjecter dans le contexte.

Cette alternance continue jusqu'à ce que le LLM ait assez d'information pour une `final_answer`. Sans ReAct, le LLM répondrait avec ses seules connaissances pré-entraînées (risque d'hallucination). Avec ReAct, il est "ancré" dans des données réelles.

## Q7 : Pourquoi ChromaDB et non une recherche SQL classique ?

**Réponse :** La recherche SQL classique (`WHERE description LIKE '%Python%'`) est lexicale : elle ne trouve que les correspondances exactes de termes. Une question comme "cours sur l'apprentissage automatique" ne trouverait pas une formation intitulée "Introduction au Machine Learning".

ChromaDB + SBERT fait une recherche **sémantique** : les deux phrases sont encodées en vecteurs proches dans l'espace 384-dimensionnel, même si les mots sont différents. La similarité cosinus détecte cette proximité sémantique.

## Q8 : Comment sont gérés les tokens JWT expirés ?

**Réponse :** Le backend vérifie la date d'expiration dans `decode_access_token()`. Si le token est expiré → `401 Unauthorized`. L'interceptor Axios côté frontend intercepte ce 401 → supprime le token du localStorage → redirige vers `/login`. L'utilisateur doit se reconnecter pour obtenir un nouveau token valide 24h.

## Q9 : Que signifie "from_attributes = True" dans Pydantic v2 ?

**Réponse :** Par défaut, Pydantic lit les données depuis un dict Python. `from_attributes = True` lui permet de lire les attributs d'un objet quelconque (ici un objet SQLAlchemy). Sans cette option, il faudrait convertir manuellement : `InscriptionOut(**insc.__dict__)`. Avec, on peut écrire directement `return insc` depuis un endpoint FastAPI déclaré `response_model=InscriptionOut`.

## Q10 : Pourquoi stocker les compétences en JSON dans la colonne `users.competences` ?

**Réponse :** Les compétences sont une liste simple de strings sans relations complexes (`["Python", "Machine Learning", "Docker"]`). Créer une table `competences` séparée avec FK vers `users` aurait requis une jointure à chaque chargement du profil utilisateur, pour un gain inexistant. Les colonnes JSON SQLAlchemy sont sérialisées/désérialisées transparemment, et Pydantic les expose comme `List[str]`. C'est le bon niveau d'abstraction pour ce cas d'usage.

---

# GLOSSAIRE TECHNIQUE RAPIDE

| Terme | Définition |
|-------|------------|
| **ASGI** | Asynchronous Server Gateway Interface. Standard Python pour serveurs web async (Uvicorn/Starlette). Succède à WSGI. |
| **Pydantic** | Bibliothèque Python de validation de données via type hints. Utilisée par FastAPI pour les schemas I/O. |
| **ORM** | Object-Relational Mapper. Couche d'abstraction entre classes Python et tables SQL. SQLAlchemy est l'ORM utilisé. |
| **JWT** | JSON Web Token. Format de token auto-porteur signé. Contient les claims (user_id, expiration) + signature cryptographique. |
| **CORS** | Cross-Origin Resource Sharing. Mécanisme qui contrôle les requêtes entre origines différentes (ex: port 5173 → port 8002). |
| **TF-IDF** | Term Frequency–Inverse Document Frequency. Mesure statistique d'importance d'un terme dans un document. |
| **Cosine Similarity** | Similarité entre deux vecteurs mesurée par le cosinus de l'angle entre eux. 1 = identiques, 0 = orthogonaux, -1 = opposés. |
| **Embedding** | Représentation d'un texte sous forme de vecteur numérique dans un espace sémantique. Textes similaires = vecteurs proches. |
| **RAG** | Retrieval-Augmented Generation. Technique combinant recherche documentaire et génération LLM pour des réponses ancrées dans des faits réels. |
| **ReAct** | Reason + Act. Pattern d'agent IA alternanant raisonnement et appels d'outils dans une boucle. |
| **Joinedload** | Option SQLAlchemy pour charger une relation en une seule requête SQL avec JOIN. Évite le problème N+1 et les DetachedInstanceError. |
| **WebSocket** | Protocole de communication bidirectionnel persistant sur TCP. Remplace le polling HTTP pour les applications temps réel. |
| **bcrypt** | Algorithme de hashage de mots de passe avec coût adaptatif. Résistant aux attaques GPU par sa lenteur contrôlée. |
| **ChromaDB** | Base de données vectorielle embarquée (sans serveur). Stocke les embeddings et permet la recherche par similarité. |
| **Uvicorn** | Serveur ASGI Python ultra-rapide basé sur uvloop. Lance les applications FastAPI. |
| **Vite** | Build tool frontend ultra-rapide (ESM natif + HMR). Remplace Webpack pour les projets React modernes. |
| **Context API** | Mécanisme React pour partager un état global sans prop drilling. Utilisé pour l'authentification (user, token, login/logout). |

---

*Document généré pour la restitution technique du projet ESPRIT Talents — PFE 2026*
*Services couverts : Backend FastAPI · ML Engine · Agent ARIA · Frontend React · Ollama/LLaMA*
