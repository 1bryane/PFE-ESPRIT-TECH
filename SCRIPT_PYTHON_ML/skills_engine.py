"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          ESPRIT — Moteur d'Extraction & Matching de Compétences             ║
║                   skills_engine.py  — version 1.0                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  ARCHITECTURE HYBRIDE (3 couches, ordre de priorité décroissant)           ║
║  ┌─────────────────────────────────────────────────────────────────────┐   ║
║  │  Layer 3 — DL  : sentence-transformers (semantic similarity)        │   ║
║  │  Layer 2 — ML  : TF-IDF + Cosine similarity (sklearn)               │   ║
║  │  Layer 1 — NLP : spaCy NER + dictionnaire de compétences (fallback) │   ║
║  └─────────────────────────────────────────────────────────────────────┘   ║
║                                                                             ║
║  INSTALLATION (une seule fois) :                                           ║
║    pip install pdfplumber spacy scikit-learn sentence-transformers          ║
║               fastapi uvicorn[standard] pydantic rapidfuzz nltk            ║
║               python-multipart torch                                        ║
║    python -m spacy download fr_core_news_md                                ║
║    python -m spacy download en_core_web_md                                 ║
║                                                                             ║
║  UTILISATION RAPIDE :                                                       ║
║    from skills_engine import SkillsEngine                                   ║
║    engine = SkillsEngine()                                                  ║
║    skills = engine.extract_from_pdf("cv.pdf")                              ║
║    score  = engine.match(cv_skills, offer_skills)                          ║
║                                                                             ║
║  API (FastAPI) :                                                            ║
║    uvicorn skills_engine:app --reload --port 8000                          ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

# ─────────────────────────────────────────────────────────────────────────────
#  IMPORTS STANDARDS (toujours disponibles)
# ─────────────────────────────────────────────────────────────────────────────
from __future__ import annotations

import io
import re
import json
import math
import logging
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from collections import Counter

import numpy as np
import pandas as pd

# ─────────────────────────────────────────────────────────────────────────────
#  IMPORTS OPTIONNELS  (chargés dynamiquement — dégradation gracieuse)
# ─────────────────────────────────────────────────────────────────────────────
try:
    import pdfplumber
    PDF_OK = True
except ImportError:
    PDF_OK = False
    logging.warning("[WARN] pdfplumber non installé → extraction PDF désactivée")

try:
    import spacy
    SPACY_OK = True
except ImportError:
    SPACY_OK = False
    logging.warning("[WARN] spaCy non installé → NER désactivé")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.preprocessing import normalize
    SKLEARN_OK = True
except ImportError:
    SKLEARN_OK = False
    logging.warning("[WARN] scikit-learn non installé → TF-IDF désactivé")

try:
    from sentence_transformers import SentenceTransformer, util as st_util
    SBERT_OK = True
except ImportError:
    SBERT_OK = False
    logging.warning("[WARN] sentence-transformers non installé → DL désactivé")

try:
    from rapidfuzz import fuzz as rfuzz, process as rfprocess
    FUZZY_OK = True
except ImportError:
    FUZZY_OK = False

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize
    try:
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        nltk.download('punkt_tab', quiet=True)
    NLTK_OK = True
except ImportError:
    NLTK_OK = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("skills_engine")

# ─────────────────────────────────────────────────────────────────────────────
#  DICTIONNAIRE DE COMPÉTENCES (domaine académique/IT — ESPRIT)
#  Extensible : ajouter des catégories au besoin
# ─────────────────────────────────────────────────────────────────────────────

SKILLS_DICT: Dict[str, List[str]] = {

    # ── Informatique & Génie Logiciel ──────────────────────────────────────
    "Langages de programmation": [
        "python", "java", "c", "c++", "c#", "javascript", "typescript",
        "php", "ruby", "go", "rust", "kotlin", "swift", "scala", "r",
        "matlab", "vba", "perl", "bash", "shell", "powershell", "dart",
        "julia", "haskell", "lua", "groovy", "cobol", "fortran"
    ],
    "Web Frontend": [
        "html", "css", "react", "reactjs", "react.js", "angular", "angularjs",
        "vue", "vuejs", "svelte", "nextjs", "nuxtjs", "tailwind", "bootstrap",
        "jquery", "sass", "scss", "webpack", "vite", "redux", "mobx",
        "graphql", "rest api", "ajax", "responsive design", "figma", "ux/ui"
    ],
    "Web Backend": [
        "node.js", "nodejs", "express", "django", "flask", "fastapi",
        "spring", "spring boot", "laravel", "symfony", "rails", "asp.net",
        "nestjs", "strapi", "graphql", "microservices", "soap", "rest"
    ],
    "Bases de données": [
        "sql", "mysql", "postgresql", "mongodb", "redis", "sqlite",
        "oracle", "sql server", "nosql", "elasticsearch", "cassandra",
        "dynamodb", "firebase", "supabase", "prisma", "sequelize", "sqlalchemy"
    ],
    "DevOps & Cloud": [
        "docker", "kubernetes", "k8s", "jenkins", "gitlab ci", "github actions",
        "ci/cd", "ansible", "terraform", "vagrant", "nginx", "apache",
        "aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify",
        "linux", "ubuntu", "debian", "centos", "bash scripting"
    ],
    "Intelligence Artificielle & ML": [
        "machine learning", "deep learning", "nlp", "computer vision",
        "tensorflow", "keras", "pytorch", "scikit-learn", "pandas",
        "numpy", "matplotlib", "seaborn", "opencv", "hugging face",
        "transformers", "bert", "gpt", "llm", "rag", "langchain",
        "xgboost", "random forest", "neural network", "cnn", "rnn", "lstm",
        "reinforcement learning", "data science", "data analysis",
        "feature engineering", "model deployment", "mlflow", "mlops"
    ],
    "Sécurité Informatique": [
        "cybersécurité", "cybersecurity", "penetration testing", "pentest",
        "ethical hacking", "sécurité réseau", "firewall", "cryptographie",
        "oauth", "jwt", "ssl/tls", "owasp", "siem", "soc", "incident response"
    ],
    "Réseaux & Systèmes": [
        "tcp/ip", "dns", "dhcp", "vpn", "lan", "wan", "vlan",
        "cisco", "juniper", "wireshark", "active directory", "ldap",
        "windows server", "vmware", "virtualisation", "proxmox"
    ],
    "Méthodologies": [
        "agile", "scrum", "kanban", "devops", "tdd", "bdd", "solid",
        "design patterns", "uml", "merise", "git", "github", "gitlab",
        "jira", "trello", "confluence", "clean code", "code review"
    ],

    # ── Génie Civil & BTP ─────────────────────────────────────────────────
    "Génie Civil": [
        "béton armé", "calcul de structures", "résistance des matériaux",
        "mécanique des sols", "hydraulique", "topographie", "autocad",
        "revit", "robot structural", "sap2000", "etabs", "plaxis",
        "dessin technique", "bim", "géotechnique", "voirie réseaux",
        "béton précontraint", "construction métallique", "terrassement"
    ],

    # ── Sciences & Ingénierie ─────────────────────────────────────────────
    "Mathématiques & Sciences": [
        "algèbre linéaire", "analyse", "probabilités", "statistiques",
        "équations différentielles", "optimisation", "recherche opérationnelle",
        "physique", "électronique", "automatique", "signal processing"
    ],
    "Électronique & Embarqué": [
        "arduino", "raspberry pi", "microcontrôleur", "stm32", "fpga",
        "vhdl", "verilog", "pcb", "capteurs", "iot", "protocoles i2c spi uart"
    ],

    # ── Enseignement & Pédagogie ──────────────────────────────────────────
    "Compétences Pédagogiques": [
        "enseignement", "pédagogie", "formation", "tutorat", "encadrement",
        "évaluation", "conception pédagogique", "e-learning", "moodle",
        "préparation de cours", "travaux dirigés", "travaux pratiques",
        "supervision de projets", "mentorat", "coaching"
    ],
    "Recherche Académique": [
        "recherche", "publication", "article scientifique", "thèse",
        "doctorat", "master", "latex", "bibliographie", "revue de littérature",
        "méthodologie de recherche", "analyse qualitative", "analyse quantitative"
    ],

    # ── Soft Skills ────────────────────────────────────────────────────────
    "Compétences Transversales": [
        "communication", "travail en équipe", "leadership", "gestion de projet",
        "résolution de problèmes", "esprit d'analyse", "créativité",
        "autonomie", "adaptabilité", "organisation", "rigueur",
        "prise de décision", "gestion du stress", "sens des responsabilités"
    ],

    # ── Langues ────────────────────────────────────────────────────────────
    "Langues": [
        "français", "anglais", "arabe", "espagnol", "allemand", "italien",
        "chinois", "japonais", "toeic", "toefl", "ielts", "delf", "dalf",
        "bilingue", "trilingue"
    ],

    # ── Gestion & Management ──────────────────────────────────────────────
    "Gestion & Management": [
        "gestion de projet", "management", "planification", "budgétisation",
        "reporting", "kpi", "tableau de bord", "microsoft project",
        "prince2", "pmp", "itil", "lean", "six sigma", "erp", "sap",
        "odoo", "microsoft office", "excel avancé", "power bi", "tableau"
    ],
}

# Index inversé : compétence → catégorie
SKILL_TO_CAT: Dict[str, str] = {}
ALL_SKILLS: List[str] = []
for cat, skills in SKILLS_DICT.items():
    for s in skills:
        SKILL_TO_CAT[s.lower()] = cat
        ALL_SKILLS.append(s.lower())

# ─────────────────────────────────────────────────────────────────────────────
#  DATA CLASSES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Skill:
    """Compétence extraite avec métadonnées."""
    name: str
    category: str
    confidence: float       # 0.0 – 1.0
    source: str             # "dict" | "ner" | "context"
    occurrences: int = 1

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ExtractedProfile:
    """Profil complet extrait d'un CV."""
    raw_text: str
    skills: List[Skill] = field(default_factory=list)
    skills_by_category: Dict[str, List[str]] = field(default_factory=dict)
    all_skill_names: List[str] = field(default_factory=list)
    language: str = "fr"
    extraction_method: str = "hybrid"

    def to_dict(self) -> dict:
        return {
            "skills": [s.to_dict() for s in self.skills],
            "skills_by_category": self.skills_by_category,
            "all_skill_names": self.all_skill_names,
            "language": self.language,
            "extraction_method": self.extraction_method,
        }


@dataclass
class MatchResult:
    """Résultat de matching CV ↔ Offre."""
    score_global: float           # 0.0 – 100.0
    score_tfidf: float
    score_semantic: float
    score_keyword: float
    matched_skills: List[str]
    missing_skills: List[str]
    extra_skills: List[str]
    compatibility_by_category: Dict[str, float]
    recommendation: str           # "Excellent" | "Bon" | "Moyen" | "Faible"
    rank: Optional[int] = None

    def to_dict(self) -> dict:
        return asdict(self)


# ─────────────────────────────────────────────────────────────────────────────
#  UTILITAIRES TEXTE
# ─────────────────────────────────────────────────────────────────────────────

def normalize_text(text: str) -> str:
    """Normalise le texte : minuscules, accents, ponctuation."""
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s\+\#\.\/]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def detect_language(text: str) -> str:
    """Détection langue basique FR/EN."""
    fr_markers = len(re.findall(
        r"\b(le|la|les|un|une|des|je|vous|nous|avec|pour|dans|sur|et|ou|mais|donc|or|ni|car)\b",
        text.lower()
    ))
    en_markers = len(re.findall(
        r"\b(the|a|an|is|are|was|were|have|has|had|with|for|in|on|and|or|but|so)\b",
        text.lower()
    ))
    return "fr" if fr_markers >= en_markers else "en"


def get_stopwords(lang: str = "fr") -> set:
    """Stopwords FR/EN."""
    if NLTK_OK:
        try:
            return set(stopwords.words("french" if lang == "fr" else "english"))
        except Exception:
            pass
    # Fallback minimaliste
    fr = {"le","la","les","un","une","des","et","ou","mais","donc","or","ni",
          "car","ce","cet","cette","ces","mon","ma","mes","ton","ta","tes",
          "son","sa","ses","notre","votre","leur","leurs","je","tu","il","elle",
          "nous","vous","ils","elles","me","te","se","en","y","sur","dans",
          "pour","par","avec","sans","sous","après","avant","chez","de","du",
          "au","aux","a","est","sont","été","avoir","faire","que","qui","quoi",
          "dont","où","comment","pourquoi","quand","très","plus","moins","aussi",
          "bien","mal","tout","tous","même","autre","autres"}
    en = {"the","a","an","is","are","was","were","be","been","have","has","had",
          "do","does","did","will","would","could","should","may","might","shall",
          "i","you","he","she","it","we","they","me","him","her","us","them",
          "my","your","his","its","our","their","this","that","these","those",
          "in","on","at","to","for","of","with","by","from","as","into","about"}
    return fr if lang == "fr" else en


# ─────────────────────────────────────────────────────────────────────────────
#  EXTRACTEUR PDF
# ─────────────────────────────────────────────────────────────────────────────

class PDFExtractor:
    """Extrait le texte brut d'un fichier PDF."""

    @staticmethod
    def extract(source) -> str:
        """
        source : chemin (str/Path) ou bytes du fichier PDF.
        Retourne le texte brut nettoyé.
        """
        if not PDF_OK:
            raise ImportError("pdfplumber requis : pip install pdfplumber")

        if isinstance(source, (str, Path)):
            open_fn = lambda: pdfplumber.open(str(source))
        elif isinstance(source, (bytes, bytearray)):
            open_fn = lambda: pdfplumber.open(io.BytesIO(source))
        elif hasattr(source, "read"):
            raw = source.read()
            open_fn = lambda: pdfplumber.open(io.BytesIO(raw))
        else:
            raise TypeError(f"Type non supporté : {type(source)}")

        pages_text = []
        with open_fn() as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)

        raw_text = "\n".join(pages_text)
        # Nettoyage léger (garder structure)
        raw_text = re.sub(r"\n{3,}", "\n\n", raw_text)
        raw_text = re.sub(r"[ \t]+", " ", raw_text)
        logger.info(f"[PDF] {len(pages_text)} page(s) extraites — {len(raw_text)} caractères")
        return raw_text


# ─────────────────────────────────────────────────────────────────────────────
#  EXTRACTEUR DE COMPÉTENCES  (LAYER 1 + LAYER 2 + LAYER 3)
# ─────────────────────────────────────────────────────────────────────────────

class SkillExtractor:
    """
    Extraction multi-couche :
      1. Matching exact + flou sur dictionnaire (LAYER 1)
      2. spaCy NER entités ORG/MISC + tokens proches du dictionnaire (LAYER 1+)
      3. Contexte sémantique via TF-IDF sur le corpus de compétences (LAYER 2)
    """

    # Patterns contextuels signalant une compétence
    CONTEXT_PATTERNS = [
        r"(?:compétences?|skills?|technologies?|outils?|langages?|maîtrise|maitrise|"
        r"expertise|expérience|expériences?|travaillé avec|utilisé|connaissance de)"
        r"\s*[:\-–—]?\s*([^\n\.;]{3,120})",
        r"(?:formation|diplôme|master|licence|bac\+\d|ingénieur)\s+(?:en|de)\s+([^\n\.;]{3,80})",
        r"(?:certifié|certification|certif)\s*[:\-]?\s*([^\n\.;]{3,60})",
    ]

    def __init__(self, use_spacy: bool = True):
        self.nlp_fr = None
        self.nlp_en = None
        self._load_spacy(use_spacy)

    def _load_spacy(self, use_spacy: bool):
        if not SPACY_OK or not use_spacy:
            return
        for model, attr in [("fr_core_news_md", "nlp_fr"), ("en_core_web_md", "nlp_en")]:
            try:
                setattr(self, attr, spacy.load(model))
                logger.info(f"[spaCy] Modèle '{model}' chargé")
            except OSError:
                logger.warning(f"[spaCy] Modèle '{model}' introuvable "
                                f"→ python -m spacy download {model}")

    # ── Layer 1 : matching dictionnaire ──────────────────────────────────────
    def _extract_dict(self, text: str) -> Dict[str, Skill]:
        """Matching exact et flou sur le dictionnaire de compétences."""
        norm = normalize_text(text)
        found: Dict[str, Skill] = {}

        for skill in ALL_SKILLS:
            # Matching exact (mot/expression entier)
            pattern = r"\b" + re.escape(skill) + r"\b"
            matches = re.findall(pattern, norm)
            if matches:
                cat = SKILL_TO_CAT.get(skill, "Autre")
                if skill not in found:
                    found[skill] = Skill(
                        name=skill, category=cat,
                        confidence=1.0, source="dict",
                        occurrences=len(matches)
                    )
                else:
                    found[skill].occurrences += len(matches)
                continue

            # Matching flou pour compétences >4 chars (rapidfuzz si dispo)
            if FUZZY_OK and len(skill) > 4:
                for word in norm.split():
                    if len(word) > 3:
                        ratio = rfuzz.ratio(skill, word)
                        if ratio >= 88:
                            cat = SKILL_TO_CAT.get(skill, "Autre")
                            if skill not in found:
                                found[skill] = Skill(
                                    name=skill, category=cat,
                                    confidence=round(ratio / 100, 2),
                                    source="fuzzy"
                                )
        return found

    # ── Layer 1+ : extraction contextuelle par regex ──────────────────────────
    def _extract_context(self, text: str) -> Dict[str, Skill]:
        """Extrait les blocs texte après mots-clés contextuels et les scanne."""
        found: Dict[str, Skill] = {}
        for pat in self.CONTEXT_PATTERNS:
            for match in re.finditer(pat, text, re.IGNORECASE | re.MULTILINE):
                block = match.group(1)
                block_skills = self._extract_dict(block)
                for k, v in block_skills.items():
                    if k not in found:
                        v.source = "context"
                        v.confidence = min(v.confidence + 0.05, 1.0)
                        found[k] = v
        return found

    # ── Layer 1+ : spaCy NER ──────────────────────────────────────────────────
    def _extract_ner(self, text: str, lang: str) -> Dict[str, Skill]:
        """Utilise spaCy NER pour identifier entités et les valider."""
        found: Dict[str, Skill] = {}
        nlp = self.nlp_fr if lang == "fr" else self.nlp_en
        if nlp is None:
            return found

        # spaCy limite à 1 000 000 chars — on tronque
        doc = nlp(text[:100_000])
        for ent in doc.ents:
            if ent.label_ in ("ORG", "MISC", "PRODUCT"):
                candidate = ent.text.lower().strip()
                if candidate in SKILL_TO_CAT:
                    cat = SKILL_TO_CAT[candidate]
                    if candidate not in found:
                        found[candidate] = Skill(
                            name=candidate, category=cat,
                            confidence=0.85, source="ner"
                        )
        return found

    # ── Merge et agrégation ───────────────────────────────────────────────────
    def extract(self, text: str) -> ExtractedProfile:
        lang = detect_language(text)
        all_found: Dict[str, Skill] = {}

        # Layer 1 : dictionnaire
        d1 = self._extract_dict(text)
        all_found.update(d1)
        logger.info(f"[Extraction] Dict       → {len(d1)} compétences")

        # Layer 1+ : contexte
        d2 = self._extract_context(text)
        for k, v in d2.items():
            if k not in all_found:
                all_found[k] = v
            else:
                all_found[k].confidence = min(all_found[k].confidence + 0.05, 1.0)
        logger.info(f"[Extraction] Contexte   → {len(d2)} compétences")

        # Layer 1+ : spaCy NER
        d3 = self._extract_ner(text, lang)
        for k, v in d3.items():
            if k not in all_found:
                all_found[k] = v
        logger.info(f"[Extraction] NER        → {len(d3)} compétences")

        # Tri par confiance décroissante puis occurrences
        skills_list = sorted(
            all_found.values(),
            key=lambda s: (s.confidence, s.occurrences),
            reverse=True
        )

        # Groupement par catégorie
        by_cat: Dict[str, List[str]] = {}
        for s in skills_list:
            by_cat.setdefault(s.category, []).append(s.name)

        profile = ExtractedProfile(
            raw_text=text,
            skills=skills_list,
            skills_by_category=by_cat,
            all_skill_names=[s.name for s in skills_list],
            language=lang,
            extraction_method="hybrid"
        )
        logger.info(f"[Extraction] TOTAL      → {len(skills_list)} compétences uniques")
        return profile


# ─────────────────────────────────────────────────────────────────────────────
#  MATCHING ENGINE  (LAYER 2 : TF-IDF  +  LAYER 3 : Sentence-BERT)
# ─────────────────────────────────────────────────────────────────────────────

class MatchingEngine:
    """
    Calcule le score de compatibilité entre un profil candidat et une offre.

    MÉTHODES :
      - Keyword overlap     : intersection simple des ensembles de compétences
      - TF-IDF cosine       : représentation vectorielle texte (ML)
      - Sentence-BERT       : similarité sémantique (DL)

    SCORE FINAL = pondération adaptative selon couches disponibles
    """

    WEIGHTS_FULL  = {"keyword": 0.25, "tfidf": 0.35, "semantic": 0.40}
    WEIGHTS_NOTDL = {"keyword": 0.35, "tfidf": 0.65, "semantic": 0.00}
    WEIGHTS_BASE  = {"keyword": 1.00, "tfidf": 0.00, "semantic": 0.00}

    # Modèle SBERT multilingue léger, recommandé pour FR+EN
    SBERT_MODEL = "paraphrase-multilingual-MiniLM-L12-v2"

    def __init__(self, use_semantic: bool = True):
        self.sbert_model = None
        self.tfidf = None
        self._init_tfidf()
        if use_semantic:
            self._init_sbert()

    def _init_tfidf(self):
        if not SKLEARN_OK:
            return
        self.tfidf = TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 3),
            min_df=1,
            max_features=15_000,
            sublinear_tf=True,
        )
        # Pré-entraîner sur le dictionnaire de compétences (corpus interne)
        corpus = [" ".join(skills) for skills in SKILLS_DICT.values()]
        self.tfidf.fit(corpus)
        logger.info("[TF-IDF] Vectoriseur initialisé sur le corpus de compétences")

    def _init_sbert(self):
        if not SBERT_OK:
            logger.info("[SBERT] sentence-transformers non disponible → DL ignoré")
            return
        try:
            self.sbert_model = SentenceTransformer(self.SBERT_MODEL)
            logger.info(f"[SBERT] Modèle '{self.SBERT_MODEL}' chargé")
        except Exception as e:
            logger.warning(f"[SBERT] Chargement échoué : {e}")

    # ── Keyword score ─────────────────────────────────────────────────────────
    def _score_keyword(
        self,
        cv_skills: List[str],
        offer_skills: List[str]
    ) -> Tuple[float, List[str], List[str], List[str]]:
        """
        Intersection pondérée :
          - compétences requises présentes   → +1 pt
          - compétences proches (fuzzy ≥80)  → +0.6 pt
        """
        cv_set = set(normalize_text(s) for s in cv_skills)
        offer_set = set(normalize_text(s) for s in offer_skills)

        if not offer_set:
            return 0.0, [], [], list(cv_set)

        matched, missing, extra = [], [], []
        score_sum = 0.0

        for skill in offer_set:
            if skill in cv_set:
                matched.append(skill)
                score_sum += 1.0
            elif FUZZY_OK:
                best = rfprocess.extractOne(skill, list(cv_set), score_cutoff=80)
                if best:
                    matched.append(skill)
                    score_sum += 0.6
                else:
                    missing.append(skill)
            else:
                missing.append(skill)

        extra = list(cv_set - offer_set)
        score = (score_sum / len(offer_set)) * 100
        return round(score, 2), matched, missing, extra

    # ── TF-IDF score ──────────────────────────────────────────────────────────
    def _score_tfidf(self, cv_text: str, offer_text: str) -> float:
        if self.tfidf is None:
            return 0.0
        try:
            vecs = self.tfidf.transform([cv_text, offer_text])
            sim = cosine_similarity(vecs[0], vecs[1])[0][0]
            return round(float(sim) * 100, 2)
        except Exception as e:
            logger.warning(f"[TF-IDF] Erreur : {e}")
            return 0.0

    # ── Semantic score (SBERT) ────────────────────────────────────────────────
    def _score_semantic(self, cv_text: str, offer_text: str) -> float:
        if self.sbert_model is None:
            return 0.0
        try:
            embs = self.sbert_model.encode(
                [cv_text[:512], offer_text[:512]],
                convert_to_tensor=True,
                show_progress_bar=False
            )
            sim = st_util.pytorch_cos_sim(embs[0], embs[1]).item()
            # Normalisation [0,1] → [0,100]
            return round(max(0.0, float(sim)) * 100, 2)
        except Exception as e:
            logger.warning(f"[SBERT] Erreur : {e}")
            return 0.0

    # ── Compatibilité par catégorie ────────────────────────────────────────────
    def _category_scores(
        self,
        cv_profile: ExtractedProfile,
        offer_skills: List[str]
    ) -> Dict[str, float]:
        scores = {}
        offer_norm = set(normalize_text(s) for s in offer_skills)
        for cat, skills in cv_profile.skills_by_category.items():
            cat_offer = offer_norm.intersection(set(normalize_text(s) for s in skills))
            if skills:
                scores[cat] = round(len(cat_offer) / len(skills) * 100, 1)
        return scores

    # ── Recommandation textuelle ───────────────────────────────────────────────
    @staticmethod
    def _recommend(score: float) -> str:
        if score >= 80:  return "Excellent ✅"
        if score >= 60:  return "Bon 👍"
        if score >= 40:  return "Moyen ⚠️"
        return "Faible ❌"

    # ── Match principal ────────────────────────────────────────────────────────
    def match(
        self,
        cv_profile: ExtractedProfile,
        offer_skills: List[str],
        offer_description: str = ""
    ) -> MatchResult:
        """
        cv_profile      : profil extrait via SkillExtractor.extract()
        offer_skills    : liste de compétences requises par l'offre
        offer_description : texte libre de l'offre (optionnel, améliore les scores)
        """

        cv_skills_text = " ".join(cv_profile.all_skill_names)
        offer_text = offer_description + " " + " ".join(offer_skills)

        # 1. Keyword
        kw, matched, missing, extra = self._score_keyword(
            cv_profile.all_skill_names, offer_skills
        )

        # 2. TF-IDF
        tfidf = self._score_tfidf(
            cv_profile.raw_text[:3000], offer_text
        ) if SKLEARN_OK else 0.0

        # 3. Semantic (SBERT)
        semantic = self._score_semantic(
            cv_skills_text, offer_text
        ) if self.sbert_model else 0.0

        # 4. Score global pondéré
        if self.sbert_model:
            W = self.WEIGHTS_FULL
        elif SKLEARN_OK:
            W = self.WEIGHTS_NOTDL
        else:
            W = self.WEIGHTS_BASE

        score_global = (
            kw       * W["keyword"] +
            tfidf    * W["tfidf"]   +
            semantic * W["semantic"]
        )
        score_global = round(min(score_global, 100.0), 2)

        # 5. Scores par catégorie
        cat_scores = self._category_scores(cv_profile, offer_skills)

        return MatchResult(
            score_global=score_global,
            score_tfidf=tfidf,
            score_semantic=semantic,
            score_keyword=kw,
            matched_skills=matched,
            missing_skills=missing,
            extra_skills=extra[:15],       # limiter le bruit
            compatibility_by_category=cat_scores,
            recommendation=self._recommend(score_global),
        )

    # ── Ranking d'une liste de candidats ──────────────────────────────────────
    def rank_candidates(
        self,
        candidates: List[Tuple[str, ExtractedProfile]],   # (candidate_id, profile)
        offer_skills: List[str],
        offer_description: str = ""
    ) -> List[Tuple[str, MatchResult]]:
        """
        Retourne la liste triée (score décroissant) des (id, MatchResult).
        """
        results = []
        for cid, profile in candidates:
            res = self.match(profile, offer_skills, offer_description)
            results.append((cid, res))

        results.sort(key=lambda x: x[1].score_global, reverse=True)
        for i, (cid, res) in enumerate(results, 1):
            res.rank = i
        return results


# ─────────────────────────────────────────────────────────────────────────────
#  FACADE PRINCIPALE
# ─────────────────────────────────────────────────────────────────────────────

class SkillsEngine:
    """
    Point d'entrée unique pour toute l'application.

    Exemple :
        engine = SkillsEngine()
        profile = engine.extract_from_pdf("cv.pdf")
        result  = engine.match(profile, ["python", "django", "sql"])
        print(result.score_global, result.recommendation)
    """

    def __init__(self, use_spacy: bool = True, use_semantic: bool = True):
        logger.info("═══ Initialisation SkillsEngine ═══")
        self.pdf      = PDFExtractor()
        self.extractor = SkillExtractor(use_spacy=use_spacy)
        self.matcher   = MatchingEngine(use_semantic=use_semantic)
        logger.info("═══ SkillsEngine prêt ═══")

    def extract_from_pdf(self, source) -> ExtractedProfile:
        """Extrait les compétences d'un PDF (chemin, bytes ou file-like)."""
        text = PDFExtractor.extract(source)
        return self.extractor.extract(text)

    def extract_from_text(self, text: str) -> ExtractedProfile:
        """Extrait les compétences d'un texte brut."""
        return self.extractor.extract(text)

    def match(
        self,
        cv_profile: ExtractedProfile,
        offer_skills: List[str],
        offer_description: str = ""
    ) -> MatchResult:
        return self.matcher.match(cv_profile, offer_skills, offer_description)

    def rank_candidates(
        self,
        candidates: List[Tuple[str, ExtractedProfile]],
        offer_skills: List[str],
        offer_description: str = ""
    ) -> List[Tuple[str, MatchResult]]:
        return self.matcher.rank_candidates(candidates, offer_skills, offer_description)


# ─────────────────────────────────────────────────────────────────────────────
#  API FASTAPI  (exposée si démarrée via uvicorn)
# ─────────────────────────────────────────────────────────────────────────────

try:
    from fastapi import FastAPI, File, UploadFile, HTTPException, Body
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel

    app = FastAPI(
        title="ESPRIT — Skills Matching API",
        description="Extraction de compétences CV et matching avec les offres",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],        # Restreindre en production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Instance globale (chargée une seule fois au démarrage)
    _engine: Optional[SkillsEngine] = None

    def get_engine() -> SkillsEngine:
        global _engine
        if _engine is None:
            _engine = SkillsEngine()
        return _engine

    # ── Schémas Pydantic ──────────────────────────────────────────────────────

    class OfferIn(BaseModel):
        offer_id: str
        required_skills: List[str]
        description: Optional[str] = ""

    class CandidateTextIn(BaseModel):
        candidate_id: str
        cv_text: str

    class RankingRequest(BaseModel):
        candidates: List[CandidateTextIn]
        offer: OfferIn

    class MatchRequest(BaseModel):
        cv_text: str
        offer: OfferIn

    # ── Endpoints ─────────────────────────────────────────────────────────────

    @app.get("/health", tags=["Système"])
    def health():
        """Vérifie que le service est opérationnel."""
        return {
            "status": "ok",
            "layers": {
                "pdf_extraction": PDF_OK,
                "spacy_ner":      SPACY_OK and (
                    get_engine().extractor.nlp_fr is not None or
                    get_engine().extractor.nlp_en is not None
                ),
                "tfidf_ml":       SKLEARN_OK,
                "semantic_dl":    SBERT_OK and get_engine().matcher.sbert_model is not None,
            }
        }

    @app.post("/extract/pdf", tags=["Extraction"])
    async def extract_pdf(file: UploadFile = File(...)):
        """
        Upload un CV en PDF → retourne les compétences extraites.
        
        Utilisé lors du dépôt de CV par un candidat.
        """
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "Seuls les fichiers PDF sont acceptés")
        raw = await file.read()
        try:
            profile = get_engine().extract_from_pdf(raw)
            return {
                "filename": file.filename,
                "profile": profile.to_dict()
            }
        except Exception as e:
            logger.error(f"[API/extract_pdf] {e}")
            raise HTTPException(500, f"Erreur d'extraction : {str(e)}")

    @app.post("/extract/text", tags=["Extraction"])
    def extract_text(body: CandidateTextIn):
        """Extrait les compétences d'un texte brut (alternative au PDF)."""
        profile = get_engine().extract_from_text(body.cv_text)
        return {
            "candidate_id": body.candidate_id,
            "profile": profile.to_dict()
        }

    @app.post("/match", tags=["Matching"])
    def match_cv_offer(body: MatchRequest):
        """
        Calcule le score de compatibilité entre un CV (texte) et une offre.
        
        Utilisé pour afficher le % de match sur la fiche offre.
        """
        profile = get_engine().extract_from_text(body.cv_text)
        result  = get_engine().match(
            profile,
            body.offer.required_skills,
            body.offer.description or ""
        )
        return {
            "offer_id": body.offer.offer_id,
            "result": result.to_dict()
        }

    @app.post("/rank", tags=["Matching"])
    def rank_candidates(body: RankingRequest):
        """
        Classe une liste de candidats par score de compatibilité décroissant.
        
        Utilisé par le RP Chef Département pour voir les candidats triés.
        """
        candidates = [
            (c.candidate_id, get_engine().extract_from_text(c.cv_text))
            for c in body.candidates
        ]
        ranked = get_engine().rank_candidates(
            candidates,
            body.offer.required_skills,
            body.offer.description or ""
        )
        return {
            "offer_id": body.offer.offer_id,
            "total": len(ranked),
            "ranking": [
                {
                    "rank": r.rank,
                    "candidate_id": cid,
                    "score": r.score_global,
                    "recommendation": r.recommendation,
                    "matched_skills": r.matched_skills,
                    "missing_skills": r.missing_skills,
                    "details": r.to_dict(),
                }
                for cid, r in ranked
            ]
        }

    @app.get("/skills/dictionary", tags=["Référentiel"])
    def get_skills_dict():
        """Retourne le dictionnaire de compétences par catégorie."""
        return {"categories": SKILLS_DICT}

    @app.post("/skills/add", tags=["Référentiel"])
    def add_skills(category: str = Body(...), skills: List[str] = Body(...)):
        """
        Ajoute dynamiquement des compétences au dictionnaire.
        (Admin uniquement — à protéger par auth en production)
        """
        cat = category.strip()
        if cat not in SKILLS_DICT:
            SKILLS_DICT[cat] = []
        new_skills = []
        for s in skills:
            s_norm = s.lower().strip()
            if s_norm not in SKILL_TO_CAT:
                SKILLS_DICT[cat].append(s_norm)
                SKILL_TO_CAT[s_norm] = cat
                ALL_SKILLS.append(s_norm)
                new_skills.append(s_norm)
        return {"added": new_skills, "category": cat}

    FASTAPI_OK = True

except ImportError:
    FASTAPI_OK = False
    logger.warning("[WARN] FastAPI non installé — API désactivée (pip install fastapi uvicorn)")


# ─────────────────────────────────────────────────────────────────────────────
#  DÉMONSTRATION  (python skills_engine.py)
# ─────────────────────────────────────────────────────────────────────────────

def _demo():
    print("\n" + "═" * 60)
    print("  DÉMO — SkillsEngine ESPRIT")
    print("═" * 60)

    engine = SkillsEngine(use_spacy=False, use_semantic=False)

    # CV fictif
    cv_text = """
    Mohamed Ali Ben Salah
    Ingénieur Logiciel | Doctorant en Intelligence Artificielle

    Compétences techniques :
    Python, TensorFlow, PyTorch, Scikit-learn, NLP, Deep Learning,
    Django, FastAPI, React, PostgreSQL, Docker, Git, Linux

    Expériences :
    - Développeur Backend chez TechCorp (3 ans) : Python, Django, REST API
    - Chercheur en NLP : BERT, Transformers, analyse de sentiments
    - Enseignant vacataire : Python, Machine Learning, Base de données

    Langues : Français (courant), Anglais (TOEIC 850), Arabe (natif)
    """

    # Offre fictive
    offer_skills = [
        "python", "machine learning", "deep learning", "tensorflow",
        "nlp", "docker", "git", "enseignement", "pédagogie"
    ]
    offer_desc = "Poste d'enseignant-chercheur en Intelligence Artificielle"

    # Extraction
    profile = engine.extract_from_text(cv_text)
    print(f"\n📄 Compétences extraites ({len(profile.all_skill_names)}) :")
    for cat, skills in profile.skills_by_category.items():
        print(f"  [{cat}] : {', '.join(skills)}")

    # Matching
    result = engine.match(profile, offer_skills, offer_desc)
    print(f"\n🎯 SCORE GLOBAL : {result.score_global:.1f}/100  →  {result.recommendation}")
    print(f"   ├─ Keyword   : {result.score_keyword:.1f}")
    print(f"   ├─ TF-IDF    : {result.score_tfidf:.1f}")
    print(f"   └─ Sémantique: {result.score_semantic:.1f}")
    print(f"\n✅ Compétences matchées  : {result.matched_skills}")
    print(f"❌ Compétences manquantes : {result.missing_skills}")

    # Ranking multi-candidats
    print("\n" + "─" * 40)
    print("  RANKING 3 candidats")
    print("─" * 40)
    candidates_texts = [
        ("C001", cv_text),
        ("C002", "Enseignant en mathématiques. Compétences: Python, SQL, Excel, pédagogie, enseignement"),
        ("C003", "Développeur web React, Node.js, MongoDB, Docker. Débutant en ML."),
    ]
    candidates = [(cid, engine.extract_from_text(t)) for cid, t in candidates_texts]
    ranked = engine.rank_candidates(candidates, offer_skills, offer_desc)
    for cid, r in ranked:
        print(f"  #{r.rank}  {cid}  →  {r.score_global:.1f}/100  {r.recommendation}")

    print("\n" + "═" * 60)
    print("  Démarrer l'API : uvicorn skills_engine:app --reload --port 8000")
    print("═" * 60 + "\n")


if __name__ == "__main__":
    _demo()
