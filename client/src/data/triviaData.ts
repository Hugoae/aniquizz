export interface Trivia {
    id: number;
    text: string;
    source?: string;
}

export const animeTrivia: Trivia[] = [
    { id: 1, text: "Le créateur de One Piece, Eiichiro Oda, dessine en moyenne 19 à 20 heures par jour pendant les périodes de publication, ne dormant que 3 à 4 heures." },
    { id: 2, text: "L'Attaque des Titans a été inspirée par une altercation que l'auteur, Hajime Isayama, a eue avec un client ivre dans un cybercafé. L'incapacité de communiquer avec lui lui a fait réaliser que l'être humain est l'animal le plus effrayant." },
    { id: 3, text: "Sanji, le cuisinier de One Piece, devait initialement s'appeler 'Naruto' en raison de ses sourcils en spirale. Eiichiro Oda a changé le nom à la dernière minute car le manga Naruto de Masashi Kishimoto venait tout juste d'être annoncé." },
    { id: 4, text: "Le manga Bleach a failli ne jamais être publié. Après un premier refus, Tite Kubo voulait abandonner, mais il a reçu une lettre d'encouragement d'Akira Toriyama (Dragon Ball) lui demandant de continuer." },
    { id: 5, text: "Dans Dragon Ball Z, le combat entre Goku et Freezer sur la planète Namek est le plus long de l'histoire de l'animation : il dure environ 4 heures de temps d'écran (19 épisodes) pour 5 minutes de temps réel dans l'histoire." },
    { id: 6, text: "Le Voyage de Chihiro de Hayao Miyazaki a été réalisé sans scénario complet. Miyazaki dessinait le storyboard au fur et à mesure de la production, ne sachant pas lui-même comment le film allait se terminer." },
    { id: 7, text: "Pikachu n'était pas censé être la mascotte principale de Pokémon. C'est le Pokémon Mélofée (Clefairy) qui devait tenir ce rôle, mais Pikachu a été choisi pour plaire aux garçons comme aux filles." },
    { id: 8, text: "L'auteur de Hunter x Hunter, Yoshihiro Togashi, est marié à Naoko Takeuchi, la créatrice de Sailor Moon. C'est l'un des couples les plus puissants de l'industrie du manga." },
    { id: 9, text: "Le titan colossal de L'Attaque des Titans est inspiré de l'anatomie humaine réelle et des combattants de MMA, dont Brock Lesnar, pour donner une impression de puissance brute." },
    { id: 10, text: "Le budget de la fin de la série originale Neon Genesis Evangelion était si serré que les deux derniers épisodes ont dû abandonner l'animation traditionnelle pour des montages abstraits et philosophiques." },
    { id: 11, text: "L'anime Sazae-san détient le record du monde de la série animée la plus longue de l'histoire, diffusée sans interruption depuis 1969, surpassant largement Les Simpson." },
    { id: 12, text: "Dans Death Note, Ryuk aime les pommes car Tsugumi Ohba (le scénariste) voulait un fruit rouge pour créer un contraste visuel fort avec le costume noir de Ryuk et sa peau pâle." },
    { id: 13, text: "Le créateur de Naruto, Masashi Kishimoto, a attendu une décennie après son mariage pour partir en lune de miel, car il était trop occupé à dessiner son manga hebdomadaire." },
    { id: 14, text: "Le célèbre 'Naruto Run' (courir les bras en arrière) a été choisi par les animateurs non pas pour l'aérodynamisme, mais parce que c'était plus facile et moins coûteux à dessiner que des mouvements de bras réalistes." },
    { id: 15, text: "Code Geass a été massivement sponsorisé par Pizza Hut au Japon, ce qui explique pourquoi le personnage de C.C. commande et mange constamment des pizzas de cette marque dans la série." },
    { id: 16, text: "Les cheveux de Goku dans Dragon Ball (forme de base) ne changent jamais de forme, sauf lorsqu'il se transforme en Super Saiyan, pour faciliter la tâche des dessinateurs et garder une silhouette iconique." },
    { id: 17, text: "Le film Akira (1988) a prédit avec précision que Tokyo accueillerait les Jeux Olympiques en 2020, bien que le film se déroule dans un univers cyberpunk dystopique." },
    { id: 18, text: "L'auteur de Fullmetal Alchemist, Hiromu Arakawa, est une femme qui a grandi dans une ferme laitière. C'est pour cela qu'elle se représente toujours sous la forme d'une vache à lunettes dans ses tomes." },
    { id: 19, text: "L'anime Cowboy Bebop a été créé à l'origine uniquement pour vendre des jouets de vaisseaux spatiaux. Quand le réalisateur a rendu l'histoire trop mature, le sponsor des jouets s'est retiré, mais la série est devenue culte." },
    { id: 20, text: "Le 'Kamehameha' de Dragon Ball a été nommé d'après un ancien roi d'Hawaï. C'est la femme d'Akira Toriyama qui a suggéré ce nom car elle trouvait que cela sonnait bien pour une attaque." },
    { id: 21, text: "L'auteur de My Hero Academia, Kohei Horikoshi, était si nerveux et peu confiant au début de sa carrière qu'il portait un masque à gaz lors de ses apparitions publiques, une habitude qu'il a gardée." },
    { id: 22, text: "Dans JoJo's Bizarre Adventure, presque tous les noms de personnages et de Stands à partir de la partie 4 sont des références directes à des groupes de rock, des chansons ou des albums occidentaux (Queen, Prince, AC/DC, etc.)." },
    { id: 23, text: "One Punch Man a commencé comme un webcomic mal dessiné par un auteur nommé ONE. Il est devenu viral et a ensuite été redessiné par le talentueux Yusuke Murata (Eyeshield 21)." },
    { id: 24, text: "Le Japon utilise plus de papier pour imprimer des mangas que pour fabriquer du papier toilette chaque année." },
    { id: 25, text: "Le capitaine Levi dans L'Attaque des Titans a été conçu en partie en s'inspirant de Rorschach, le personnage du comics Watchmen." },
    { id: 26, text: "L'auteur de Jujutsu Kaisen, Gege Akutami, avait prévu de tuer le personnage de Yuji Itadori très tôt dans la série, mais a changé d'avis face à la popularité du manga." },
    { id: 27, text: "Le studio Ghibli tire son nom de l'arabe libyen 'ghibli' (sirocco), qui désigne un vent chaud du désert. Miyazaki voulait 'faire souffler un vent nouveau' sur l'industrie de l'animation." },
    { id: 28, text: "Dans Death Note, L s'assoit accroupi sur ses chaises car il affirme que s'il s'asseyait normalement, ses capacités de déduction chuteraient de 40%." },
    { id: 29, text: "Le créateur de Berserk, Kentaro Miura, a travaillé sur son chef-d'œuvre pendant plus de 30 ans jusqu'à sa mort en 2021, laissant une marque indélébile sur la Dark Fantasy (inspirant notamment les jeux Dark Souls)." },
    { id: 30, text: "L'anime Captain Tsubasa (Olive et Tom) a inspiré des légendes du football réel comme Lionel Messi, Zinedine Zidane et Andrés Iniesta à commencer ce sport." },
    { id: 31, text: "Pour enregistrer les bruits des pas du robot géant dans le film Le Géant de Fer, les ingénieurs du son ont utilisé des bruits de casseroles, mais pour Gundam, ils ont enregistré le bruit de la fermeture des portes d'un bunker nucléaire." },
    { id: 32, text: "Le nom 'Gundam' est un mélange des mots 'Gun' (pistolet) et 'Freedom' (liberté), qui est devenu 'Gundom' puis 'Gundam' pour évoquer la puissance d'un barrage (Dam) retenant les ennemis." }
];