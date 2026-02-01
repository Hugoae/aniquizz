import { Calendar, Sparkles, Bug, Zap, LucideIcon, Newspaper } from 'lucide-react';

export interface NewsItem {
  id: number;
  title: string;
  description: string;
  content: string;
  date: string;
  type: 'update' | 'feature' | 'fix' | 'event';
}

export const typeConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  update: { icon: Zap, color: 'text-blue-400 bg-blue-400/20', label: 'Mise à jour' },
  feature: { icon: Sparkles, color: 'text-primary bg-primary/20', label: 'Nouveauté' },
  fix: { icon: Bug, color: 'text-orange-400 bg-orange-400/20', label: 'Correction' },
  event: { icon: Calendar, color: 'text-success bg-success/20', label: 'Événement' },
  default: { icon: Newspaper, color: 'text-gray-400 bg-gray-400/20', label: 'Info' }
};

export const allNews: NewsItem[] = [
  {
    id: 3,
    title: 'Patchnote 0.3 - Profil, Intégration AniList & Système de Victoire',
    description: 'Une refonte majeure du profil, une intégration poussée avec AniList, un équilibrage complet des conditions de victoire et de nombreuses améliorations visuelles.',
    content: "La version 0.3 est arrivée. Cette mise à jour transforme votre identité de joueur et rend le jeu plus gratifiant, avec un accent particulier sur l'intégration de vos listes personnelles.\n\nAu programme :\n\n**Intégration AniList**\nC'est la grosse nouveauté : connectez votre compte AniList pour synchroniser vos animes vus et jouer directement avec votre Watchlist. Le système est pensé pour le multijoueur avec deux modes de fusion des listes :\n• Union : Mélange les listes de tous les joueurs (idéal pour la découverte).\n• Intersection : Sélectionne uniquement les animes vus par tout le monde (équité totale, personne ne sera désavantagé).\n\nProfil & Personnalisation\n• Avatar Personnalisé : Vous pouvez désormais uploader votre propre image, la recadrer et l'afficher en jeu.\n• Statistiques Détaillées : Un nouveau tableau de bord affiche votre taux de victoire, votre précision, votre nombre de parties et votre meilleur série (Streak).\n• Pokédex Musical : Suivez votre progression globale. Une barre d'expérience se remplit à mesure que vous découvrez des sons uniques dans la base de données, que vous ayez trouvé la réponse ou non.\n\n**Gameplay & Équilibrage**\n• Conditions de Victoire (Solo) : La victoire se mérite désormais via un score cible selon la difficulté (Facile 70%, Moyen 60%, Difficile 50%). Le mode Exact fixe le seuil à 50% pour compenser la difficulté accrue.\n• Victoire Multijoueur : Le nombre de gagnants s'adapte à la taille du lobby (Seul le 1er gagne si 4 joueurs ou moins, le Top 3 l'emporte au-delà).\n• Score Dynamique : Le calcul de la précision prend maintenant en compte le mode de jeu (Typing = 5pts, QCM = 2pts) pour un pourcentage plus juste.\n• Rangs de fin de partie : Obtenez un rang de D à S+ à la fin de chaque partie selon votre performance.\n\n**Améliorations Visuelles & Confort**\n• Écran de Fin : Refonte totale avec affichage clair du résultat (Victoire/Défaite), barre de progression vers l'objectif et mise en avant de votre avatar.\n• Streak Visuel : En jeu, un indicateur s'allume sur votre carte joueur si vous enchaînez au minimum 3 bonnes réponses.\n• Anecdotes : Une section 'Le saviez-vous ?' apparaît sur l'accueil pour enrichir votre culture anime entre deux parties.\n• Saisie Rapide : En mode Typing, la touche Entrée valide instantanément la première suggestion pour gagner de précieuses secondes.\n• Sécurité : Une fenêtre de confirmation apparaît désormais si vous tentez de quitter une partie en cours.\n• Audio : Le début des extraits vidéos est maintenant calculé sur la durée réelle du fichier pour éviter les coupures abruptes.\n\n**Corrections Techniques**\n• Solo : Correction du bouton Passer qui pouvait sauter deux étapes d'un coup.\n• Interface : Les options multijoueurs (Union/Intersection) sont correctement masquées en mode Solo.\n• Bug Fix : Correction de l'affichage +0 lors d'un skip rapide.\n\nMerci de jouer à AniQuizz !",
    date: '2026-01-25T18:00:00Z',
    type: 'update'
  },
  {
    id: 2,
    title: 'Patchnote 0.2 - Correction Bugs + Reset BDD + Playlist + QOL ',
    description: 'Grosse mise à jour technique et visuelle ! Reset de la BDD pour une architecture plus solide, corrections d\'interface et amélioration du confort de jeu.',
    content: "Cette mise à jour 0.2 marque une étape importante pour la stabilité d'AniQuizz. J'ai retravaillé les fondations du jeu pour vous offrir une expérience plus fluide et plus agréable.\n\nAu programme :\n\n**Améliorations Visuelles (UI/UX)**\n• Cartes Infos (Reveal) : Agrandissement de l'affichage pour éviter de couper les titres longs et les tags.\n• Réponses Joueurs : Les titres longs s'affichent désormais sur deux lignes au-dessus des avatars.\n• Playlists : Elles marchent dorénavant et retour des couleurs sur les icônes de playlist pour plus de lisibilité.\n• Interface : Nettoyage des boutons.\n\n**Corrections & Technique**\n• Synchronisation : Correction du décalage de temps (Timer) entre le serveur et les joueurs.\n• Saisie (Typing) : L'autocomplétion est maintenant plus intelligente (gestion des doublons et du mode Franchise).\n• Stabilité : Optimisation du téléchargement des vidéos pour éviter les chargements infinis.\n• Multijoueur : Les lobbys multijoueur sont devenus robustes, possibilité de changer d'Host, ajout d'un statut 'En Jeu' quand un joueur est encore en game.\n• Solo : Ajout d'un bouton 'Passer' lors de la phase de guess pour avoir la réponse instantanément.\n• Anime : Correction massive pour les noms des Animes et Franchise (noms harmonisés sur les versions anglaises) et perfectionnement des AltNames pour vous permettre une plus grande flexibilité.\n\nMerci de votre soutien et amusez-vous bien !",
    date: '2026-01-24T12:00:00Z', 
    type: 'update'
  },
  {
    id: 1,
    title: 'Patchnote 0.1 - Sortie du jeu',
    description: 'Lancement officiel d\'AniQuizz ! Découvrez les fonctionnalités de la V0.1.',
    content: "Bienvenue sur la version 0.1 d'AniQuizz !\n\nJe suis ravi de vous présenter la première version à peu près stable du jeu.\n\nAu programme :\n• **Mode Solo :** Entraînez-vous sur des playlists (Shonen, Isekai, 90s...).\n• **Mode Multijoueur :** Créez des salons privés et défiez vos amis en temps réel.\n• **Système de jeu :** Choix entre QCM ou Typing (réponse clavier) pour plus de challenge.\n\nMerci de votre soutien et amusez-vous bien !",
    date: '2026-01-23T12:00:00Z', 
    type: 'update'
  }
];