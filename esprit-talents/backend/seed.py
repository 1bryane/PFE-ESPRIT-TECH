"""
Seed — données fictives réalistes pour le développement.
Lance : python seed.py
"""

from datetime import date
from core.database import init_db, SessionLocal
from core.security import hash_password
from models.user import User, RoleEnum
from models.offre import Offre
from models.candidature import Candidature, StatutCandidatureEnum
from models.evaluation import Evaluation
from models.formation import Formation, Inscription, NiveauEnum, StatutInscriptionEnum
from models.notification import Notification
from models.formation_proposee import FormationProposee, StatutProposeeEnum
from models.avantage_talent import AvantageTalent

# ── Données de référence ──────────────────────────────────────────────────

# (email, password, nom, prenom, role, departement, competences, sous_role, perimetre)
USERS = [
    ("admin@esprit.tn",         "admin123",    "Admin",       "Chef",     RoleEnum.chef_admin,       "Administration", [],                                          None,                     None),
    ("direction@esprit.tn",     "dir123",      "Ben Ali",     "Sonia",    RoleEnum.direction,        "Direction",      [],                                          None,                     None),
    ("dir.etudes@esprit.tn",    "diret123",    "Saidi",       "Karim",    RoleEnum.direction_etudes, "Informatique",   [],                                          None,                     None),
    ("rdff@esprit.tn",          "rdff123",     "Mbarki",      "Anis",     RoleEnum.rdff,             "Formation",      [],                                          None,                     None),
    ("rp.chef@esprit.tn",       "rpchef123",   "Karoui",      "Syrine",   RoleEnum.rp_chef,          "Genie Civil",    [],                                          "chef_dept_genie_civil",  "Genie Civil"),
    ("rp.coord@esprit.tn",      "rpcoord123",  "Trabelsi",    "Rami",     RoleEnum.rp_coord,         "Informatique",   [],                                          "cup_systemes_distribues","Systemes Distribues"),
    ("rh@esprit.tn",            "rh123",       "Gharbi",      "Leila",    RoleEnum.chef_admin,       "RH",             [],                                          None,                     None),
    ("enseignant1@esprit.tn",   "ens123",      "Ben Salah",   "Ahmed",    RoleEnum.enseignant,       "Informatique",   ["python", "django", "sql", "git"],           None,                     "Algorithmique"),
    ("enseignant2@esprit.tn",   "ens123",      "Amri",        "Fatma",    RoleEnum.enseignant,       "Informatique",   ["react", "javascript", "html", "css"],       None,                     "Web & Mobile"),
    ("candidat1@esprit.tn",     "cand123",     "Hajji",       "Mohamed",  RoleEnum.candidat,         "Informatique",   ["python", "machine learning", "tensorflow"], None,                     None),
    ("candidat2@esprit.tn",     "cand123",     "Oueslati",    "Ines",     RoleEnum.candidat,         "Genie Civil",    ["autocad", "revit", "beton arme"],           None,                     None),
    # Nouveaux rôles organisationnels
    ("cup.algo@esprit.tn",      "cup123",      "Mansouri",    "Yassine",  RoleEnum.cup,              "Informatique",   [],                                          "cup_algorithmique",      "Algorithmique"),
    ("cup.web@esprit.tn",       "cup123",      "Jlassi",      "Rim",      RoleEnum.cup,              "Informatique",   [],                                          "cup_web",                "Web & Mobile"),
    ("chef.dept@esprit.tn",     "chef123",     "Boubaker",    "Nizar",    RoleEnum.chef_dept,        "Informatique",   [],                                          "chef_dept_informatique", "Informatique"),
    ("dir.dept.rh@esprit.tn",   "dirrh123",    "Chaouachi",   "Olfa",     RoleEnum.direction_dept,   "RH",             [],                                          "direction_rh",           "Direction RH"),
    ("dir.dept.si@esprit.tn",   "dirsi123",    "Rekik",       "Hatem",    RoleEnum.direction_dept,   "SI",             [],                                          "direction_si",           "Direction SI"),
    ("enseignant3@esprit.tn",   "ens123",      "Cherni",      "Sami",     RoleEnum.enseignant,       "Informatique",   ["java", "spring", "microservices"],          None,                     "Systemes Distribues"),
]

OFFRES = [
    {
        "titre": "Enseignant Développement Web Full Stack",
        "description": "Nous recherchons un enseignant passionné pour dispenser des cours de développement web (React, Node.js, Django).",
        "departement": "Informatique",
        "type_contrat": "CDI",
        "competences_requises": ["react", "django", "javascript", "sql", "git"],
        "nb_postes": 2,
    },
    {
        "titre": "Enseignant Intelligence Artificielle",
        "description": "Poste d'enseignant spécialisé IA/ML pour les modules de Machine Learning et Deep Learning.",
        "departement": "Informatique",
        "type_contrat": "CDI",
        "competences_requises": ["python", "tensorflow", "machine learning", "numpy", "pandas"],
        "nb_postes": 1,
    },
    {
        "titre": "Enseignant Génie Civil — Structures",
        "description": "Dispenser des cours de mécanique des structures et béton armé.",
        "departement": "Génie Civil",
        "type_contrat": "Vacataire",
        "competences_requises": ["autocad", "béton armé", "revit", "calcul des structures"],
        "nb_postes": 1,
    },
    {
        "titre": "Enseignant Cybersécurité",
        "description": "Module de sécurité des systèmes d'information et tests d'intrusion.",
        "departement": "Informatique",
        "type_contrat": "CDD",
        "competences_requises": ["cybersécurité", "réseau", "linux", "python", "ethical hacking"],
        "nb_postes": 1,
    },
    {
        "titre": "Enseignant Mathématiques Appliquées",
        "description": "Cours d'algèbre linéaire, probabilités et statistiques pour ingénieurs.",
        "departement": "Sciences",
        "type_contrat": "CDI",
        "competences_requises": ["algèbre", "probabilités", "matlab", "python"],
        "nb_postes": 2,
    },
]

FORMATIONS_REF = [
    {
        "code": "F001",
        "titre": "Python Avancé pour l'Enseignement",
        "description": "Formation destinée aux enseignants souhaitant approfondir leur maîtrise de Python pour créer des outils pédagogiques interactifs, automatiser des corrections et développer des supports de cours dynamiques.",
        "duree_semaines": 10,
        "niveau": NiveauEnum.avance,
        "badge": "Python Expert",
        "objectifs": ["Maîtriser la POO Python et les design patterns", "Créer des outils pédagogiques automatisés", "Développer des notebooks Jupyter pour l'enseignement", "Automatiser la correction et le suivi des étudiants"],
        "prerequis": ["Bases de Python (variables, fonctions, listes)", "Notions de programmation orientée objet"],
        "competences_cibles": ["Python avancé", "Jupyter Notebook", "Pandas", "Matplotlib", "Automatisation"],
        "programme": "Semaine 1-2 : Rappels POO et design patterns (Singleton, Factory, Observer)\nSemaine 3-4 : Jupyter Notebooks avancés pour l'enseignement — widgets interactifs\nSemaine 5-6 : Pandas et Matplotlib pour l'analyse des résultats étudiants\nSemaine 7-8 : Automatisation des corrections (scripts, parsing, exports PDF)\nSemaine 9-10 : Projet intégrateur — création d'un outil pédagogique complet\n\nMéthode : 50% pratique / 50% théorie. Chaque semaine inclut un mini-projet appliqué à un contexte réel d'enseignement.",
    },
    {
        "code": "F002",
        "titre": "Pédagogie Active et Méthodes Innovantes",
        "description": "Formation centrée sur les approches pédagogiques modernes : classe inversée, apprentissage par problèmes (APP), gamification et évaluation formative. Idéal pour dynamiser ses cours et renforcer l'engagement étudiant.",
        "duree_semaines": 6,
        "niveau": NiveauEnum.intermediaire,
        "badge": "Pédagogue Actif",
        "objectifs": ["Concevoir une séquence de classe inversée", "Appliquer la gamification en cours", "Mettre en place l'évaluation par compétences", "Animer des séances d'apprentissage actif"],
        "prerequis": ["Expérience minimale d'un semestre d'enseignement"],
        "competences_cibles": ["Classe inversée", "Gamification", "Évaluation formative", "APP", "Design pédagogique"],
        "programme": "Semaine 1 : Fondements de la pédagogie active — pourquoi et comment\nSemaine 2 : La classe inversée — conception et outils numériques (Kahoot, Padlet, Mentimeter)\nSemaine 3 : Apprentissage par Problèmes (APP) — scénarios et animation de groupe\nSemaine 4 : Gamification — points, badges, tableaux de bord motivants\nSemaine 5 : Évaluation par compétences — rubriques, portfolios, auto-évaluation\nSemaine 6 : Mise en pratique — chaque participant anime une séance devant ses pairs\n\nMéthode : Ateliers pratiques en groupe, mises en situation filmées avec débriefing.",
    },
    {
        "code": "F003",
        "titre": "IA pour l'Enseignement",
        "description": "Découverte et maîtrise des outils d'intelligence artificielle générative pour enrichir les pratiques pédagogiques : génération de contenus, personnalisation des parcours et assistance automatisée.",
        "duree_semaines": 8,
        "niveau": NiveauEnum.intermediaire,
        "badge": "IA Pédagogique",
        "objectifs": ["Utiliser l'IA générative pour créer des supports de cours", "Intégrer des chatbots pédagogiques dans ses modules", "Analyser des données étudiants avec des outils IA", "Respecter l'éthique de l'IA dans l'éducation"],
        "prerequis": ["Culture numérique de base", "Connaissance d'un environnement de développement (optionnel)"],
        "competences_cibles": ["ChatGPT / Claude", "Prompt engineering", "Outils No-code IA", "Analyse de données", "Éthique IA"],
        "programme": "Semaine 1-2 : Introduction à l'IA générative — LLMs, fonctionnement, limites\nSemaine 3 : Prompt engineering pour l'enseignement — générer exercices, QCM, études de cas\nSemaine 4 : Chatbots pédagogiques — création d'assistants IA pour les étudiants\nSemaine 5-6 : Analyse des données étudiants — tableaux de bord IA, prédiction du décrochage\nSemaine 7 : Éthique, plagiat et IA — comment encadrer l'usage en cours\nSemaine 8 : Projet final — intégration d'un outil IA dans un module existant\n\nMéthode : Hands-on avec accès à des outils réels. Pas de programmation requise.",
    },
    {
        "code": "F004",
        "titre": "Leadership Académique",
        "description": "Formation destinée aux enseignants souhaitant évoluer vers des postes de responsabilité (CUP, chef de département, coordinateur). Développe les compétences managériales, la conduite du changement et la gestion de projets pédagogiques.",
        "duree_semaines": 4,
        "niveau": NiveauEnum.avance,
        "badge": "Leader Académique",
        "objectifs": ["Animer et fédérer une équipe pédagogique", "Conduire un projet de réforme curriculaire", "Gérer les conflits et situations difficiles", "Communiquer efficacement avec la direction"],
        "prerequis": ["Minimum 3 ans d'expérience enseignante", "Intérêt pour la gestion ou la coordination"],
        "competences_cibles": ["Management d'équipe", "Conduite du changement", "Gestion de projet", "Communication institutionnelle", "Leadership"],
        "programme": "Semaine 1 : Leadership et styles de management — identifier son profil (test DISC)\nSemaine 2 : Piloter un projet pédagogique — outils (Gantt, OKR, rétrospective)\nSemaine 3 : Gestion des situations difficiles — conflits, démotivation, résistance au changement\nSemaine 4 : Communication et influence — présenter un projet à la direction, négocier des ressources\n\nMéthode : Études de cas réels ESPRIT, simulations de réunions, coaching individuel.",
    },
    {
        "code": "F005",
        "titre": "Recherche et Publication Académique",
        "description": "Accompagnement complet des enseignants dans leur démarche de recherche scientifique : de la conception de la problématique à la soumission dans une revue indexée (Scopus, Web of Science).",
        "duree_semaines": 12,
        "niveau": NiveauEnum.expert,
        "badge": "Chercheur ESPRIT",
        "objectifs": ["Formuler une problématique de recherche originale", "Réaliser une revue de littérature systématique", "Rédiger un article scientifique conforme aux normes", "Soumettre et répondre aux reviewers"],
        "prerequis": ["Niveau Master minimum dans sa discipline", "Maîtrise de l'anglais académique (niveau B2)", "Avoir un sujet de recherche en tête"],
        "competences_cibles": ["Méthodologie de recherche", "Rédaction scientifique", "Zotero / Mendeley", "LaTeX ou Word scientifique", "Processus éditorial"],
        "programme": "Semaine 1-2 : Identifier une niche de recherche — outils de veille (Google Scholar, Scopus)\nSemaine 3-4 : Revue de littérature systématique — PRISMA, synthèse, cartographie\nSemaine 5-6 : Méthodologie — choix de la méthode (qualitative, quantitative, mixte)\nSemaine 7-8 : Rédaction de l'article — structure IMRaD, abstract, mots-clés\nSemaine 9-10 : Choisir la revue cible, préparer la soumission (formatting, cover letter)\nSemaine 11-12 : Réponse aux reviewers, révision et resoumission\n\nMéthode : Atelier hebdomadaire + mentorat individuel avec un enseignant-chercheur senior ESPRIT.",
    },
]


def seed():
    init_db()
    db = SessionLocal()

    try:
        # ── Users ──────────────────────────────────────────────────────────
        created_users = {}
        for email, pwd, nom, prenom, role, dept, comps, sous_role, perimetre in USERS:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                u = User(
                    email           = email,
                    hashed_password = hash_password(pwd),
                    nom             = nom,
                    prenom          = prenom,
                    role            = role,
                    departement     = dept,
                    competences     = comps,
                    sous_role       = sous_role,
                    perimetre       = perimetre,
                )
                if role == RoleEnum.enseignant:
                    u.is_talent = False
                db.add(u)
                db.flush()
                created_users[email] = u
                label = f" [{sous_role}]" if sous_role else ""
                print(f"  [OK] User créé : {prenom} {nom} [{role.value}]{label}")
            else:
                # Backfill des champs ajoutés après coup (perimetre, sous_role) sans
                # écraser des valeurs déjà personnalisées pendant une démo précédente.
                changed = False
                if existing.perimetre is None and perimetre:
                    existing.perimetre = perimetre
                    changed = True
                if existing.sous_role is None and sous_role:
                    existing.sous_role = sous_role
                    changed = True
                if changed:
                    print(f"  [MAJ] Champs complétés pour {prenom} {nom} ({email})")
                created_users[email] = existing

        db.commit()

        # ── Refresh users ──────────────────────────────────────────────────
        all_users = {u.email: u for u in db.query(User).all()}
        admin = all_users.get("admin@esprit.tn")
        ens1  = all_users.get("enseignant1@esprit.tn")
        ens2  = all_users.get("enseignant2@esprit.tn")
        cand1 = all_users.get("candidat1@esprit.tn")
        cand2 = all_users.get("candidat2@esprit.tn")

        # ── Formations ─────────────────────────────────────────────────────
        for f_data in FORMATIONS_REF:
            existing = db.query(Formation).filter(Formation.code == f_data["code"]).first()
            if existing:
                # Enrichir les formations existantes avec les nouveaux champs
                for field in ("description", "prerequis", "competences_cibles", "programme", "objectifs", "badge"):
                    if field in f_data:
                        setattr(existing, field, f_data[field])
                print(f"  [UP] Formation mise à jour : {f_data['titre']}")
            else:
                f = Formation(**f_data, createur_id=admin.id if admin else None)
                db.add(f)
                print(f"  [OK] Formation créée : {f_data['titre']}")

        db.commit()

        # ── Offres ─────────────────────────────────────────────────────────
        offres_db = []
        for o_data in OFFRES:
            if not db.query(Offre).filter(Offre.titre == o_data["titre"]).first():
                o = Offre(**o_data, createur_id=admin.id if admin else None)
                db.add(o)
                db.flush()
                offres_db.append(o)
                print(f"  [OK] Offre créée : {o_data['titre']}")

        db.commit()
        offres_db = db.query(Offre).all()

        # ── Candidatures ───────────────────────────────────────────────────
        if cand1 and offres_db:
            for offre in offres_db[:2]:
                if not db.query(Candidature).filter(
                    Candidature.candidat_id == cand1.id,
                    Candidature.offre_id == offre.id
                ).first():
                    c = Candidature(candidat_id=cand1.id, offre_id=offre.id, score_ml=72.5)
                    db.add(c)
                    print(f"  [OK] Candidature : {cand1.prenom} ->{offre.titre[:40]}")

        if cand2 and offres_db:
            offre_gc = next((o for o in offres_db if "Génie Civil" in o.departement), None)
            if offre_gc:
                if not db.query(Candidature).filter(
                    Candidature.candidat_id == cand2.id,
                    Candidature.offre_id == offre_gc.id
                ).first():
                    c = Candidature(candidat_id=cand2.id, offre_id=offre_gc.id, score_ml=88.0)
                    db.add(c)
                    print(f"  [OK] Candidature : {cand2.prenom} ->{offre_gc.titre[:40]}")

        db.commit()

        # ── Évaluations ────────────────────────────────────────────────────
        rp = all_users.get("rp.chef@esprit.tn")
        if ens1 and rp:
            if not db.query(Evaluation).filter(
                Evaluation.enseignant_id == ens1.id,
                Evaluation.annee_academique == "2024-2025"
            ).first():
                ev = Evaluation(
                    enseignant_id    = ens1.id,
                    evaluateur_id    = rp.id,
                    annee_academique = "2024-2025",
                    semestre         = "S1",
                    note_pedagogie   = 16.5,
                    note_ponctualite = 18.0,
                    note_engagement  = 15.0,
                    note_innovation  = 14.5,
                    note_globale     = 16.0,
                    commentaire      = "Très bon enseignant, pédagogie claire et engagée.",
                    points_forts     = ["Clarté des explications", "Disponibilité étudiants"],
                    axes_amelioration= ["Intégrer plus d'outils numériques"],
                )
                db.add(ev)
                print(f"  [OK] Évaluation créée pour {ens1.prenom}")

        db.commit()

        # ── Notifications de bienvenue ─────────────────────────────────────
        all_db_users = db.query(User).all()
        for u in all_db_users:
            existing = db.query(Notification).filter(Notification.user_id == u.id).first()
            if not existing:
                db.add(Notification(
                    user_id=u.id,
                    title="Bienvenue sur ESPRIT Talents !",
                    body=f"Bonjour {u.prenom}, votre espace est pret. Explorez les fonctionnalites disponibles.",
                    type="success",
                    link="/",
                ))
        if cand1:
            db.add(Notification(
                user_id=cand1.id,
                title="Votre candidature est en cours d'examen",
                body="Le responsable pedagogique examine votre dossier.",
                type="info", link="/candidatures",
            ))
        if ens1:
            db.add(Notification(
                user_id=ens1.id,
                title="Nouvelle evaluation disponible",
                body="Votre evaluation S1 2024-2025 a ete publiee.",
                type="info", link="/evaluations",
            ))
        db.commit()
        print("  [OK] Notifications creees")

        # ── Inscriptions + Talent ──────────────────────────────────────────
        formations_db = db.query(Formation).all()
        if ens1 and formations_db and not db.query(Inscription).filter(Inscription.enseignant_id == ens1.id).first():
            f1 = formations_db[0]
            insc1 = Inscription(
                enseignant_id    = ens1.id,
                formation_id     = f1.id,
                statut           = StatutInscriptionEnum.termine,
                progression      = 100.0,
                note_finale      = 87.0,
                badge_obtenu     = True,
                date_inscription = date(2025, 1, 10),
                date_fin         = date(2025, 3, 20),
            )
            db.add(insc1)
            ens1.is_talent   = True
            ens1.date_talent = date(2025, 3, 20)
            # Inscription en cours pour ens2
            if ens2 and len(formations_db) > 1:
                db.add(Inscription(
                    enseignant_id    = ens2.id,
                    formation_id     = formations_db[1].id,
                    statut           = StatutInscriptionEnum.en_cours,
                    progression      = 45.0,
                    date_inscription = date(2026, 2, 1),
                ))
            db.commit()
            print("  [OK] Inscriptions + Talent crees (Ahmed est maintenant Talent)")

        # ── Formation proposee (exemple ARIA → RDFF) ──────────────────────
        PLAN_REACT = (
            "## Semaine 1 — Fondamentaux React Hooks\n"
            "- useState, useEffect : gestion de l'état et des effets de bord\n"
            "- Props et composition de composants\n"
            "- TP : mini-tableau de bord pédagogique\n\n"
            "## Semaine 2 — Gestion d'état avancée\n"
            "- Context API : partage de données à l'échelle de l'app\n"
            "- useReducer pour les états complexes\n"
            "- TP : système de notation avec Context\n\n"
            "## Semaine 3 — Intégration dans un projet pédagogique\n"
            "- Création d'un outil de suivi des étudiants (liste, filtres, progression)\n"
            "- Appels API avec axios et gestion des erreurs\n"
            "- TP : prototype fonctionnel de l'outil de suivi\n\n"
            "## Semaine 4 — Déploiement et démonstration\n"
            "- Build de production avec Vite\n"
            "- Déploiement sur Vercel ou Netlify\n"
            "- Présentation du projet devant les pairs et feedback\n\n"
            "Méthode pédagogique : 40% théorie, 60% pratique. Chaque semaine "
            "s'appuie sur un cas réel d'enseignement à ESPRIT."
        )
        prop_ex = db.query(FormationProposee).filter(FormationProposee.proposeur_id == ens2.id if ens2 else False).first() if ens2 else None
        if ens2 and not prop_ex:
            db.add(FormationProposee(
                proposeur_id   = ens2.id,
                titre          = "React.js Avancé pour l'Enseignement Moderne",
                plan_text      = PLAN_REACT,
                objectif       = "Maîtriser React.js pour créer des outils pédagogiques interactifs",
                duree_semaines = 4,
                niveau         = "avance",
                statut         = StatutProposeeEnum.en_attente,
            ))
            db.commit()
            print("  [OK] FormationProposee créée (en attente validation RDFF)")
        elif prop_ex and not prop_ex.plan_text:
            prop_ex.plan_text = PLAN_REACT
            db.commit()
            print("  [UP] FormationProposee plan_text mis à jour")

        # ── Recommandation de talent (exemple) ───────────────────────────
        from models.recommandation import RecommandationTalent, StatutRecommandationEnum
        cup1 = all_users.get("cup.algo@esprit.tn")
        ens3 = all_users.get("enseignant3@esprit.tn")
        if cup1 and ens1 and not db.query(RecommandationTalent).filter(
            RecommandationTalent.enseignant_id == ens1.id,
            RecommandationTalent.recommandant_id == cup1.id
        ).first():
            reco = RecommandationTalent(
                enseignant_id           = ens1.id,
                recommandant_id         = cup1.id,
                annee_academique        = "2024-2025",
                dim_scientifique        = 4.5,
                dim_pedagogique         = 4.8,
                dim_communicationnel    = 4.2,
                dim_comportemental      = 4.6,
                dim_autres              = 4.0,
                justif_scientifique     = "Excellente maîtrise de Python et des outils IA.",
                justif_pedagogique      = "Pédagogie claire, étudiants très satisfaits.",
                justif_communicationnel = "Communication fluide avec les étudiants et l'équipe.",
                justif_comportemental   = "Ponctuel, rigoureux, esprit d'équipe remarquable.",
                justif_autres           = "Implication dans les projets transversaux.",
                commentaire_global      = "Profil Talent exemplaire, je recommande vivement.",
                score_moyen             = 4.42,
                statut                  = StatutRecommandationEnum.en_attente,
            )
            db.add(reco)
            db.commit()
            print("  [OK] Recommandation talent créée (en attente validation RH)")

        # ── Plan de carrière (exemple) ────────────────────────────────────
        from models.plan_carriere import PlanCarriere, TypePlanEnum, StatutPlanEnum
        chef_dept1 = all_users.get("chef.dept@esprit.tn")
        if chef_dept1 and ens2 and not db.query(PlanCarriere).filter(
            PlanCarriere.enseignant_id == ens2.id
        ).first():
            plan = PlanCarriere(
                enseignant_id        = ens2.id,
                createur_id          = chef_dept1.id,
                type_plan            = TypePlanEnum.developpement_comp,
                titre                = "Montée en compétences React & Architecture Frontend",
                description          = "Renforcer les compétences frontend pour encadrer les projets étudiants.",
                formations_suggerees = ["React.js Avancé", "Architecture Micro-Frontend"],
                competences_cibles   = ["React", "TypeScript", "Tests unitaires", "Performance web"],
                statut               = StatutPlanEnum.en_cours,
                initie_par_enseignant= 0,
            )
            db.add(plan)
            db.commit()
            print("  [OK] Plan de carrière créé pour Fatma (voie B — manager)")

        # ── Distinction (exemple) ─────────────────────────────────────────
        from models.distinction import DistinctionTalent, TypeDistinctionEnum, TypeRecompenseEnum
        direction_user = all_users.get("direction@esprit.tn")
        if direction_user and ens1 and ens1.is_talent and not db.query(DistinctionTalent).filter(
            DistinctionTalent.enseignant_id == ens1.id
        ).first():
            from datetime import date as dt_date
            distinction = DistinctionTalent(
                enseignant_id     = ens1.id,
                attribueur_id     = direction_user.id,
                type_distinction  = TypeDistinctionEnum.enseignant_annee,
                description       = "Meilleur enseignant de l'année académique 2024-2025, élu par les étudiants et la direction.",
                type_recompense   = TypeRecompenseEnum.prime,
                valeur_recompense = "Prime de 500 DT",
                annee_academique  = "2024-2025",
                date_remise       = dt_date(2025, 6, 15),
            )
            db.add(distinction)
            db.commit()
            print("  [OK] Distinction 'Enseignant de l'Année' attribuée à Ahmed")

        # ── Avantages Talents (seed initial) ──────────────────────────────
        if not db.query(AvantageTalent).first():
            for a in [
                {"categorie": "Financier",      "libelle": "Bonus sur performance annuelle"},
                {"categorie": "Financier",      "libelle": "Prime de reconnaissance Talent"},
                {"categorie": "Carriere",       "libelle": "Acces aux postes de responsabilite"},
                {"categorie": "Carriere",       "libelle": "Charge de missions strategiques"},
                {"categorie": "Opportunite",    "libelle": "Benefice d'opportunites de publication"},
                {"categorie": "Reconnaissance", "libelle": "Distinction institutionnelle ESPRIT"},
                {"categorie": "Reconnaissance", "libelle": "Profil mis en avant sur la plateforme"},
            ]:
                db.add(AvantageTalent(**a))
            db.commit()
            print("  [OK] Avantages Talents initialises")

        print("\n  [DONE] Seed termine avec succes !")

    except Exception as e:
        db.rollback()
        print(f"\n  [ERR] Erreur seed : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "═" * 55)
    print("  ESPRIT Talents — Initialisation des données de test")
    print("═" * 55)
    seed()
    print("═" * 55 + "\n")
