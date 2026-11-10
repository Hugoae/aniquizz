import type { NewsItem } from './newsTypes';

export type { NewsItem } from './newsTypes';
export { typeConfig } from './newsTypes';

export const allNews: NewsItem[] = [
  {
    id: 11,
    title: 'Mise à jour v26.8 - Évolutif, historique, médailles et accueil',
    description:
      'Nouveau mode Évolutif en solo, médailles sous la carte, historique retravaillé, et un accueil plus vivant.',
    content:
      '**Évolutif**\n' +
      '• Nouveau mode, en solo et en saisie. L’extrait repart du même point et s’allonge : 0,25 s, 0,5 s, 1 s, 3 s, 10 s, puis 15 s.\n' +
      '• Plus vous trouvez tôt, plus le titre rapporte : 6, 5, 4, 3, 2, puis 1 point.\n' +
      '• Une erreur ou Passer allonge l’extrait. Abandonner termine le titre à 0.\n' +
      '• Réécoute, dans Général : Infinie, ou Limitée avec le nombre de relances. En partie, le compteur est sous « Écoutez bien… ».\n' +
      '• Pas de chrono pour répondre, et pas de bouton Pause. Le bouton au centre relance l’extrait.\n\n' +
      '**Parcours de configuration**\n' +
      '• Une nouvelle partie se prépare en trois temps : Général, Source, puis Avancée. Lancer n’apparaît qu’à la fin.\n' +
      '• Dans Paramètres, rubrique En partie, **Parcours de configuration** est activé par défaut. Le couper ouvre tout de suite.\n\n' +
      '**Médailles**\n' +
      '• En solo, Bronze, Argent, Or et Platine s’affichent sous votre carte, avec le score qui les débloque.\n' +
      '• Elles restent grises, puis prennent leur couleur une fois le seuil atteint.\n' +
      '• L’écran de fin reprend ces quatre paliers. La barre a été retirée.\n\n' +
      '**Historique**\n' +
      "• La catégorie historique de partie dans le profil à été retravaillée et est maintenant plus agréable, affiche plus d'informations et montre les cinq dernières parties.\n" +
      '• Grâce au nouveau bouton **Rejouer** vous pouvez relancer une partie avec les mêmes règles.\n\n' +
      '**Couleurs des modes**\n' +
      '• Standard en violet, Contre-la-montre en cyan, Évolutif en vert, Quiz du jour en doré.\n\n' +
      '**Accueil**\n' +
      '• Le fond est parsemé de points blancs qui clignotent.\n' +
      '• À l’ouverture, le logo pulse au centre, puis le site apparaît.\n\n' +
      "Une grosse mise à jour qui apporte un mode de jeu et plein de nouveautés, j'espère que vous l'apprécierez !",
    date: '2026-11-10T21:00:00Z',
    type: 'update',
  },
  {
    id: 10,
    title: 'Mise à jour v26.7.1 - Prime de série',
    description:
      'En Contre-la-montre, une série de titres trouvés peut rendre du temps. Le son part au hasard, et les égalités du podium tiennent sur une ligne.',
    content:
      '**Prime de série**\n' +
      '• Nouvelle option du Contre-la-montre, en solo et à plusieurs. Elle est coupée par défaut.\n' +
      '• Dans Général, à côté de Skip punitif. Vous réglez la série (de 3 à 10, 5 par défaut) et le temps rendu (de +3 à +10 s, +5 par défaut).\n' +
      '• Tous les N titres trouvés d’affilée, le chrono gagne ce temps.\n' +
      '• Passer, ou laisser l’extrait se terminer sans trouver, remet la série à zéro. Une mauvaise réponse sur le titre en cours retire toujours 3 s, et ne casse pas la série.\n' +
      '• Le chrono ne dépasse jamais la durée choisie. À 2:58 sur une partie de 3 min, une prime de +5 s n’ajoute que +2 s, et l’animation affiche +2 s. Au total, une partie ne peut pas recevoir plus d’un budget entier en prime.\n' +
      '• Quand la prime tombe, « +N s » s’affiche sur votre scène, avec un son. La manche concernée le reprend dans l’historique.\n' +
      '• Le salon rappelle la prime tant qu’elle est activée.\n\n' +
      '**Départ du son**\n' +
      '• En Contre-la-montre, l’extrait part maintenant au hasard. Le début reste disponible dans les options avancées.\n\n' +
      '**Classement**\n' +
      '• Sur le podium, une égalité aligne les portraits sur une ligne, un peu superposés, comme en fin de partie. La marche ne s’étire plus.\n\n' +
      '**Confort**\n' +
      '• En solo, Retour depuis l’écran prêt ramène à la configuration. Un second Retour quitte vers le choix du mode.\n\n' +
      'Bon jeu !',
    date: '2026-10-18T21:00:00Z',
    type: 'update',
  },
  {
    id: 9,
    title: 'Mise à jour v26.7 - Contre-la-montre, Vitesse & retours en partie',
    description:
      'Course contre le temps en solo et à plusieurs, bonus de rapidité en Standard, et des retours plus clairs à chaque réponse.',
    content:
      '**Contre-la-montre**\n' +
      '• Nouveau mode, en solo ou à plusieurs (2 à 8). Le but : trouver le plus de titres avant la fin du temps.\n' +
      '• On ne compte plus des points : les titres trouvés, et ceux entendus. En solo, les médailles suivent ce rythme.\n' +
      '• À plusieurs, chacun joue sa manche sur la même liste. Le classement retient le plus de trouvés, puis le moins d’entendus. Deux résultats identiques restent à égalité.\n' +
      '• La série s’affiche à partir de 3. Pas de pause, et pas de vote pour passer : chacun passe pour soi, et cela coûte du temps.\n' +
      '• Le son part du début. Un départ aléatoire reste possible dans les options avancées.\n' +
      '• Le mode Watched n’est pas proposé à plusieurs : tout le monde joue les mêmes titres.\n' +
      '**Vitesse**\n' +
      '• L’ancien mode Sprint devient une option du Standard, en multijoueur et en saisie uniquement.\n' +
      '• Parmi les bonnes réponses, les plus rapides reçoivent un bonus, jusqu’à +3 pour le premier.\n' +
      '**Retours en partie**\n' +
      '• En Standard, une bonne réponse, une mauvaise réponse et un temps écoulé ont le même jingle et la même animation qu’en contre-la-montre.\n' +
      '• En contre-la-montre, la pénalité de temps reste affichée quand il y en a une.\n' +
      '• Nouveau réglage **Sons de bonne et mauvaise réponse**, activé par défaut. Le mute global les coupe aussi.\n\n' +
      '**Révéler tout de suite**\n' +
      '• L’option a quitté les paramètres généraux. Elle se règle dans la configuration avancée d’une partie solo Standard, et elle est coupée par défaut.\n' +
      '• Le multijoueur, le contre-la-montre et le quiz du jour ne l’utilisent pas.\n\n' +
      '**Avis & bugs**\n' +
      '• La section **Idées** s’appelle désormais **Avis & bugs**, sur l’accueil et sur la page. Même adresse : un avis, un bug, un son manquant ou une idée.\n\n' +
      '**Choix du mode**\n' +
      '• La carte Solo nomme les deux parties : Standard (points et médailles) et Contre-la-montre.\n' +
      '• Compétitif n’est pas encore jouable. Une ligne indique que le classé arrive.\n\n' +
      'Bonne course !',
    date: '2026-10-11T16:00:00Z',
    type: 'update',
  },
  {
    id: 8,
    title: 'Mise à jour v26.6 - Quiz du jour, Paramètres, Précision Artiste & Soutenir',
    description:
      'Défi quotidien, paramètres joueur, précision Artiste, bouton Soutenir, et un passage catalogue.',
    content:
      '**Quiz du jour**\n' +
      '• Cinq QCM identiques pour tout le monde, précision **Anime**, compte requis.\n' +
      '• Une seule tentative officielle : quitter, rafraîchir ou fermer l’onglet abandonne les questions restantes. Pas de reprise au milieu.\n' +
      '• 15 secondes pour deviner, 15 secondes de révélation par manche. Reset à minuit **heure de Paris**. Le n°1 correspond au 15 septembre 2026.\n' +
      '• Score sur 5, classement du jour (trouvés, puis le temps), série quotidienne même à 0/5, un peu d’XP.\n' +
      '• Victoire dès 3 trouvés, bonus si 5/5.\n' +
      '• Le classement du jour est visible. À la révélation, vous pouvez liker le son comme en solo / multi.\n' +
      '• L’historique du profil mélange désormais ces runs (badge Quiz du jour).\n\n' +
      '**Paramètres joueur**\n' +
      '• Le panneau n’est plus un placeholder : onglets **Général**, **Social** et **Compte**.\n' +
      '• Volume et mute s’appliquent partout (partie, librairie, profil, aperçus admin, sons de notif).\n' +
      '• Animations Auto / Réduit / Complet, autofocus, Entrée, révélation solo, rappel des raccourcis.\n' +
      '• Notifications internes (toasts, optionnellement un petit son — désactivé par défaut). Pas de push navigateur.\n' +
      '• Confidentialité : qui voit votre statut, votre historique, qui peut vous inviter. Liste des comptes bloqués.\n' +
      '• AniList et MyAnimeList peuvent rester liés en même temps ; une seule source active pour le mode Watched.\n\n' +
      '**Précision Artiste**\n' +
      '• En plus de Franchise et Anime, vous pouvez demander jouer avec la précision **Artiste**.\n' +
      '• En saisie, un des artistes / groupes crédités suffit. En QCM, la bonne réponse est le premier nom facturé.\n' +
      '**Soutenir**\n' +
      "• Nouveau bouton **Soutenir** dans le header (vers Ko-fi). Volontaire, sans contrepartie en jeu, le site reste gratuit et sans pubs, mais si vous voulez soutenir mon travail et aider à payer les infrastructures c'est avec plaisir !.\n" +
      '**Catalogue**\n' +
      '• Les studios AniList sont enfin remplis sur les fiches (ils n’étaient jamais enregistrés).\n' +
      '• Titres et crédits manquants repris là où c’était sûr.\n' +
      '• La recherche comprend mieux les requêtes du type **bleach ED5** (librairie, admin, suggestions).\n\n' +
      'Bon quiz, et à demain pour le suivant !',
    date: '2026-09-15T12:00:00Z',
    type: 'update',
  },
  {
    id: 7,
    title: 'Mise à jour v26.5 - Endings & Playlists',
    description: 'Plus de 1800 endings ajoutés, playlists thématiques (shonen, seinen, décennies…)',
    content:
      "Grosse mise à jour d'AniQuizz : le catalogue double de volume, et une nouvelle source de musiques arrive en partie.\n\n" +
      '**Plus de 1800 endings**\n' +
      '• Le catalogue compte désormais **plus de 1800 endings** jouables, aux côtés des openings déjà présents.\n' +
      '• Au total : **3000 sons** — openings et endings réunis.\n' +
      '**Openings, endings, ou les deux**\n' +
      '• En configuration de partie, le filtre **Openings / Endings** est actif.\n' +
      '• Enchaînez uniquement des openings, uniquement des endings, ou mélangez les deux.\n' +
      '• Le résumé des règles du lobby suit votre choix.\n\n' +
      '**Playlists thématiques**\n' +
      '• Nouvel onglet **Playlists** — packs figés, pas un nouveau mode de jeu.\n' +
      '• Packs : **Shonen**, **Seinen**, **Tranches de vie**, **Mecha**, **Fantasy**, **Romance**, **Surnaturel**, **Science-fiction**, **Sports**, **Isekai**.\n' +
      '• Overlay **Décennie** (années 1990 à 2020), combinable avec un autre pack, par exemple Shonen et Années 2010.\n' +
      '• Option **Limiter aux animes vus**   intersection de la playlist et de vos listes AniList / MyAnimeList.\n' +
      '• Un pack trop petit pour le nombre de manches bloque le lancement (pas de remplissage hors pack).\n\n' +
      '**Artistes corrigés**\n' +
      '• Les crédits **artiste inconnu** ont été repris un par un (titres, orthographes déjà en catalogue).\n' +
      '• Les doublons du type même groupe écrit deux façons ont été unifiés.\n' +
      '• Les fiches de révélation et la Librairie affichent enfin le bon nom, presque partout.\n\n' +
      'Prochaine étape annoncée : Il faut que je travaille sur le **Quiz du jour**.\n\n' +
      'Bon jeu et amusez vous bien sur les endings !',
    date: '2026-09-11T17:00:00Z',
    type: 'update',
  },
  {
    id: 6,
    title: 'Mise à jour v26.4 - Classement, sons favoris, suggestions et Update Librairie',
    description:
      'Cinq classements à vie, titres favoris, boîte à idées communautaire, et une Librairie en trois vues.',
    content:
      '**Classement global**\n' +
      '• Cinq onglets à vie, tous modes et toutes parties terminées : **XP**, **Victoires**, **Parties**, **Pokédex musical** et **Précision**.\n' +
      '• Le podium montre les rangs 1 à 3. La liste continue ensuite jusqu’au **top 25**. Connectez-vous pour voir **votre ligne**, même hors du top.\n' +
      '• Les égalités partagent le rang (1, 2, 2, 4). À victoires égales, le **taux de réussite** départage.\n' +
      '• Le Pokédex compte les **sons différents** entendus. Rejouer un titre n’augmente pas le score.\n' +
      '• La précision s’ouvre après **50 manches**. Une manche sans réponse compte comme un échec.\n' +
      '• Cliquez un joueur pour ouvrir son profil. Sans compte, une connexion vous est proposée.\n\n' +
      '**Titres favoris**\n' +
      '• Un **cœur** apparaît sur la carte du son **au moment de la révélation**. Un clic et le titre rejoint vos favoris.\n' +
      '• Retrouvez-les dans la **Librairie** via le filtre **Mes favoris**, et likez depuis la liste ou la fiche détaillée.\n' +
      '• Si vous retirez un favori par erreur, le message de confirmation propose **d’annuler** pendant quelques secondes.\n' +
      '• Le compteur de favoris est affiché en haut de la Librairie.\n\n' +
      '**Vitrine sur votre profil**\n' +
      '• Nouvelle section **Titres favoris** : écoutez un extrait sans quitter la page, avec la pochette et le type de son.\n' +
      '• La modale **Choisir mes favoris** vous laisse **épingler jusqu’à 5 titres** et les **réordonner**. Sinon, vos likes les plus récents s’affichent.\n' +
      '• Vous décidez si cette section est **visible sur votre profil public** ou gardée pour vous.\n\n' +
      '**Librairie, trois façons de parcourir**\n' +
      '• Vue **Franchise** (arborescence, par défaut), vue **Anime** (liste dépliable) et vue **Sons** (grille à plat).\n' +
      '• Tri par **popularité des likes** ou par **vos likes les plus récents**, avec le nombre de likes sur chaque son.\n' +
      '• Les filtres et la vue restent dans l’URL : un lien partagé rouvre exactement la même sélection.\n\n' +
      '**La boîte à idées**\n' +
      '• Nouveau bouton **Idées** sur l’accueil : un board public pour proposer une **amélioration**, un **son souhaité**, une **correction du catalogue** ou **autre**.\n' +
      '• Connectez-vous pour **soutenir** une idée (un vote par personne). Les plus plébiscitées restent en tête tant qu’elles sont **En cours**.\n' +
      '• Recherchez une idée existante avant d’en publier une (maximum **5 par 24 heures**) et filtrez par catégorie ou statut.\n' +
      '• Suivez l’avancement (**En cours**, **Prévue**, **Réalisée**, **Refusée**) et lisez les **réponses officielles** de l’équipe.\n' +
      '• Pour une correction, cherchez le son (titre, anime, OP/ED, artiste), puis précisez le champ. La difficulté se choisit parmi Facile, Moyen ou Difficile.\n\n' +
      '**Correctifs**\n' +
      '• Admin : la recherche du catalogue est fiable, avec les **titres alternatifs**, sans résultats périmés, et nettement plus rapide.\n' +
      '• Lobby : le retour aux paramètres de salon fonctionne à nouveau après une reconnexion.\n\n' +
      'Bon jeu, et merci d’avance pour vos idées !',
    date: '2026-09-02T12:00:00Z',
    type: 'update',
  },
  {
    id: 5,
    title: 'Mise à jour v26.3 - Sprint, config plein écran & polish',
    description:
      'Nouveau mode multijoueur Sprint (course à la vitesse), configuration de partie en plein écran, recap lobby solo, chips de réglages unifiés, et autocomplétion typing plus fluide.',
    content:
      '**Mode Sprint (multijoueur)**\n' +
      '• Nouveau mode **Sprint** : typing uniquement, **2 joueurs minimum** - la course à la vitesse !\n' +
      "• Chaque bonne réponse rapporte **5 pts** + un **bonus podium** selon votre rang parmi les corrects (jusqu'à **+3 pts** pour le plus rapide).\n" +
      "• Vous pouvez **modifier votre réponse** jusqu'à la fin du chrono ; le classement vitesse n'apparaît qu'à la **révélation** (suspense garanti).\n" +
      "• Badge **Jusqu'à +8 pts** pendant la manche · panel top 3 + votre ligne · historique de partie détaillé (temps, rang, breakdown des points).\n" +
      "• Les parties Sprint sont enregistrées dans l'historique profil avec le badge dédié.\n\n" +
      '**Configuration de partie - plein écran**\n' +
      '• Fini la modale étriquée\n' +
      '• Sélecteur de mode en haut : **Standard** ou **Sprint** · navigation **Général** · **Source** · **Avancée** (vidéo + départ du son).\n' +
      '• Paramètres salon (nom, privé, mot de passe, joueurs max) regroupés en sidebar multi\n\n' +
      '**Lobby & réglages**\n' +
      '• Recap solo avant lancement : résumé lisible (Partie, Réponse, Musique, Vidéo) avec badge de mode dynamique.\n' +
      '• Chips de réglages unifiés partout (lobby, liste des salons, modal Règles, game-over, in-game) - difficulté en dégradé sémantique, icônes cohérentes.\n' +
      "• Badges **STD** / **SPR** sur les salons et l'historique.\n\n" +
      '**Fluidité en partie (typing)**\n' +
      "• Autocomplétion découplée du reste de l'écran : plus de lag à chaque frappe, debounce adaptatif, index local.\n" +
      "• La barre de réponse **reste active** après envoi - changer d'avis sans quitter le clavier (solo, multi et Sprint).\n\n" +
      '**Sous le capot**\n' +
      '• Tests unitaires **MatchEngine** (scoring Standard + Sprint, anti-triche, timer multi) pour sécuriser les prochains modes.\n' +
      '• Snapshots de partie persistés en base (`mode de réponse`, `précision`, `médaille solo`) - préparation des futures stats profil.\n\n' +
      'Prochaine étape annoncée : **graphiques de stats sur le profil**, puis **Playlists thématiques** (voir la Roadmap).\n\n' +
      'Merci de continuer à jouer et de nous remonter vos retours !',
    date: '2026-07-14T12:00:00Z',
    type: 'update',
  },
  {
    id: 4,
    title: 'Correction v26.2.1 - Gameplay, interface & confort',
    description:
      'Timer multijoueur corrigé, polish vidéo et typing, autocomplétion plus rapide, layout solo harmonisé, et bouton retour du lobby solo refait.',
    content:
      'Patch cumulatif de corrections après la v26.2 - gameplay, interface et petits irritants du quotidien :\n\n' +
      '**Multijoueur - timer de guess**\n' +
      "• La manche ne se coupe plus dès que tout le monde a répondu : le chrono complet s'écoule, comme en solo.\n" +
      "• Vous gardez le temps de changer d'avis jusqu'à la fin du timer.\n\n" +
      '**Interface de jeu**\n' +
      '• Lecteur vidéo calé à **42vh** ; à la révélation, **object-cover** pour éviter les bandes noires sur les côtés.\n' +
      '• Badge **Pause** repositionné sur le lecteur - visible en permanence pendant la manche.\n' +
      "• Débordements de layout corrigés sur l'écran de partie.\n\n" +
      '**Mode Typing**\n' +
      '• Plus de menu de suggestions fantôme après validation au clavier.\n' +
      '• Autocomplétion plus réactive : menu dès 2 caractères, état « Recherche… », requête immédiate et cache serveur pré-chauffé.\n' +
      '• En solo Typing pur, la barre de réponse est alignée avec le mode Mix (même espacement sous le lecteur).\n\n' +
      '**Lobby solo**\n' +
      "• Bouton **Retour aux modes de jeu** avec une zone cliquable complète, cohérente avec le reste de l'app.\n\n" +
      "Merci pour vos retours - n'hésitez pas à continuer à nous signaler ce qui coince en partie !",
    date: '2026-07-13T10:00:00Z',
    type: 'fix',
  },
  {
    id: 3,
    title: 'Mise à jour v26.2 - Librairie, MyAnimeList & polish jeu',
    description:
      'Parcourez tout le catalogue, liez MyAnimeList pour le mode Watched, fluidité en partie améliorée, et phase de guess solo alignée sur le multijoueur.',
    content:
      "La v26.2 ouvre AniQuizz sur la découverte du catalogue et une deuxième source de listes d'animes regardés. Voici le détail :\n\n" +
      '**Librairie musicale**\n' +
      '• Nouvelle page **Librairie** : parcourez le catalogue par franchise, filtrez par type de son (OP/ED), difficulté ou recherche texte.\n' +
      '• Vue arborescente paginée + fiche détaillée par son (aperçu vidéo, anime, saison, difficulté).\n' +
      '• Seuls les sons téléchargés et jouables apparaissent - fini le Coming Soon.\n\n' +
      '**MyAnimeList (mode Watched)**\n' +
      '• Liez votre pseudo MAL depuis le profil - alternative à AniList pour alimenter le mode Watched.\n' +
      '• Listes prises en charge : En cours, Terminé et En pause - synchronisées avec notre catalogue.\n' +
      '• Un seul fournisseur par profil (AniList **ou** MAL) ; en multijoueur, union ou intersection cross-provider entre joueurs.\n' +
      "• Mêmes garde-fous que l'AniList : pool insuffisant = blocage ou opt-in explicite pour compléter avec l'aléatoire.\n\n" +
      '**Gameplay solo**\n' +
      "• La manche ne se révèle plus instantanément à la première réponse - le chrono complet s'applique comme en multijoueur.\n" +
      "• Vous pouvez changer votre réponse jusqu'à la fin du timer.\n" +
      '• Nouveau bouton **Révéler** (après au moins une réponse) pour passer à la révélation quand vous êtes prêt.\n\n' +
      '**Fluidité & chargement**\n' +
      '• Accueil plus réactif : shell HTML aligné sur la vraie page, moins de flash au premier chargement.\n' +
      '• En partie : timer isolé, visualiseur audio en CSS pur, suppression du flou GPU sur les overlays - moins de saccades sur machines modestes.\n' +
      '• Vidéo floutée : masquage légèrement renforcé (+5 %) pendant la phase de guess.\n\n' +
      '**Playlist & polish**\n' +
      '• Ordre des manches plus équitable : shuffle uniforme après la sélection diversifiée par franchise.\n' +
      '• Admin : stats des listes liées (AniList / MAL) et pseudo MAL visible dans les salons.\n\n' +
      'Prochaine étape annoncée : graphiques de stats sur le profil, puis **Mode Rapidité** et **Playlists thématiques** (voir la Roadmap).\n\n' +
      'Merci de continuer à jouer et de nous remonter vos retours !',
    date: '2026-07-12T21:00:00Z',
    type: 'update',
  },
  {
    id: 2,
    title: 'Mise à jour v26.1 - Compte, lobby & modes de jeu',
    description:
      "Suppression de compte, règles du lobby, modes vidéo, départ d'extrait au choix, AniList plus clair, et des dizaines de correctifs pour le blindtest.",
    content:
      "La v26.1 affine l'expérience Standard avant les grosses nouveautés à venir (Librairie, stats, MyAnimeList). Voici ce qui change :\n\n" +
      '**Compte & confidentialité**\n' +
      "• Suppression de compte en libre-service depuis votre profil (menu ⋮), conforme au droit à l'effacement.\n" +
      '• Confirmation par pseudo et mot de passe avant toute suppression définitive.\n\n' +
      '**AniList (mode Watched)**\n' +
      "• Plus de complétion silencieuse : si votre liste est trop petite, le lancement est bloqué ou vous choisissez explicitement de compléter avec l'aléatoire.\n" +
      '• Bannière live dans le lobby : pool suffisant ou insuffisant, mode Union ou Commun, opt-in visible.\n' +
      "• En QCM, les mauvaises réponses restent dans votre pool AniList - fini les distracteurs d'animes que vous n'avez jamais vus.\n\n" +
      '**Lobby - Règles & réglages**\n' +
      '• Bouton **Règles** : panneau lisible qui explique scoring, source musicale, victoire solo/multi et votes pause/skip selon la config actuelle.\n' +
      "• Onglet **Avancé** dans les paramètres : affichage vidéo (Audio seul, Flouté, Fenêtre) et départ de l'extrait (Aléatoire ou Au début).\n" +
      '• Dans un même salon, les sons des parties précédentes sont évités quand le catalogue le permet.\n\n' +
      "**Modes d'affichage vidéo**\n" +
      '• **Audio seul** (défaut) : fond masqué, timer circulaire - comme avant, en plus propre.\n' +
      '• **Vidéo floutée** : la vidéo joue sous un flou, barre de progression en bas.\n' +
      '• **Fenêtre aléatoire** : petit carré net à position différente chaque manche, cadre violet, reste masqué.\n' +
      '• La révélation montre toujours la vidéo complète ; les points ne changent pas.\n\n' +
      "**Départ de l'extrait**\n" +
      '• **Aléatoire** (défaut) : chaque manche commence à un moment différent du clip.\n' +
      "• **Au début** : l'intro de l'OP/ED est toujours audible - idéal pour les puristes.\n" +
      "• Lecture plus fiable : le client attend le bon point de départ avant de lancer l'audio.\n\n" +
      '**Correctifs & polish**\n' +
      '• Médailles solo : les seuils Bronze → Platine correspondent enfin à la barre de maîtrise.\n' +
      "• Relance solo : nouvelle playlist après retour au lobby, plus de reprise de l'ancienne partie.\n" +
      '• Modération : joueurs bannis bloqués sur /play, éjection des parties en cours, toast unique.\n' +
      '• Admin : clic sur un utilisateur ouvre son profil complet avec retour vers le panneau admin.\n' +
      '• Staff : les hôtes **ADMIN** peuvent ajouter des bots en lobby sur le serveur live (tests & démos).\n\n' +
      'Prochaine étape annoncée : **v26.2** - Librairie, graphiques de stats sur le profil, et lien MyAnimeList.\n\n' +
      'Merci de continuer à jouer et de nous remonter vos retours !',
    date: '2026-07-10T21:00:00Z',
    type: 'update',
  },
  {
    id: 1,
    title: 'Mise à jour v26.0 - AniQuizz est en ligne',
    description:
      "Le blindtest anime nouvelle génération : solo ou multijoueur, AniList, amis, XP, médailles et des centaines d'openings à deviner.",
    content:
      'AniQuizz est disponible ! Que vous soyez du genre à reconnaître un opening en deux notes ou à confondre encore deux shonen, il est temps de tester votre culture anime.\n\n' +
      'Au programme :\n\n' +
      '**Blindtest anime - Solo & Multijoueur**\n' +
      "• Parties solo pour s'entraîner à votre rythme, ou salons privés pour défier vos amis en temps réel.\n" +
      "• Des centaines d'openings et d'endings à deviner, avec filtres de difficulté (Facile, Moyen, Difficile).\n" +
      '• Modes de réponse au choix : Typing (clavier), QCM Carré, Duo, ou Mix pour varier les plaisirs.\n' +
      '• Précision Anime ou Franchise selon le niveau de challenge que vous voulez.\n' +
      '• Médailles solo (Bronze → Platine) : votre score est jugé par rapport au maximum possible, pas juste un pourcentage arbitraire.\n' +
      '• Autocomplétion intelligente en mode Typing pour aller vite sans sacrifier la précision.\n\n' +
      '**Intégration AniList**\n' +
      '• Liez votre compte AniList depuis votre profil pour synchroniser les animes que vous avez vus.\n' +
      "• Jouez uniquement avec des sons de votre watchlist - idéal pour ne pas tomber sur un anime que vous n'avez jamais vu.\n" +
      '• En multijoueur, deux modes de fusion : Union (toutes les listes mélangées) ou Commun (seulement les animes vus par tout le monde).\n\n' +
      '**Amis & Social**\n' +
      '• Ajoutez des amis par pseudo, acceptez les demandes, voyez qui est en ligne ou en partie.\n' +
      '• Invitez un ami dans votre lobby ou rejoignez le sien en un clic.\n' +
      "• Ajoutez quelqu'un depuis l'écran de fin de partie ou la liste des joueurs - plus besoin de chercher son pseudo.\n" +
      "• Liste des joueurs récents pour retrouver facilement vos adversaires d'hier.\n\n" +
      '**Progression & Profil**\n' +
      "• Gagnez de l'XP à chaque partie, montez de niveau et affichez votre badge dans le header.\n" +
      '• Statistiques détaillées : victoires, précision, parties jouées, séries de victoires.\n' +
      '• Pokédex musical : suivez combien de sons uniques vous avez déjà croisés dans le catalogue.\n' +
      '• Avatar personnalisé : uploadez votre image, recadrez-la et portez-la en jeu.\n\n' +
      '**Expérience de jeu**\n' +
      '• Timer circulaire, révélation avec fiche anime (saison, note, cover…), chat en lobby.\n' +
      '• Votes pause / skip en multijoueur, confirmation avant de quitter une partie en cours.\n' +
      '• Interface sombre moderne, pensée pour le desktop et le mobile.\n\n' +
      "Et ce n'est que le début - consultez la Roadmap sur la page Actualités pour voir ce qui arrive ensuite (Librairie, Classement, Daily, Compétitif…).\n\n" +
      'Merci de jouer à AniQuizz - et bonne chance pour le Platine !',
    date: '2026-07-09T20:00:00Z',
    type: 'update',
  },
];
