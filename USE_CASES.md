# Cas d'Utilisation — ESPRIT Talents
## Comparaison Avant / Après nouvelles spécifications maître de stage

> **Légende :**
> - ✅ Inchangé
> - 🆕 Nouveau
> - ✏️ Modifié / enrichi
> - ➕ Cas additionnel (complète sans remplacer)
> - 🗑️ Supprimé / déprécié

---

## TABLE DES MATIÈRES

1. [Acteurs](#acteurs)
2. [UC — Candidat](#uc--candidat)
3. [UC — Enseignant](#uc--enseignant)
4. [UC — Talent](#uc--talent)
5. [UC — RP Coordinateur (rp_coord)](#uc--rp-coordinateur-rp_coord)
6. [UC — RP Chef de Département (rp_chef)](#uc--rp-chef-de-département-rp_chef)
7. [UC — RDFF](#uc--rdff)
8. [UC — Chef Admin / RH (chef_admin)](#uc--chef-admin--rh-chef_admin)
9. [UC — Direction des Études (direction_etudes)](#uc--direction-des-études-direction_etudes)
10. [UC — Direction Générale (direction)](#uc--direction-générale-direction)
11. [🆕 UC — CUP (cup)](#-uc--cup-cup)
12. [🆕 UC — Chef de Département pédagogique (chef_dept)](#-uc--chef-de-département-pédagogique-chef_dept)
13. [🆕 UC — Direction Département fonctionnel (direction_dept)](#-uc--direction-département-fonctionnel-direction_dept)
14. [Synthèse chiffrée](#synthèse-chiffrée)

---

## ACTEURS

### Avant

| ID Acteur | Rôle Système | Désignation |
|-----------|-------------|-------------|
| A-01 | `candidat` | Candidat au stage |
| A-02 | `enseignant` | Enseignant ESPRIT |
| A-03 | `talent` | Enseignant promu Talent |
| A-04 | `rp_coord` | RP Coordinateur (gestion offres) |
| A-05 | `rp_chef` | RP Chef de département recrutement |
| A-06 | `rdff` | Responsable Développement Formation |
| A-07 | `chef_admin` | Chef Admin / DRH |
| A-08 | `direction_etudes` | Direction des Études |
| A-09 | `direction` | Direction Générale |

### Après

| ID Acteur | Rôle Système | Désignation | Statut |
|-----------|-------------|-------------|--------|
| A-01 | `candidat` | Candidat au stage | ✅ |
| A-02 | `enseignant` | Enseignant ESPRIT | ✅ |
| A-03 | `talent` | Enseignant promu Talent | ✅ |
| A-04 | `rp_coord` | RP Coordinateur (rétro-compat. → `cup`) | ✅ (conservé) |
| A-05 | `rp_chef` | RP Chef (rétro-compat. → `chef_dept`) | ✅ (conservé) |
| A-06 | `rdff` | Responsable Développement Formation | ✅ |
| A-07 | `chef_admin` | Chef Admin / DRH | ✅ |
| A-08 | `direction_etudes` | Direction des Études | ✅ |
| A-09 | `direction` | Direction Générale | ✅ |
| **A-10** | `cup` | **Coordinateur d'Unité Pédagogique** | 🆕 |
| **A-11** | `chef_dept` | **Chef de Département pédagogique ou support** | 🆕 |
| **A-12** | `direction_dept` | **Directeur d'une direction fonctionnelle** (10 directions) | 🆕 |
| **A-13** | `responsable` | **Responsable** (Centre Carrière, Partenariats, Options…) | 🆕 |
| **A-14** | `cps` | **Coordinateur Pédagogique des Stages** | 🆕 |
| **A-15** | `charge_mission` | **Chargé de Mission** (DG) | 🆕 |

---

## UC — Candidat

> **Qui est le Candidat ?**
> Le rôle `candidat` désigne une **personne externe qui postule à un poste d'enseignant chez ESPRIT** via un appel à candidatures publié sur la plateforme. Ce n'est pas un étudiant en stage : c'est un futur enseignant en cours de recrutement. Une fois sa candidature acceptée par un RP, son compte bascule automatiquement au rôle `enseignant`.
>
> Ces cas d'utilisation ne sont **pas impactés** par les nouvelles spécifications (module talent, recommandations, distinctions).

| ID | Intitulé | Acteur | Précondition | Résultat attendu | Statut |
|----|---------|--------|-------------|-----------------|--------|
| UC-C01 | S'inscrire sur la plateforme | Candidat | — | Compte créé, rôle `candidat` attribué | ✅ |
| UC-C02 | Se connecter | Candidat | Compte existant | JWT valide, redirection vers les offres | ✅ |
| UC-C03 | Consulter les offres de recrutement disponibles | Candidat | Connecté | Liste des offres filtrables | ✅ |
| UC-C04 | Postuler à une offre avec CV | Candidat | Offre ouverte | Candidature créée, score ML calculé automatiquement | ✅ |
| UC-C05 | Suivre le statut de ses candidatures | Candidat | ≥ 1 candidature | Statuts (soumise / en_cours / entretien / acceptée / refusée) | ✅ |
| UC-C06 | Compléter son profil (compétences, CV) | Candidat | Connecté | Profil mis à jour, rematching possible | ✅ |
| UC-C07 | Consulter les retours sur sa candidature | Candidat | Candidature traitée | Feedback affiché si disponible | ✅ |
| UC-C08 | Recevoir des notifications en temps réel | Candidat | Connecté | Badge notification + messages | ✅ |

---

## UC — Enseignant

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-E01 | Se connecter | Compte enseignant | JWT valide, redirection `/dashboard` |
| UC-E02 | Consulter son tableau de bord | Connecté | Stats évaluations, formations, score global |
| UC-E03 | Consulter ses évaluations | Connecté | Notes par dimension + globale |
| UC-E04 | Consulter les formations disponibles | Connecté | Catalogue formations avec niveaux |
| UC-E05 | S'inscrire à une formation | Connecté | Inscription créée, statut `inscrit` |
| UC-E06 | Interagir avec ARIA (chat + plan de formation) | Connecté | Réponse LLM contextualisée, PDF téléchargeable |
| **UC-E07** | **Demander lui-même le statut Talent (auto-demande)** | Badge formation obtenu | Demande soumise à validation RH uniquement |
| UC-E08 | Consulter ses notifications | Connecté | Liste chronologique |
| UC-E09 | Accéder au chat collaboratif | Connecté | Messagerie temps réel |

### Après

| ID | Intitulé | Précondition | Résultat attendu | Statut |
|----|---------|-------------|-----------------|--------|
| UC-E01 | Se connecter | Compte enseignant | JWT valide, redirection `/dashboard` | ✅ |
| UC-E02 | Consulter son tableau de bord | Connecté | Stats évaluations, formations, score global | ✅ |
| UC-E03 | Consulter ses évaluations | Connecté | Notes par dimension + globale (incl. scientifique, communicationnel) | ✏️ |
| UC-E04 | Consulter les formations disponibles | Connecté | Catalogue formations avec niveaux | ✅ |
| UC-E05 | S'inscrire à une formation | Connecté | Inscription créée, statut `inscrit` | ✅ |
| UC-E06 | Interagir avec ARIA (chat + questions) | Connecté | Réponse LLM contextualisée (RAG + mémoire) | ✅ |
| **UC-E07** | **Demander lui-même le statut Talent (auto-demande)** | Badge formation obtenu | Demande soumise à validation **RH uniquement** | ✏️ |
| UC-E08 | Consulter ses notifications | Connecté | Liste chronologique | ✅ |
| UC-E09 | Accéder au chat collaboratif | Connecté | Messagerie temps réel | ✅ |
| **UC-E10** | **Recevoir une recommandation officielle multi-dimensionnelle** | Un CUP / Chef dept / Direction a soumis une recommandation | Notification reçue + accès au détail des 5 dimensions (scientifique, pédagogique, communicationnel, comportemental, autre) | ➕ 🆕 |
| **UC-E11** | **Consulter ses recommandations reçues** | ≥ 1 recommandation soumise | Historique des recommandations avec scores, justifications et statut (en_attente / validée / refusée) | 🆕 |
| **UC-E12** | **Soumettre une demande de plan de carrière** | Connecté | Demande créée (type choisi, objectif décrit, formations souhaitées) ; mise en attente d'approbation du manager | 🆕 |
| **UC-E13** | **Consulter son plan de carrière** | Plan approuvé par un manager (voie A) ou proposé par un manager (voie B) | Visualisation type, formations suggérées, compétences cibles, échéance, statut et notes de suivi | 🆕 |
| **UC-E14** | **Demander à ARIA un plan de formation personnalisé (hors catalogue)** | Formation souhaitée absente du catalogue | ARIA génère un PDF personnalisé basé sur le profil de l'enseignant ; PDF téléchargeable et soumissible au RDFF | 🆕 |
| **UC-E15** | **Consulter ses distinctions** | ≥ 1 distinction attribuée | Badge / récompense avec type (Enseignant de l'Année, etc.), description, date remise | 🆕 |
| **UC-E16** | **Consulter ses avantages Talent actifs** | Statut Talent | Liste avantages (Financier / Carrière / Opportunité / Reconnaissance) | ✅ (était implicite) |

> **Note — Prérequis Talent :** L'enseignant doit avoir terminé au moins une formation du catalogue **avec badge de validation** (attribué par le RDFF) avant de pouvoir accéder au statut Talent, quelle que soit la voie.
>
> **Note — UC-E07 vs UC-E10 :** Ces deux voies coexistent et ne se remplacent pas.
> - UC-E07 : l'enseignant s'auto-propose → validé par **RH uniquement**
> - UC-E10 : un CUP / Chef dept / Direction soumet une recommandation → validé par **RH uniquement**
>
> **Note — Plan de carrière bidirectionnel :**
> - **Voie A (enseignant initie — UC-E12)** : `EN ATTENTE` → manager approuve → `EN COURS` → `RÉALISÉ / ABANDONNÉ`
> - **Voie B (manager propose)** : directement `EN COURS` → `RÉALISÉ / ABANDONNÉ`

---

## UC — Talent

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-T01 | Accéder aux avantages Talent | Statut `talent` | Liste des avantages actifs par catégorie |
| UC-T02 | Consulter son profil enrichi | Statut `talent` | Profil + badge Talent + historique formations |
| UC-T03 | Proposer une formation au RDFF via ARIA | Statut `talent` | Proposition soumise, visible RDFF |
| UC-T04 | Interagir avec ARIA (fonctionnalités étendues) | Statut `talent` | Outils ARIA supplémentaires disponibles |

### Après

| ID | Intitulé | Précondition | Résultat attendu | Statut |
|----|---------|-------------|-----------------|--------|
| UC-T01 | Accéder aux avantages Talent | Statut `talent` | Liste des avantages actifs par catégorie | ✅ |
| UC-T02 | Consulter son profil enrichi | Statut `talent` | Profil + badge Talent + historique formations + distinctions | ✏️ |
| UC-T03 | Proposer une formation au RDFF via ARIA | Statut `talent` | Proposition soumise, visible RDFF | ✅ |
| UC-T04 | Interagir avec ARIA (fonctionnalités étendues) | Statut `talent` | Outils ARIA supplémentaires disponibles | ✅ |
| **UC-T05** | **Consulter ses distinctions et récompenses** | ≥ 1 distinction | Détail type distinction, type récompense (avantage en nature / prime / reconnaissance), année académique | 🆕 |
| **UC-T06** | **Consulter ses plans de carrière** | ≥ 1 plan créé | Visualisation plans par type avec statut (en_attente / en_cours / réalisé / abandonné / refusé) | 🆕 |

---

## UC — RP Coordinateur (rp_coord)

> Le rôle `rp_coord` est conservé pour rétro-compatibilité. Les nouvelles fonctions sont portées par `cup`.

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-RP01 | Créer une offre de stage | Connecté `rp_coord` | Offre créée avec compétences requises |
| UC-RP02 | Consulter les candidats d'une offre | Offre existante | Liste candidats avec scores ML |
| UC-RP03 | Voir le score ML de chaque candidat | Candidatures soumises | Score matching affiché + classement |
| UC-RP04 | Changer le statut d'une candidature | Candidature soumise | Statut mis à jour, notification candidat |
| UC-RP05 | Consulter le profil détaillé d'un candidat | Candidature existante | Profil, CV, compétences extraites |

### Après

| ID | Intitulé | Précondition | Résultat attendu | Statut |
|----|---------|-------------|-----------------|--------|
| UC-RP01 | Créer une offre de stage | Connecté `rp_coord` | Offre créée avec compétences requises | ✅ |
| UC-RP02 | Consulter les candidats d'une offre | Offre existante | Liste candidats avec scores ML | ✅ |
| UC-RP03 | Voir le score ML de chaque candidat | Candidatures soumises | Score matching affiché + classement | ✅ |
| UC-RP04 | Changer le statut d'une candidature | Candidature soumise | Statut mis à jour, notification candidat | ✅ |
| UC-RP05 | Consulter le profil détaillé d'un candidat | Candidature existante | Profil, CV, compétences extraites | ✅ |

---

## UC — RP Chef de Département (rp_chef)

> Le rôle `rp_chef` est conservé pour rétro-compatibilité. Les nouvelles fonctions managériales sont portées par `chef_dept`.

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-RC01 | Accéder au tableau de bord Chef | Connecté `rp_chef` | Vue agrégée offres, candidatures, stats |
| UC-RC02 | Superviser les offres et candidatures | Connecté | Vue complète toutes offres du département |
| UC-RC03 | Voir les statistiques recrutement | Connecté | KPIs : taux acceptation, délai traitement |
| UC-RC04 | Gérer ses propres formations (héritage enseignant) | Connecté | Accès formations personnelles |
| UC-RC05 | Consulter les évaluations de son département | Connecté | Évaluations filtrées par périmètre |

### Après (inchangé)

| ID | Intitulé | Statut |
|----|---------|--------|
| UC-RC01 | Accéder au tableau de bord Chef | ✅ |
| UC-RC02 | Superviser les offres et candidatures | ✅ |
| UC-RC03 | Voir les statistiques recrutement | ✅ |
| UC-RC04 | Gérer ses propres formations | ✅ |
| UC-RC05 | Consulter les évaluations de son département | ✅ |

---

## UC — RDFF

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-R01 | Consulter les formations proposées par les Talents | Connecté `rdff` | Liste propositions avec auteur, description |
| UC-R02 | Valider ou refuser une proposition de formation | Proposition `en_attente` | Statut mis à jour, notification Talent |
| UC-R03 | Créer / modifier des formations officielles | Connecté | Formation créée dans le catalogue |
| UC-R04 | Gérer les inscriptions aux formations | Connecté | Vue inscriptions par formation |

### Après (inchangé)

| ID | Intitulé | Statut |
|----|---------|--------|
| UC-R01 | Consulter les formations proposées par les Talents | ✅ |
| UC-R02 | Valider ou refuser une proposition de formation | ✅ |
| UC-R03 | Créer / modifier des formations officielles | ✅ |
| UC-R04 | Gérer les inscriptions aux formations | ✅ |

---

## UC — Chef Admin / RH (chef_admin)

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-A01 | Accéder au tableau de bord RH/Recrutement | Connecté `chef_admin` | Vue globale recrutement + RH |
| UC-A02 | Voir toutes les offres et candidatures | Connecté | Vue complète multi-département |
| UC-A03 | Gérer les utilisateurs et leurs rôles | Connecté | CRUD utilisateurs, attribution de rôles |
| UC-A04 | Consulter les statistiques globales | Connecté | KPIs plateforme (enseignants, talents, offres…) |
| UC-A05 | Valider ou refuser les demandes de statut Talent | Demande `en_attente` | Statut validé/refusé, notification enseignant |
| UC-A06 | Gérer les avantages Talent (CRUD) | Connecté | Avantages créés/modifiés/supprimés par catégorie |

### Après

| ID | Intitulé | Précondition | Résultat attendu | Statut |
|----|---------|-------------|-----------------|--------|
| UC-A01 | Accéder au tableau de bord RH/Recrutement | Connecté `chef_admin` | Vue globale recrutement + RH | ✅ |
| UC-A02 | Voir toutes les offres et candidatures | Connecté | Vue complète multi-département | ✅ |
| UC-A03 | Gérer les utilisateurs et leurs rôles | Connecté | CRUD utilisateurs, attribution rôles + `sous_role` + `perimetre` | ✏️ |
| UC-A04 | Consulter les statistiques globales | Connecté | KPIs plateforme (enseignants, talents, offres…) | ✅ |
| UC-A05 | Valider ou refuser les demandes de statut Talent (auto-demande) | Demande `en_attente` | Statut validé/refusé, notification enseignant | ✅ |
| UC-A06 | Gérer les avantages Talent (CRUD) | Connecté | Avantages créés/modifiés/supprimés par catégorie | ✅ |
| **UC-A07** | **Valider ou refuser les recommandations de talent** | Recommandation `en_attente` | Statut mis à jour (validée / refusée), notification enseignant et recommandant — **seul le RH peut prendre cette décision** | 🆕 |
| **UC-A08** | **Attribuer une distinction à un Talent** | Talent validé | Distinction créée (type, récompense, année académique), notification enseignant | 🆕 |
| **UC-A09** | **Proposer un plan de carrière à un enseignant (voie B)** | Connecté, enseignant cible | Plan créé et envoyé directement en `en_cours` ; enseignant notifié | 🆕 |
| **UC-A10** | **Approuver ou refuser une demande de plan de carrière (voie A)** | Demande enseignant `en_attente` | Statut → `en_cours` si accepté / `refusé` sinon ; enseignant notifié | 🆕 |
| **UC-A11** | **Consulter toutes les recommandations** | Connecté | Liste filtrée par statut / enseignant / année | 🆕 |

---

## UC — Direction des Études (direction_etudes)

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-DE01 | Accéder au tableau de bord Direction des Études | Connecté `direction_etudes` | Vue pédagogique globale |
| UC-DE02 | Consulter les évaluations pédagogiques | Connecté | Évaluations de tous les enseignants |
| UC-DE03 | Superviser les formations | Connecté | Catalogue + inscriptions |
| UC-DE04 | Voir les statistiques enseignants / talents | Connecté | KPIs pédagogiques |

### Après

| ID | Intitulé | Précondition | Résultat attendu | Statut |
|----|---------|-------------|-----------------|--------|
| UC-DE01 | Accéder au tableau de bord Direction des Études | Connecté `direction_etudes` | Vue pédagogique globale | ✅ |
| UC-DE02 | Consulter les évaluations pédagogiques | Connecté | Évaluations de tous les enseignants (incl. note_scientifique, note_communicationnel) | ✏️ |
| UC-DE03 | Superviser les formations | Connecté | Catalogue + inscriptions | ✅ |
| UC-DE04 | Voir les statistiques enseignants / talents | Connecté | KPIs pédagogiques | ✅ |
| **UC-DE05** | **Soumettre une recommandation de talent** | Enseignant éligible identifié | Recommandation 5 dimensions créée, envoyée en validation | 🆕 |
| **UC-DE06** | **Consulter toutes les recommandations pédagogiques** | Connecté | Liste recommandations de son périmètre | 🆕 |

---

## UC — Direction Générale (direction)

### Avant

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-DG01 | Accéder au tableau de bord Direction Générale | Connecté `direction` | Vue stratégique KPIs |
| UC-DG02 | Voir les KPIs globaux plateforme | Connecté | Statistiques enseignants, talents, formations, offres |
| UC-DG03 | Gérer les avantages Talent (CRUD complet) | Connecté | CRUD avantages toutes catégories |
| UC-DG04 | Valider les demandes de statut Talent | Demande `en_attente` | Validation finale, enseignant promu Talent |
| UC-DG05 | Consulter tous les profils enseignants / talents | Connecté | Vue complète RH enseignants |

### Après

> **Périmètre Direction Générale :** La DG a une vision stratégique et attribue les distinctions. La **validation du grade Talent** (auto-demande ou recommandation) appartient **exclusivement au RH (chef_admin)**.

| ID | Intitulé | Précondition | Résultat attendu | Statut |
|----|---------|-------------|-----------------|--------|
| UC-DG01 | Accéder au tableau de bord Direction Générale | Connecté `direction` | Vue stratégique KPIs | ✅ |
| UC-DG02 | Voir les KPIs globaux plateforme | Connecté | Statistiques enseignants, talents, formations, offres + recommandations + distinctions | ✏️ |
| UC-DG03 | Gérer les avantages Talent (CRUD complet) | Connecté | CRUD avantages toutes catégories | ✅ |
| UC-DG04 | Consulter tous les profils enseignants / talents | Connecté | Vue complète RH enseignants + distinctions + plans carrière | ✏️ |
| **UC-DG05** | **Attribuer une distinction à un Talent** | Talent validé (par RH) | Distinction créée : type (Enseignant de l'Année, Responsable Résilient, Challenge de l'Année, Innovation Pédagogique, Publication Excellente, Autre), récompense (avantage en nature / prime / reconnaissance), année académique | 🆕 |
| **UC-DG06** | **Proposer un plan de carrière stratégique (voie B)** | Connecté | Plan type (poste_pédagogique / responsabilité_mgt / développement_comp / projet) avec formations suggérées (ARIA optionnel) | 🆕 |
| **UC-DG07** | **Approuver ou refuser une demande de plan de carrière (voie A)** | Demande enseignant `en_attente` | Statut → `en_cours` ou `refusé` ; enseignant notifié | 🆕 |
| **UC-DG08** | **Consulter le mur des lauréats** | Connecté | Liste des distinctions par année académique, filtrable par type | 🆕 |
| **UC-DG09** | **Organiser et enregistrer un rituel de célébration** | Distinction créée | Événement de remise enregistré (date_remise, description) | 🆕 |
| **UC-DG10** | **Soumettre une recommandation de talent** | Enseignant identifié | Recommandation 5 dimensions soumise → transmise au RH pour validation | 🆕 |

---

## 🆕 UC — CUP (cup)

> Coordinateur d'Unité Pédagogique — responsable d'une unité (ex : Algorithmique, Web, Java…). Gère entre 3 et 7 enseignants.

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-CUP01 | Se connecter et accéder au tableau de bord CUP | Compte `cup` | Tableau de bord avec enseignants de l'unité, évaluations, notifications |
| UC-CUP02 | Consulter les enseignants de son unité pédagogique | Connecté, `perimetre` défini | Liste enseignants de l'unité avec scores et statut |
| UC-CUP03 | Soumettre une recommandation de talent (5 dimensions) | Enseignant de son unité éligible | Recommandation créée avec scores /5 et justifications texte pour chaque dimension (scientifique, pédagogique, communicationnel, comportemental, autre), envoyée en validation |
| UC-CUP04 | Consulter les recommandations soumises | Connecté | Liste de ses recommandations avec statut (en_attente / validée / refusée) |
| UC-CUP05 | Consulter les évaluations des enseignants de son unité | Connecté | Évaluations filtrées par périmètre unité |
| UC-CUP06 | Recevoir les notifications de décision | Recommandation traitée | Notification statut validation + commentaire validateur |
| **UC-CUP07** | **Attribuer une note à un enseignant de son unité pédagogique** | Enseignant appartenant à l'unité du CUP | Évaluation créée (notes par dimension : pédagogie, ponctualité, engagement, innovation, scientifique, communicationnel) ; score global de l'enseignant recalculé ; notification envoyée à l'enseignant |

---

## 🆕 UC — Chef de Département pédagogique (chef_dept)

> Responsable d'un département (ex : Informatique, Télécommunications, Génie Civil…). Supervise plusieurs CUP et enseignants.

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-CD01 | Se connecter et accéder au tableau de bord Chef de Département | Compte `chef_dept` | Vue agrégée département : enseignants, évaluations, recommandations, plans carrière |
| UC-CD02 | Consulter les enseignants de son département | Connecté, `perimetre` défini | Liste complète avec scores, statut Talent, distinctions |
| UC-CD03 | Soumettre une recommandation de talent (5 dimensions) | Enseignant du département éligible | Recommandation créée avec 5 dimensions scorées et justifiées |
| UC-CD04 | Superviser les recommandations soumises par les CUP de son département | Connecté | Vue consolidée recommandations (par CUP + par le chef lui-même) |
| UC-CD05 | Proposer un plan de carrière à un enseignant (voie B) | Connecté | Plan créé (poste_pédagogique / responsabilité_mgt / développement_comp / projet), formations suggérées, compétences cibles, échéance ; envoyé directement en `en_cours` |
| UC-CD06 | Approuver ou refuser une demande de plan de carrière (voie A) | Demande enseignant `en_attente` | Statut → `en_cours` si accepté / `refusé` sinon ; enseignant notifié |
| UC-CD07 | Consulter les évaluations pédagogiques de son département | Connecté | Évaluations filtrées département, vue globale dimensions |
| UC-CD08 | Mettre à jour le statut d'un plan de carrière | Plan `en_cours` | Statut mis à jour (`en_cours` → `réalisé` / `abandonné`), notes de suivi ajoutées |
| UC-CD09 | Recevoir les notifications de validation de recommandations | Recommandation traitée | Notification avec décision du RH |
| **UC-CD10** | **Attribuer une note à un enseignant de son département** | Enseignant appartenant au département du Chef | Évaluation créée (mêmes dimensions que UC-CUP07) ; score global recalculé ; notification envoyée à l'enseignant |

---

## 🆕 UC — Direction Département fonctionnel (direction_dept)

> Directeur d'une des 10 directions fonctionnelles d'ESPRIT (ex : Direction Financière, Direction RH, Direction SI, Direction des Relations Extérieures…). Chaque direction a son périmètre (`sous_role` = `direction_financiere`, `direction_rh`, etc.).

| ID | Intitulé | Précondition | Résultat attendu |
|----|---------|-------------|-----------------|
| UC-DD01 | Se connecter et accéder au tableau de bord de sa direction | Compte `direction_dept` | Dashboard personnalisé au périmètre de la direction (KPIs de sa direction) |
| UC-DD02 | Consulter les KPIs de sa direction fonctionnelle | Connecté | Indicateurs spécifiques à la direction (RH → masse salariale enseignants, SI → utilisation plateforme, etc.) |
| UC-DD03 | Soumettre une recommandation de talent (depuis sa direction) | Enseignant identifié | Recommandation 5 dimensions soumise → transmise au RH (chef_admin) pour validation |
| UC-DD04 | Consulter les recommandations soumises par sa direction | Connecté | Liste recommandations émises par la direction |
| UC-DD05 | Consulter les distinctions de son périmètre | Connecté | Distinctions attribuées aux enseignants liés à sa direction |
| UC-DD06 | Accéder au chat collaboratif | Connecté | Messagerie avec les autres acteurs de la plateforme |

---

> **Note — Rôles hors périmètre gestion des talents :**
> Les rôles `responsable`, `cps` et `charge_mission` font partie de l'organigramme ESPRIT et sont présents dans le système (`RoleEnum`), mais **n'interviennent pas dans la gestion des talents enseignants**. Leurs cas d'utilisation propres (gestion de centre, coordination de stages, missions DG) sont hors périmètre de ce document.

---

## Synthèse chiffrée

### Cas d'utilisation par acteur

| Acteur | Avant | Après | Delta | Remarque |
|--------|-------|-------|-------|---------|
| Candidat | 8 | 8 | = | |
| Enseignant | 9 | 16 | **+7** | +ARIA hors catalogue, +plan carrière voie A, +recommandations |
| Talent | 4 | 6 | **+2** | +distinctions, +plans carrière |
| RP Coordinateur | 5 | 5 | = | |
| RP Chef | 5 | 5 | = | |
| RDFF | 4 | 4 | = | |
| Chef Admin / RH | 6 | 11 | **+5** | Seul validateur Talent (auto-demande + recommandations) |
| Direction des Études | 4 | 6 | **+2** | +recommandations |
| Direction Générale | 5 | 10 | **+5** | Validation Talent retirée (appartient au RH) |
| CUP | — | 7 | **+7** 🆕 | |
| Chef de Département (chef_dept) | — | 10 | **+10** 🆕 | |
| Direction Département | — | 6 | **+6** 🆕 | |
| **TOTAL** | **50** | **94** | **+44** | |

### Acteurs

| | Avant | Après |
|-|-------|-------|
| Acteurs système | 9 | 15 (+6) |
| Rôles `RoleEnum` | 9 | 15 (+6, rétro-compat.) |

### Nouveaux modèles introduits

| Modèle | Table | Description |
|--------|-------|-------------|
| `RecommandationTalent` | `recommandations_talent` | Recommandation multi-dimensionnelle (5 dimensions scorées + justifiées) |
| `PlanCarriere` | `plans_carriere` | Plans d'évolution et de développement des compétences |
| `DistinctionTalent` | `distinctions_talent` | Distinctions / récompenses avec rituels de célébration |

### Note sur UC-E07 (clarification)

```
AVANT :  UC-E07 → Enseignant demande lui-même le statut Talent (auto-demande)
APRÈS :  UC-E07 → IDENTIQUE (auto-demande conservée, INCHANGÉE)
         UC-E10 → NOUVEAU : Recevoir une recommandation officielle multi-dimensionnelle
                            d'un CUP / Chef de département / Direction
```

**Ces deux voies sont additives.** Un enseignant peut :
1. Demander lui-même → via `POST /evaluations/demande-talent` (endpoint existant)
2. Être recommandé par un tiers → via `POST /recommandations` (nouveau endpoint)

Les deux flux aboutissent à une validation par le **RH (chef_admin) uniquement**, qui décide du statut Talent final.


*ESPRIT Talents PFE*  
*document de référence uniquement*
