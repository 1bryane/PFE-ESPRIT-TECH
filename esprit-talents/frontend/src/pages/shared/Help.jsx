import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// ── Données complètes par rôle ─────────────────────────────────────────────

const HELP_DATA = {
  candidat: {
    label: 'Candidat',
    color: '#3b82f6',
    emoji: '👨‍🎓',
    description: 'Vous êtes en phase de candidature. Votre objectif est de créer votre profil, uploader votre CV et postuler aux offres ESPRIT. Une fois accepté(e), vous devenez enseignant(e).',

    peux: [
      {
        titre: 'Créer et compléter mon profil',
        icon: '👤', lien: '/profil',
        description: 'Renseignez vos informations personnelles, téléchargez une photo et uploadez votre CV PDF.',
        steps: [
          'Allez dans "Mon Profil" dans le menu gauche',
          'Remplissez vos informations (prénom, nom, spécialité, téléphone)',
          'Cliquez sur le "+" à côté de votre avatar pour changer la photo',
          'Dans la section CV, cliquez "Uploader mon CV (PDF)"',
          'Vos compétences sont extraites automatiquement par notre IA de matching',
        ],
        tip: 'Un CV bien rempli augmente votre score de compatibilité avec les offres.',
      },
      {
        titre: 'Consulter les offres disponibles',
        icon: '📋', lien: '/offres',
        description: 'Toutes les offres ouvertes dans votre département sont affichées avec les compétences requises.',
        steps: [
          'Allez dans "Offres" dans le menu',
          'Les offres sont filtrées automatiquement par votre département',
          'Chaque carte montre : titre, type de contrat, compétences requises',
          'Le badge vert "En cours" indique une offre ouverte',
        ],
        tip: 'Si votre CV est uploadé, les tags de compétences en rouge indiquent celles que vous avez déjà.',
      },
      {
        titre: 'Postuler à une offre',
        icon: '📨', lien: '/offres',
        description: 'Candidatez en un clic avec une lettre de motivation optionnelle.',
        steps: [
          'Sur une offre ouverte, cliquez "Postuler"',
          'Une fenêtre s\'ouvre — rédigez une lettre de motivation (optionnel)',
          'Cliquez "Confirmer"',
          'Votre score de compatibilité est calculé automatiquement par l\'IA',
          'Vous recevrez une notification et un email à chaque changement de statut',
        ],
        tip: 'Vous ne pouvez postuler qu\'une seule fois par offre. Vérifiez vos compétences avant.',
      },
      {
        titre: 'Suivre mes candidatures',
        icon: '📊', lien: '/candidatures',
        description: 'Consultez le statut en temps réel de chaque candidature.',
        steps: [
          'Allez dans "Candidatures" dans le menu',
          'Chaque candidature affiche : poste, département, statut, score ML',
          'Statuts possibles : Soumise → En cours → Entretien → Acceptée/Refusée',
        ],
        tip: null,
      },
      {
        titre: 'Répondre à une proposition directe',
        icon: '🤝', lien: '/candidatures',
        description: 'Un RP peut vous proposer directement un poste. Vous êtes libre d\'accepter ou de refuser.',
        steps: [
          'Une notification apparaît : "Vous avez reçu une proposition d\'offre"',
          'Allez dans "Candidatures"',
          'La section "Propositions directes reçues" s\'affiche en haut',
          'Cliquez "Accepter" ou "Refuser" selon votre choix',
        ],
        tip: 'Vous pouvez refuser sans impact sur vos autres candidatures en cours.',
      },
      {
        titre: 'Voir mes notifications',
        icon: '🔔', lien: '/notifications',
        description: 'Toutes les mises à jour de vos candidatures sont notifiées ici.',
        steps: [
          'Cliquez sur la cloche 🔔 en haut à droite pour un aperçu',
          'Cliquez "Voir tout l\'historique" pour la page complète',
          'Ou allez dans "Notifications" dans le menu gauche',
        ],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Accéder au chat interne (réservé aux enseignants et à l\'administration)', raison: 'Le chat est réservé aux membres du corps enseignant et administratif.' },
      { texte: 'Utiliser l\'assistant ARIA', raison: 'ARIA est un outil pédagogique pour les enseignants uniquement.' },
      { texte: 'Voir les évaluations', raison: 'Les évaluations sont visibles uniquement par les enseignants.' },
      { texte: 'Créer des offres ou des formations', raison: 'Ces actions sont réservées aux responsables pédagogiques.' },
    ],

    scenarios: [
      { titre: 'Je veux augmenter mes chances d\'être sélectionné', steps: ['Uploadez votre CV PDF complet', 'Vérifiez que vos compétences correspondent aux offres', 'Rédigez une lettre de motivation ciblée'] },
      { titre: 'Je n\'ai pas de nouvelles depuis ma candidature', steps: ['Vérifiez le statut dans "Mes Candidatures"', 'Consultez vos notifications', 'Le délai moyen de réponse est de 2 à 4 semaines'] },
    ],
  },

  enseignant: {
    label: 'Enseignant',
    color: '#22c55e',
    emoji: '👨‍🏫',
    description: 'Vous faites partie du corps enseignant ESPRIT. Vous avez accès à vos évaluations, aux formations, à l\'assistant ARIA et au chat interne. Vous pouvez évoluer vers le statut Talent.',

    peux: [
      {
        titre: 'Consulter mon tableau de bord',
        icon: '📊', lien: '/dashboard',
        description: 'Vue d\'ensemble de vos moyennes, formations en cours et statistiques.',
        steps: ['Le tableau s\'ouvre automatiquement à la connexion', 'Vos moyennes par critère sont affichées', 'Vos formations en cours avec leur progression sont visibles'],
        tip: null,
      },
      {
        titre: 'Consulter mes évaluations',
        icon: '⭐', lien: '/evaluations',
        description: 'Consultez vos notes par critère (pédagogie, ponctualité, engagement, innovation) et les commentaires de vos évaluateurs.',
        steps: [
          'Allez dans "Evaluations"',
          'Les statistiques globales sont affichées en haut',
          'Chaque évaluation détaille : année, semestre, notes, points forts, axes d\'amélioration',
        ],
        tip: 'Seuls vous et vos responsables pédagogiques peuvent voir vos évaluations.',
      },
      {
        titre: 'Demander le statut Talent',
        icon: '⭐', lien: '/evaluations',
        description: 'Quand vous avez au moins une évaluation, vous pouvez demander officiellement le statut Talent.',
        steps: [
          'Dans "Evaluations", cliquez "Demander le statut Talent"',
          'Le RH est notifié automatiquement',
          'Le RH analyse votre profil et soumet à la Direction Générale',
          'La DG valide ou refuse — vous recevrez une notification',
        ],
        tip: 'Préparez un dossier solide : évaluations élevées + formations complètes.',
      },
      {
        titre: 'S\'inscrire aux formations',
        icon: '🎓', lien: '/formations',
        description: 'Accédez au catalogue officiel des formations proposées par le RDFF et inscrivez-vous.',
        steps: [
          'Allez dans "Formations"',
          'Parcourez le catalogue (code, titre, durée, badge, objectifs)',
          'Cliquez "S\'inscrire" sur la formation souhaitée',
          'Votre progression (0-100%) est suivie par le RDFF',
          'À la fin, vous obtenez le badge associé',
        ],
        tip: 'Les formations avec le badge "Badge obtenu" contribuent à votre candidature Talent.',
      },
      {
        titre: 'Utiliser l\'assistant ARIA',
        icon: '🤖', lien: '/aria',
        description: 'ARIA est votre assistant IA pédagogique personnel. Il mémorise vos échanges et vous connaît.',
        steps: [
          'Allez dans "ARIA IA" dans le menu',
          'Mode Chat : posez vos questions pédagogiques',
          'Mode Plan : générez un plan de formation personnalisé',
          'ARIA peut rechercher sur Internet les tendances récentes',
          'Cliquez "Soumettre au RDFF" si vous êtes satisfait(e) du plan',
        ],
        tip: 'ARIA se souvient de vos conversations passées. Plus vous l\'utilisez, mieux il vous connaît.',
      },
      {
        titre: 'Soumettre un plan ARIA au RDFF',
        icon: '📤', lien: '/aria',
        description: 'Si un plan généré par ARIA vous convient, vous pouvez le proposer pour qu\'il soit intégré au catalogue.',
        steps: [
          'Générez un plan en mode "Plan" dans ARIA',
          'Si le résultat vous satisfait, cliquez "Soumettre au RDFF"',
          'Donnez un titre clair à votre formation',
          'Le RDFF reçoit une notification et décide de valider ou refuser',
          'Vous êtes notifié(e) de la décision (avec motif si refus)',
          'Si accepté : la formation est ajoutée au catalogue officiel',
        ],
        tip: 'Vous pouvez voir l\'état de vos propositions dans "Mes propositions" dans l\'interface ARIA.',
      },
      {
        titre: 'Utiliser le chat interne',
        icon: '💬', lien: '/chat',
        description: 'Communiquez avec n\'importe quel membre de l\'administration en temps réel.',
        steps: [
          'Allez dans "Chat"',
          'Recherchez un contact par nom, prénom ou email',
          'Cliquez sur un contact pour ouvrir la conversation',
          'Envoyez votre message (Entrée ou bouton)',
          'Shift+Entrée pour un saut de ligne',
        ],
        tip: 'Vos conversations sont privées et personnelles.',
      },
    ],

    nePeuxPas: [
      { texte: 'Créer des offres de recrutement', raison: 'Réservé aux RP Coordinateurs et Chef de Département.' },
      { texte: 'Modifier les évaluations d\'autres enseignants', raison: 'Seuls les RP et la Direction peuvent créer des évaluations.' },
      { texte: 'Accéder aux profils des autres enseignants', raison: 'La confidentialité des profils est assurée. Seuls les responsables y ont accès.' },
      { texte: 'Valider des formations (catalogue)', raison: 'La validation est réservée au RDFF.' },
    ],

    scenarios: [
      { titre: 'Je veux devenir Talent ESPRIT', steps: ['Obtenez au moins 1 évaluation de votre RP', 'Complétez une formation avec badge obtenu', 'Cliquez "Demander le statut Talent" dans Évaluations', 'Attendez la validation RH → Direction Générale'] },
      { titre: 'Je veux une formation personnalisée', steps: ['Allez dans ARIA → Mode Plan', 'Remplissez objectif, compétences actuelles, durée, niveau', 'Téléchargez le PDF ou soumettez au RDFF'] },
    ],
  },

  talent: {
    label: 'Talent ESPRIT ★',
    color: '#f59e0b',
    emoji: '🌟',
    description: 'Félicitations ! Vous avez obtenu la distinction Talent ESPRIT. Vous avez accès à tous les avantages définis par la Direction Générale, en plus de toutes les fonctionnalités enseignant.',

    peux: [
      {
        titre: 'Tout ce qu\'un Enseignant peut faire',
        icon: '👨‍🏫', lien: '/dashboard',
        description: 'Le statut Talent hérite de toutes les capacités enseignant.',
        steps: ['Voir le guide Enseignant pour le détail de chaque fonctionnalité'],
        tip: null,
      },
      {
        titre: 'Accéder aux avantages Talent',
        icon: '🏆', lien: '/dashboard',
        description: 'Consultez la liste des récompenses et avantages définis par la Direction Générale.',
        steps: [
          'Votre badge ★ est visible sur votre profil par tous les membres',
          'Dans votre tableau de bord, la section Talent liste vos avantages',
          'Ces avantages peuvent être : Bonus, missions, postes, distinctions',
        ],
        tip: 'Les avantages sont mis à jour par la Direction Générale.',
      },
      {
        titre: 'Formations avancées',
        icon: '🎓', lien: '/formations',
        description: 'Accès aux formations de niveau avancé et expert du catalogue.',
        steps: ['Dans "Formations & Talent", toutes les formations sont accessibles sans restriction de niveau'],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Modifier la liste des avantages Talent', raison: 'Cette liste est gérée exclusivement par la Direction Générale.' },
      { texte: 'Créer des offres de recrutement', raison: 'Réservé aux RP.' },
    ],

    scenarios: [
      { titre: 'Je veux voir mes avantages Talent', steps: ['Connectez-vous', 'Votre tableau de bord affiche le badge ★ et vos avantages', 'Contactez la Direction via le chat pour toute question'] },
    ],
  },

  rp_coord: {
    label: 'RP Coordinateur d\'Unité',
    color: '#f59e0b',
    emoji: '📋',
    description: 'Vous êtes responsable de la coordination pédagogique. Vous gérez les offres de recrutement, évaluez les enseignants, et avez accès à toutes les fonctionnalités enseignant (vous êtes aussi enseignant).',

    peux: [
      {
        titre: 'Tout ce qu\'un Enseignant peut faire',
        icon: '👨‍🏫', lien: '/dashboard',
        description: 'En tant qu\'enseignant, vous avez accès aux évaluations, formations, ARIA et chat.',
        steps: ['Consultez le guide Enseignant pour le détail complet'],
        tip: 'Vous pouvez vous-même demander le statut Talent.',
      },
      {
        titre: 'Gérer les offres de recrutement',
        icon: '📋', lien: '/rp/offres',
        description: 'Créez, modifiez et suivez les offres pour votre département.',
        steps: [
          'Allez dans "Offres & Recrutement"',
          'Cliquez "+ Publier une offre"',
          'Remplissez : titre, description, type de contrat, compétences requises, nombre de postes',
          'L\'offre est immédiatement visible pour les candidats de votre département',
          'Cliquez sur une offre pour voir les candidats triés par score ML',
        ],
        tip: 'Les candidats sont automatiquement classés par compatibilité CV ↔ compétences requises.',
      },
      {
        titre: 'Soumettre une demande de poste au Chef',
        icon: '📝', lien: '/rp/offres',
        description: 'Avant de publier, vous pouvez soumettre une demande formelle au Chef de Département.',
        steps: [
          'Dans "Offres & Recrutement", onglet "Demandes de postes"',
          'Cliquez "+ Nouvelle demande"',
          'Remplissez intitulé, justification, nombre de postes',
          'Le Chef de Département reçoit une notification',
          'Statuts : En attente → Acceptée / Refusée',
        ],
        tip: null,
      },
      {
        titre: 'Voir et trier les candidats',
        icon: '👥', lien: '/rp/offres',
        description: 'Liste des candidats classés par score de compatibilité ML (intelligence artificielle).',
        steps: [
          'Cliquez sur une offre',
          'La liste des candidats apparaît triée par score ML (0-100%)',
          'Consultez les compétences de chaque candidat',
          'Changez le statut : Soumise → En cours → Entretien → Acceptée/Refusée',
          'Si acceptée : le candidat devient automatiquement enseignant',
        ],
        tip: 'Les compétences en vert sont celles qui correspondent à l\'offre.',
      },
      {
        titre: 'Proposer une offre directement à un candidat',
        icon: '🤝', lien: '/rp/offres',
        description: 'Proposer directement un poste à un candidat qui n\'a pas encore postulé.',
        steps: [
          'Dans le détail d\'une offre, consultez les candidats disponibles',
          'Le bouton "Proposer" est disponible pour les candidats de votre département',
          'Le candidat reçoit une notification et peut accepter ou refuser librement',
          'Un score ML est calculé automatiquement',
        ],
        tip: 'Le candidat reste libre de refuser sans que ça impacte ses autres candidatures.',
      },
      {
        titre: 'Évaluer les enseignants',
        icon: '⭐', lien: '/rp/offres',
        description: 'Créez des évaluations pour les enseignants de votre unité.',
        steps: [
          'Dans "Offres & Recrutement", onglet "Évaluations"',
          'Sélectionnez un enseignant',
          'Notez sur 4 critères : Pédagogie, Ponctualité, Engagement, Innovation',
          'Ajoutez un commentaire, des points forts et des axes d\'amélioration',
          'L\'enseignant est notifié de la nouvelle évaluation',
        ],
        tip: 'La note globale de l\'enseignant est recalculée automatiquement.',
      },
      {
        titre: 'Recommander un enseignant comme Talent',
        icon: '🌟', lien: '/rp/offres',
        description: 'Vous pouvez recommander un enseignant au RH pour le statut Talent.',
        steps: [
          'Dans l\'onglet "Enseignants", trouvez le profil concerné',
          'Cliquez "Recommander Talent"',
          'Le RH reçoit une notification pour analyser le profil',
        ],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Accepter ou refuser des demandes de postes (c\'est le rôle du Chef)', raison: 'La validation des demandes est réservée au Chef de Département.' },
      { texte: 'Modifier le catalogue de formations', raison: 'Le catalogue est géré par le RDFF.' },
      { texte: 'Voir les profils de candidats d\'autres départements', raison: 'Les données sont cloisonnées par département.' },
    ],

    scenarios: [
      { titre: 'Je veux recruter pour un nouveau poste', steps: ['Option 1 : Créer l\'offre directement', 'Option 2 : Soumettre une demande au Chef → attendre validation → publier', 'Suivre les candidatures dans le tableau de bord offre'] },
      { titre: 'Je veux trouver le meilleur candidat pour mon offre', steps: ['Ouvrez l\'offre', 'Le classement ML est automatique', 'Consultez les compétences, le CV, le score', 'Passez à l\'entretien puis acceptez'] },
    ],
  },

  rp_chef: {
    label: 'Chef de Département Pédagogique',
    color: '#E30613',
    emoji: '🏫',
    description: 'Vous supervisez tout le département pédagogique. Vous validez les demandes de postes, consultez les profils de tous les enseignants, exportez des rapports et pouvez évaluer. Vous êtes aussi enseignant.',

    peux: [
      {
        titre: 'Tout ce qu\'un Enseignant peut faire',
        icon: '👨‍🏫', lien: '/dashboard',
        description: 'Évaluations personnelles, formations, ARIA, chat.',
        steps: ['Consultez le guide Enseignant'],
        tip: null,
      },
      {
        titre: 'Tableau de bord du département',
        icon: '📊', lien: '/chef/dashboard',
        description: 'Vue globale : nombre d\'enseignants, offres actives, Talents, demandes en attente.',
        steps: ['Allez dans "Tableau de bord"', 'Cliquez sur un enseignant pour voir son profil complet'],
        tip: 'Un badge rouge indique les demandes RP en attente de votre validation.',
      },
      {
        titre: 'Valider ou refuser les demandes du RP Coordinateur',
        icon: '✅', lien: '/chef/dashboard',
        description: 'Accepter ou refuser les demandes de nouveaux postes soumises par le Coordinateur.',
        steps: [
          'Dans "Tableau de bord", onglet "Demandes RP"',
          'Lisez la justification de chaque demande',
          'Cliquez "Accepter" (le RP peut publier l\'offre) ou "Refuser"',
          'Le RP est notifié immédiatement',
        ],
        tip: null,
      },
      {
        titre: 'Consulter les profils en lecture seule',
        icon: '👁️', lien: '/chef/dashboard',
        description: 'Accédez au profil complet de chaque enseignant (compétences, évaluations, formations, CV).',
        steps: [
          'Dans "Profils", cliquez sur un enseignant',
          'Vous voyez : informations, compétences, statistiques d\'évaluations, formations',
          'Lien direct vers le CV PDF si disponible',
          'Vous ne pouvez pas modifier — lecture seule',
        ],
        tip: null,
      },
      {
        titre: 'Exporter un rapport PDF d\'activité',
        icon: '📄', lien: '/chef/dashboard',
        description: 'Générez un rapport PDF professionnel du profil complet d\'un enseignant.',
        steps: [
          'Dans "Profils", ouvrez le profil d\'un enseignant',
          'Cliquez "Exporter rapport"',
          'Le PDF est téléchargé automatiquement',
          'Contient : informations, statistiques évaluations, formations suivies',
        ],
        tip: 'Le rapport est au format PDF avec la charte graphique ESPRIT.',
      },
      {
        titre: 'Recommander un enseignant comme Talent',
        icon: '🌟', lien: '/chef/dashboard',
        description: 'Depuis le profil d\'un enseignant, vous pouvez l\'envoyer au RH pour validation Talent.',
        steps: ['Dans "Profils", bouton "Recommander Talent"', 'Le RH est notifié'],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Modifier les profils des enseignants', raison: 'Les enseignants gèrent eux-mêmes leurs profils.' },
      { texte: 'Valider le statut Talent (c\'est le RH + DG)', raison: 'La validation finale passe par le RH et la Direction Générale.' },
      { texte: 'Gérer le catalogue de formations', raison: 'Réservé au RDFF.' },
    ],

    scenarios: [
      { titre: 'Je reçois une demande de poste d\'un coordinateur', steps: ['Notification automatique reçue', 'Allez dans Tableau de bord → Demandes RP', 'Lisez la justification', 'Acceptez ou refusez avec motif'] },
    ],
  },

  rdff: {
    label: 'Responsable Département Formation des Formateurs',
    color: '#8b5cf6',
    emoji: '🎓',
    description: 'Vous gérez le catalogue officiel des formations et validez les propositions de plans ARIA soumises par les enseignants. Vous assurez le suivi de toutes les inscriptions.',

    peux: [
      {
        titre: 'Créer des formations génériques',
        icon: '➕', lien: '/rdff/formations',
        description: 'Ajoutez de nouvelles formations au catalogue officiel ESPRIT.',
        steps: [
          'Dans "Formations", cliquez "+ Nouvelle formation"',
          'Remplissez : code (ex: F006), titre, description, badge, durée',
          'Ajoutez les objectifs (un par ligne)',
          'La formation est immédiatement visible dans le catalogue enseignant',
        ],
        tip: 'Le code doit être unique (F001-F005 sont déjà utilisés, commencez à F006).',
      },
      {
        titre: 'Valider ou refuser les propositions ARIA',
        icon: '🤖', lien: '/rdff/formations',
        description: 'Les enseignants peuvent soumettre des plans générés par l\'IA. Vous les validez ou refusez.',
        steps: [
          'Dans "Formations", onglet "Propositions ARIA"',
          'Un badge rouge indique les propositions en attente',
          'Cliquez "Voir le plan complet" pour lire en détail',
          'Cliquez "Valider → Catalogue" pour l\'intégrer au catalogue (code ARIA001 généré)',
          'Cliquez "Refuser" → saisir un motif obligatoire → l\'enseignant est notifié',
        ],
        tip: 'Une proposition refusée avec motif clair permet à l\'enseignant de corriger et resoumettre.',
      },
      {
        titre: 'Suivre les inscriptions',
        icon: '📊', lien: '/rdff/formations',
        description: 'Consultez la liste des enseignants inscrits à chaque formation.',
        steps: [
          'Sur une formation, cliquez "Voir inscrits"',
          'Tableau : nom, email, progression, statut, badge obtenu',
          'Vous pouvez mettre à jour la progression et valider les badges',
        ],
        tip: 'La validation du badge "badge_obtenu = true + terminé" déclenche automatiquement le passage Talent.',
      },
      {
        titre: 'Activer / Désactiver une formation',
        icon: '🔄', lien: '/rdff/formations',
        description: 'Gérez la visibilité des formations dans le catalogue.',
        steps: ['Bouton "Désactiver" masque la formation du catalogue enseignant', 'Bouton "Activer" la remet en ligne'],
        tip: null,
      },
      {
        titre: 'Utiliser l\'assistant ARIA',
        icon: '🤖', lien: '/aria',
        description: 'ARIA peut vous aider à rédiger des descriptions de formations ou à les améliorer.',
        steps: ['Mode Chat : demandez à ARIA de vous aider à structurer une formation', 'Mode Plan : générez un plan que vous pourrez intégrer directement au catalogue'],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Modifier les évaluations des enseignants', raison: 'Les évaluations sont gérées par les RP.' },
      { texte: 'Accéder au recrutement (offres / candidatures)', raison: 'Le recrutement est géré par les RP et le RH.' },
      { texte: 'Valider le statut Talent directement', raison: 'La validation passe par RH → Direction Générale.' },
    ],

    scenarios: [
      { titre: 'Je reçois une proposition de plan ARIA', steps: ['Notification : "Nouvelle proposition de formation"', 'Allez dans Formations → Propositions ARIA', 'Lisez le plan en détail', 'Validez (intégration catalogue) ou refusez avec motif'] },
    ],
  },

  chef_admin: {
    label: 'Chef Département Administratif (RH)',
    color: '#E30613',
    emoji: '🧑‍💼',
    description: 'Vous gérez le processus de recrutement complet : de la sélection des candidats pour entretien jusqu\'à la validation de leur adhésion. Vous recevez et traitez aussi les recommandations de Talents.',

    peux: [
      {
        titre: 'Gérer le pipeline de recrutement',
        icon: '🔄', lien: '/rh/recrutement',
        description: 'Tableau de bord complet du recrutement avec toutes les offres et candidatures.',
        steps: [
          'Allez dans "Recrutement", onglet "Pipeline"',
          'Sélectionnez une offre dans la liste',
          'Chaque candidat affiche son score ML et son statut',
          'Changez le statut : Soumise → Examen RH → Entretien → Acceptée/Refusée',
        ],
        tip: 'Le classement ML vous aide à identifier rapidement les meilleurs profils.',
      },
      {
        titre: 'Gérer les entretiens (3 étapes)',
        icon: '🎯', lien: '/rh/recrutement',
        description: 'Suivez les 3 étapes d\'entretien : RH, Pédagogique, Technique.',
        steps: [
          'Dans "Recrutement", onglet "Gestion entretiens"',
          'Sélectionnez l\'offre concernée',
          'Pour chaque candidat en entretien, cochez les 3 étapes validées',
          'Une fois les 3 étapes cochées, cliquez "Valider → Enseignant" ou "Refuser"',
          'Si validé : le candidat devient automatiquement enseignant',
        ],
        tip: 'Les candidats refusés reçoivent une notification automatique.',
      },
      {
        titre: 'Traiter les recommandations de Talents',
        icon: '⭐', lien: '/rh/recrutement',
        description: 'Recevez les profils recommandés (par RP, DG, Direction Études) et soumettez-les à la Direction.',
        steps: [
          'Dans "Recrutement", onglet "Validation Talents"',
          'Liste de tous les enseignants non-Talents',
          'Analysez le profil (compétences, évaluations, formations)',
          'Cliquez "Soumettre à la DG" — la Direction Générale reçoit une notification',
          'La DG valide ou refuse → vous et l\'enseignant êtes notifiés',
        ],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Créer des offres de recrutement', raison: 'Les offres sont créées par les RP Coordinateurs (avec accord du Chef Département).' },
      { texte: 'Modifier les formations du catalogue', raison: 'Réservé au RDFF.' },
      { texte: 'Valider directement le statut Talent', raison: 'La validation finale est réservée à la Direction Générale.' },
    ],

    scenarios: [
      { titre: 'Un candidat vient d\'être accepté après entretien', steps: ['Onglet Gestion entretiens', 'Cochez les 3 étapes validées', 'Cliquez "Valider → Enseignant"', 'Le candidat reçoit un email + notification', 'Son rôle passe automatiquement à "Enseignant"'] },
    ],
  },

  direction_etudes: {
    label: 'Direction des Études',
    color: '#3b82f6',
    emoji: '🏛️',
    description: 'Vous supervisez les activités pédagogiques des enseignants. Vous pouvez consulter, créer des évaluations et recommander des Talents au RH.',

    peux: [
      {
        titre: 'Consulter et évaluer les enseignants',
        icon: '⭐', lien: '/direction-etudes/dashboard',
        description: 'Accédez au tableau de bord des enseignants et créez des évaluations.',
        steps: [
          'Allez dans "Tableau de bord"',
          'Sélectionnez un enseignant dans la liste de gauche',
          'Consultez ses évaluations et statistiques',
          'Cliquez "+ Évaluer" pour créer une nouvelle évaluation',
          'Notez sur 4 critères + commentaires',
        ],
        tip: 'La note globale de l\'enseignant est recalculée automatiquement.',
      },
      {
        titre: 'Recommander un enseignant comme Talent',
        icon: '🌟', lien: '/direction-etudes/dashboard',
        description: 'Recommandez un enseignant prometteur au RH pour le statut Talent.',
        steps: [
          'Dans le profil de l\'enseignant, cliquez "Recommander Talent"',
          'Le RH reçoit une notification pour analyser le dossier',
        ],
        tip: null,
      },
      {
        titre: 'Utiliser le chat et ARIA',
        icon: '💬', lien: '/chat',
        description: 'Communication interne et assistant pédagogique.',
        steps: ['Chat : recherche par nom, prénom ou email', 'ARIA : questions pédagogiques, génération de plans'],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Gérer les offres de recrutement', raison: 'Réservé aux RP.' },
      { texte: 'Modifier les profils des enseignants', raison: 'Les enseignants gèrent eux-mêmes leurs profils.' },
      { texte: 'Valider le statut Talent', raison: 'La validation passe par RH → Direction Générale.' },
    ],

    scenarios: [],
  },

  direction: {
    label: 'Direction Générale',
    color: '#1A1A1A',
    emoji: '🏛️',
    description: 'Vous supervisez l\'ensemble de la plateforme. Vous validez le statut Talent, définissez les avantages et avez une vue complète sur tous les acteurs.',

    peux: [
      {
        titre: 'Superviser la plateforme',
        icon: '📊', lien: '/direction/dashboard',
        description: 'KPIs globaux : utilisateurs, Talents, offres, formations.',
        steps: ['Onglet "Supervision" dans votre tableau de bord', 'Vue des relations avec le RH et le RDFF'],
        tip: null,
      },
      {
        titre: 'Valider ou refuser le statut Talent',
        icon: '⭐', lien: '/direction/dashboard',
        description: 'Décision finale sur les dossiers Talent soumis par le RH.',
        steps: [
          'Onglet "Talents & Validation"',
          'Consultez la liste des enseignants recommandés',
          'Cliquez "Valider Talent" (statut attribué immédiatement)',
          'Ou cliquez "Recommander au RH" pour une vérification supplémentaire',
        ],
        tip: null,
      },
      {
        titre: 'Gérer les avantages Talent',
        icon: '🏆', lien: '/direction/dashboard',
        description: 'Définissez et modifiez la liste des récompenses offertes aux Talents.',
        steps: [
          'Onglet "Valorisation"',
          'Cliquez "Modifier la liste"',
          'Sélectionnez la catégorie : Financier, Carrière, Opportunité, Reconnaissance',
          'Ajoutez l\'avantage → il est visible immédiatement par tous',
          'Cliquez "×" pour supprimer un avantage',
          'Cliquez "Terminer la modification" quand c\'est fait',
        ],
        tip: 'Ces avantages sont visibles en lecture seule par tous les membres de la plateforme.',
      },
      {
        titre: 'Consulter tous les profils enseignants',
        icon: '👥', lien: '/direction/dashboard',
        description: 'Accès lecture seule à tous les profils du corps enseignant.',
        steps: ['Onglet "Profils"', 'Cliquez sur un enseignant', 'Vue complète : compétences, évaluations, formations', 'Aucune modification possible'],
        tip: null,
      },
    ],

    nePeuxPas: [
      { texte: 'Modifier les profils ou évaluations', raison: 'Accès lecture seule pour la DG — intégrité des données.' },
      { texte: 'Créer des offres de recrutement', raison: 'Réservé aux RP.' },
      { texte: 'Gérer le catalogue de formations', raison: 'Réservé au RDFF.' },
    ],

    scenarios: [
      { titre: 'Je reçois une recommandation de Talent du RH', steps: ['Notification : "Profil soumis à la DG"', 'Allez dans Tableau de bord → Talents & Validation', 'Consultez le profil complet', 'Validez → l\'enseignant reçoit la distinction ★'] },
    ],
  },
}

// ── Composants UI ──────────────────────────────────────────────────────────

function CapaciteCard({ cap, navigate }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl w-8 text-center">{cap.icon}</span>
          <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{cap.titre}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {cap.lien && (
            <button
              onClick={e => { e.stopPropagation(); navigate(cap.lien) }}
              className="text-xs px-2.5 py-1 rounded-lg font-medium text-white"
              style={{ backgroundColor: '#E30613' }}
            >
              Aller →
            </button>
          )}
          <span
            className="text-gray-400 text-lg transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <p className="text-sm mt-3 mb-3" style={{ color: '#4A4A4A' }}>{cap.description}</p>
          {cap.steps?.length > 0 && (
            <ol className="space-y-1.5">
              {cap.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: '#E30613' }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: '#4A4A4A' }}>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {cap.tip && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{ backgroundColor: '#FFF9F9', border: '1px solid #FECACA', color: '#991B1B' }}>
              <span>💡</span>
              <span>{cap.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Help() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [tab, setTab] = useState('peux')

  const data = HELP_DATA[user?.role] || HELP_DATA.candidat

  return (
    <div className="p-8 max-w-4xl">
      {/* En-tête personnalisé */}
      <div
        className="rounded-2xl p-6 mb-7 flex items-center gap-5"
        style={{ background: `linear-gradient(135deg, ${data.color}15, ${data.color}05)`, border: `1px solid ${data.color}30` }}
      >
        <span className="text-5xl">{data.emoji}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: data.color }}>
              {data.label}
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#1A1A1A' }}>
            Bonjour {user?.prenom} — votre guide ESPRIT Talents
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#4A4A4A' }}>{data.description}</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          ['peux',     '✅ Ce que je peux faire'],
          ['nonpeux',  '🚫 Mes restrictions'],
          ['scenarios','🎯 Cas d\'usage'],
          ['contact',  '📞 Contact'],
        ].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={{ backgroundColor: tab === k ? '#E30613' : 'transparent', color: tab === k ? '#fff' : '#4A4A4A' }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Ce que je peux faire */}
      {tab === 'peux' && (
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: '#8C8C8C' }}>
            Cliquez sur chaque fonctionnalité pour voir le guide étape par étape.
          </p>
          {data.peux.map((cap, i) => (
            <CapaciteCard key={i} cap={cap} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Mes restrictions */}
      {tab === 'nonpeux' && (
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: '#8C8C8C' }}>
            Ces actions sont hors de votre périmètre — elles sont réservées à d'autres rôles.
          </p>
          {data.nePeuxPas.map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: '#E30613' }}
              >
                ✕
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>{item.texte}</p>
                <p className="text-xs mt-1" style={{ color: '#8C8C8C' }}>
                  <span className="font-medium">Pourquoi : </span>{item.raison}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cas d'usage */}
      {tab === 'scenarios' && (
        <div className="space-y-4">
          {data.scenarios.length === 0 && (
            <p className="text-sm" style={{ color: '#8C8C8C' }}>Consultez le guide "Ce que je peux faire" pour les instructions détaillées.</p>
          )}
          {data.scenarios.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-bold mb-3" style={{ color: '#1A1A1A' }}>🎯 {s.titre}</h3>
              <ol className="space-y-2">
                {s.steps.map((step, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: data.color }}>
                      {j + 1}
                    </span>
                    <span style={{ color: '#4A4A4A' }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* Raccourcis clavier */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-bold mb-3" style={{ color: '#1A1A1A' }}>⌨️ Raccourcis utiles</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Entrée', 'Envoyer un message dans le chat'],
                ['Shift + Entrée', 'Saut de ligne dans le chat'],
                ['Cloche 🔔', 'Voir les dernières notifications'],
                ['❓ Aide', 'Cette page (accessible depuis le menu)'],
                ['→ Déconnexion', 'Tout en bas du menu gauche'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <kbd className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-gray-200 text-gray-700 shrink-0">{key}</kbd>
                  <span className="text-xs" style={{ color: '#4A4A4A' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contact */}
      {tab === 'contact' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-7 text-center">
            <span className="text-4xl">📧</span>
            <h3 className="font-bold text-lg mt-3 mb-1" style={{ color: '#1A1A1A' }}>Support ESPRIT Talents</h3>
            <p className="text-sm mb-5" style={{ color: '#8C8C8C' }}>
              Notre équipe technique est disponible pour vous aider.
            </p>
            <div className="space-y-2 text-sm" style={{ color: '#4A4A4A' }}>
              <p>📧 support@esprit.tn</p>
              <p>📞 (+216) 71 857 952</p>
              <p>🏢 ESPRIT — 2 Rue André Ampère, L'Ariana, Tunisie</p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 text-sm text-center"
            style={{ backgroundColor: '#FFF9F9', border: '1px solid #FFD0D0', color: '#991B1B' }}
          >
            Pour les questions inter-services, utilisez le <button onClick={() => navigate('/chat')} className="underline font-semibold">chat interne</button> de la plateforme.
          </div>
        </div>
      )}
    </div>
  )
}
