## Documentation

L'objectif principal de Another Dream est simple : atteindre le drapeau. Mais attention, ce ne sera pas toujours aussi facile ! Vous pouvez déplacer les caisses pour débloquer des passages ou créer des plateformes, toutefois, une restriction s'applique : vous pouvez déplacer deux caisses à la fois, mais pas plus.

On peut se déplacer avec les flèches du clavier, bouger l'angle de la caméra avec la souris et la déplacer avec le clic droit. On également plusieurs touches utiles. La touche B permet d'annuler un mouvement, la touche R de recommencer un niveau, la touche M de revenir au niveau central et la touche C de recentrer la caméra.

Le contrôle du personnage est basé sur les flèches du clavier. Cependant, l'orientation de la caméra étant modifiable, les inputs sont adaptatifs pour toujours suivre votre intuition et augmenter la jouabilité. Cela est modélisé grâce à un icone en bas à gauche de l'écran qui permet de s'y retrouver si l'on se perd dans les contrôles.

Le jeu est composé de 20 niveaux de difficultés croissantes et est divisé en 2 parties. La première est la base du jeu, puis la 2ème commence avec l'introduction de la mécanique de monde cauchemar, qui consiste en des portails permettant de passer de l'un à l'autre, et ainsi déplacer les caisses dans 2 mondes différents pour débloquer de nouvelles possibilités.
Tout ces niveaux sont accessibles depuis un niveau central, qui sert de lien entre les niveaux et de marqueur de progression.

Le jeu comporte également une musique libre de droit (faite par Cleyton Kauffman), choisie pour son côté planant et calme qui s'intègre bien dans le thème et le jeu, et quelques bruitages.

Le jeu possède aussi une interface pour créer les niveaux et de les tester, c'est principalement de cette manière qu'ils ont été créés. L'interface est trouvable en tapant /creator derrière l'url du jeu. Malheureusement, elle est buggée et pas totalement responsive, elle n'était pas destiné à être publiée mais nous jugeons que cela fait quand même un petit bonus sympa.


## Processus créatif

L'objectif de cette partie est de présenter le processus créatif derrière le jeu et d'en expliquer les choix. Tout cela n'est bien sur des réflexions et non des affirmations, le but n'est pas d'enseigner quelque chose mais bien de partager notre expériences et nos retours. J'espère que ça intéressera ou même que ça enrichira la réflexion d'autres personnes dans leur developpement.

### L'idée d'origine

Dès le début, notre idée a été de partir sur un jeu simple, pour plusieurs raisons. La première est que nous voulions pouvoir terminer le jeu malgré le temps limité (1 mois et demi) et le fait qu'on découvre babylon.js. La deuxième, c'est que nous pensons qu'un jeu n'a pas besoin d'être complexe pour être amusant, au contraire, cela peut surcharger le joueur ou déborder les devs si c'est mal maitrisé. Enfin, nous voulions que n'importe qui puisse y jouer, peu importe que la personne ait déjà joué aux jeux vidéos ou non.

Nous avons alors décidé de faire un "puzzle-game", proche d'un sokoban. Un sokoban, c'est un style de jeu où l'on doit pousser des caisses pour les placer au bon endroit. L'idée était d'adapter ce style en 3D, donc pousser une caisse dans le vide la fait tomber et nous permet de marcher dessus, et donc de se créer des chemins. Le but sera donc d'atteindre une arrivée en se créant un chemin avec les caisses.

Cette idée est intégrable dans n'importe quel environnement dont dreamland, le thème de cette année, mais il fallait pour nous qu'une mécanique découle de ce monde onirique. Nous avons alors décidé qu'il y aurait un autre monde, un monde parallèle, le monde cauchemar dans lequel on pourrait pafois basculer.

C'est sur ces 2 idées que s'est créé tout le jeu.

### Mécaniques du jeu

Tout le gameplay est donc basé sur 2 mécaniques, pousser des caisses et changer de monde. 

Pousser une caisse, cela peut avoir plusieurs impact. Ça peut permettre de créer une plateforme en la poussant dans le vide ou de libérer une case pour le joueur. Si une caisse est poussée contre un rocher, elle est "deadlock", c'est à dire qu'on ne peut plus la récupérer (à moins qu'on puisse la déplacer sur le coté pour quitter les rochers). Le vide, lui, fait office de semi-deadlock. En effet, il nous empèche de récupérer la caisse mais laisse quand même ouvertes des possibilités, celles de pousser la caisse dans le vide. De plus, on peut pousser 2 caisses à la fois, mais pas 3. Cela permet un grand nombre de possibilités tout en restant suffisament contraignant pour laisser du challenge.

Présenté comme cela, le but du jeu est alors d'éviter les pièges, les deadlocks et explorer les possibilités restantes pour se déplacer comme prévu et atteindre l'arrivée. Il faut donc visualiser son parcours, prévoir ses actions et c'est de la réussite de cela que semble venir l'intérêt et du jeu et l'amusement qu'il procure. C'est une chose à garder en tête lors de la conception des niveaux.

À cela s'ajoute le monde cauchemar. C'est un monde parallèle, donc qui partage la même spatialité, mais avec une disposition des tuiles (les cases, comportant des nuages, rochers etc) différentes. La seule chose commune est l'avatar ainsi que les caisses, qui tombent d'un monde à l'autre mais restent aux mêmes emplacements, et le seul moyen d'y accéder est par des portes fixes. Cela ajoute donc 2 nouvelles composantes au jeu. Tout d'abord, une visualisation différente de l'espace de jeu. Il faut composer avec un monde systématiquement caché (donc le retenir) et se situer dans l'espace global.

Ensuite, cela rajoute une gestion de la hauteur : une porte peut donner sur une plateforme plus haute et il est maintenant possible d'empiler des caisses et de s'en servir. C'est donc un véritable ajout, qui change et complexifie la manière de jouer, ce qui lui donne de l'intérêt mais oblige alors de passer par une 2ème phase d'apprentissage.

On a donc un gameplay simple à comprendre (pour peu qu'il soit correctement enseigné) et accessible mécaniquement, ce qui devrait permettre à des personnes ne jouant pas aux jeux vidéos d'y jouer, tout en gardant une certaine profondeur.

### Level-design

C'est probablement la partie la plus cruciale, car de bonnes mécaniques n'ont aucun intérêt si elle ne sont pas bien exploitées et mise en valeur.

Chaque niveau est basé sur 1 ou 2 "twist" maximum. Ce que j'appelle "twist", c'est des petites astuces, des mouvements spécifiques qui permettent de débloquer la situation. Un niveau sans cela n'a pas vraiment d'intéret ludique. Mais il faut éviter d'éviter d'en mettre trop, au risque de noyer le joueur, et de lui voler le sentiment de réussite car au lieu d'atteindre l'arrivée, il sera encore bloqué par autre chose. La seule exception est le tout dernier niveau pour lequel j'ai jugé pouvoir en mettre plus pour le complexifier.

Un niveau peut aussi permettre de montrer les mécaniques du jeu, ou des manières de résoudre un problème. C'est évidemment le cas des premiers niveaux du jeu, qui nous servent de tutoriels. Ici, le but est directement de limiter les choix du joueurs pour lui montrer les mécaniques du jeu de la manière la plus claire possible. Mais cela peut être un peu plus subtil, et certains niveaux enseignent des twists utiles pour celui ou ceux d'après. C'est notamment le cas des niveaux utilisant le monde cauchemar.

Pour ce monde cauchemar, on a pris le choix de séparer les niveaux avec et sans pour enseigner les bases du jeux aux joueurs sans les perdre plus que nécessaire et leur permettre d'en profiter. Ce n'est qu'une fois cela fait qu'on peut se permettre de l'ajouter pour complexifier un peu les niveaux, repassant alors par une phase d'apprentissage.

Tout les niveaux ont eu le droit à de nombreux tests par des personnes extérieures au projet (merci à elles), ce qui nous a aider a les ajuster pour éviter les pics de difficultés, les niveaux frustrants, les moments injustes ou les incompréhensions. Cet équilibrage reste malgré tout difficile car propre à chaque joueur-euse-s.

### L'ergonomie

Nous avons aussi tenté d'améliorer l'ergonomie du jeu, pour qu'il soit le moins frustrant possible, au moins mécaniquement.

L'ajout le plus significatif, c'est le boutoun B (Undo) qui permer d'annuler une action. Ce bouton a vite été nécessaire, au fur et à mesure des avancées dans le level design. En effet, pouvoir annuler lorsqu'on s'est bloqué permet d'éviter de recommencer le niveau pour une petite erreur. Ça permet aussi de réfléchir en situation, de tester des possibilités sans être puni pour ça. C'est donc plus agréable et permet d'éviter beaucoup de frustrations.

Une autre feature importante est l'icone des flèches du clavier. Son orientation permet de savoir comment se déplacer. Les contrôles du jeu sont adaptifs, ils dépendent de la caméra. Cette mécanique a été choisi parmi d'autres possibilités parce que c'était la solution la plus intuitive, mais on peut parfois être perdu ou hésiter dans certains angles de caméra. L'icone est donc là pour rappeller à chaque instant les contrôles si besoin.