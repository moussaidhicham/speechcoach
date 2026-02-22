# Script de Présentation PFE : SpeechCoach

Ce document contient l'aide-mémoire et le script détaillé pour présenter le projet SpeechCoach lors de la réunion d'avancement.

## Partie 1 : Slides (Speaker Notes)

### Slide 1 : Titre (SpeechCoach)
"Bonjour monsieur/madame [Nom de l'encadrant], et merci de m'accorder ce temps pour notre réunion de suivi. Aujourd'hui, je vais vous présenter l'état d'avancement de mon projet de fin d'études : SpeechCoach. Pour rappel, il s'agit d'un coach virtuel conçu pour analyser la prise de parole en public de manière multimodale, c'est-à-dire en analysant à la fois l'audio et la vidéo."

### Slide 2 : Plan
"Pour organiser cette présentation, nous allons suivre ce plan :
Dans un premier temps, je ferai un rappel rapide de l'objectif et de l'architecture dynamique du projet. Ensuite, je vous détaillerai comment j'ai modélisé mathématiquement les métriques audio et vision.
Dans la troisième partie, nous ferons le point sur les sprints validés et les défis techniques que j'ai pu contourner la semaine dernière. Enfin, nous aborderons la roadmap des prochaines étapes avant de passer à une rapide démonstration."

### Slide 3 : Objectif : Au-delà de la Transcription
"Pour remettre un peu de contexte : aujourd'hui, la plupart des outils d'analyse se contentent de retranscrire le texte. Or, la règle de Mehrabian nous dit que 93% de la communication est non-verbale.
L'ambition de SpeechCoach est donc d'analyser non seulement le fond (ce qui est dit), mais surtout la forme (comment on le dit). Cela demande d'analyser la voix (le débit, les silences) et le corps (le contact visuel, l'utilisation des mains)."

### Slide 4 : Architecture Technique
"Sur le plan technique, j'ai mis en place une architecture modulaire. Le fonctionnement est le suivant :
Une vidéo MP4 est ingérée et immédiatement séparée en deux flux distincts par FFmpeg. Ces deux flux sont traités de façon totalement isolée par nos deux 'cerveaux' : l'axe audio par des modèles comme Whisper, et l'axe vision par MediaPipe.
À l'issue de cette étape, un module de fusion vient agréger l'ensemble des données pour générer le rapport final."

### Slide 5 : Stack Technologique
"Du côté de la stack technique, tout le noyau est codé en Python pour sa robustesse en Data/IA.
Pour l'audio, j'utilise Faster-Whisper qui offre d'excellentes performances de transcription par rapport au Whisper classique, couplé à Librosa pour l'analyse des fréquences sonores.
Pour la vision, c'est MediaPipe qui s'occupe de la détection du maillage du visage et du squelette des mains, avec OpenCV.
Tout ce socle est actuellement robuste et opérationnel."

### Slide 6 : Métriques Audio
"Si l'on rentre dans la technique, comment sont calculées ces métriques ?
Pour le débit de parole (le WPM), je le calcule en divisant le nombre de mots par la durée de la parole 'active'. C'est un choix important : cela évite de pénaliser un orateur qui fait volontairement un long silence dramatique.
Pour détecter ces silences justement, j'utilise l'énergie RMS. Dès que le volume descend sous un seuil relatif (-30 décibels en dessous du pic de la vidéo) et que cela dure plus d'une demi-seconde, c'est comptabilisé comme un vrai silence."

### Slide 7 : Métriques Vision
"Côté vision, je me repose sur des heuristiques géométriques.
L'un des défis était le contact visuel. Grâce à MediaPipe, je récupère les angles d'Euler de la tête (haut/bas, gauche/droite). J'ai défini une règle tolérante (le 'Pitch' ne doit pas descendre sous -25 degrés). Si la tête s'incline plus bas, l'algorithme comprend que l'orateur est en train de lire ses notes et que le contact visuel avec le public est rompu.
Pour les mains, je calcule simplement la dérivée temporelle de la position des poignets pour obtenir une 'vitesse' d'expression vitale."

### Slide 8 & 8b : État d'Avancement (Les Sprints) et Validation
"Concrètement, où en sommes-nous aujourd'hui par rapport à la roadmap initiale ?
Je suis heureux de dire que nous sommes légèrement en avance. Les Sprints 0 à 5 sont validés. Toute la base d'extraction des métriques — qu'elle soit textuelle, audio ou liée au regard et à la gestuelle — fonctionne.
Avant de clôturer cette phase d'extraction, j'ai vérifié la robustesse de l'algorithme sur plusieurs profils types. Par exemple, sur un profil 'Action', l'outil a parfaitement isolé un débit vocal élevé avec un corps très fixe. Sur un profil 'Posé', il a détecté une très forte expressivité avec les mains. Le pipeline comprend donc bien les nuances de la communication."

### Slide 9 : Problèmes Rencontrés & Solutions
"Durant ces premiers sprints, j'ai dû résoudre quelques problématiques intéressantes.
Le plus épineux était avec Whisper : ce modèle d'IA est 'trop' intelligent. Par défaut, il nettoie les transcriptions et supprime les bégaiements ou les 'euh'. Or, pour un coach vocal, ces hésitations sont la donnée que je cherche ! J'ai donc dû ajouter une analyse hybride du signal pour repérer les hésitations que l'IA textuelle essayait de masquer.
J'ai également ajusté les calculs du regard pour compenser le fait que sur un ordinateur portable, l'utilisateur a naturellement la tête très légèrement inclinée vers le bas."

### Slide 10 : Roadmap & Prochaines Étapes
"Pour la suite, les prochaines semaines seront dédiées au 'cerveau' du coach.
Le Sprint 6 servira à scripter les agrégations pour générer un feedback chiffré. Le Sprint 7 introduira un moteur de règles qui transformera des défauts (par exemple un débit trop rapide) en une sélection des '3 recommandations principales'.
À terme, pour la soutenance, j'aimerais intégrer un LLM local qui formulera ces conseils en langage naturel, comme un vrai mentor, avec une petite interface web."

---

## Partie 2 : Démonstration Pratique (Terminal & Code)

### 1. Explication de la structure du projet
*(Affiche ton éditeur de code, par exemple VS Code, avec l'arborescence des dossiers sur le côté)*

"Pour vous montrer concrètement comment ça fonctionne, voici la structure de mon projet.
Le projet est divisé en blocs logiques, ce qui le rend facile à maintenir :
* Premièrement, nous avons le dossier **`ingest`**. Dedans, il y a un script qui utilise FFmpeg pour prendre une vidéo et séparer l'image et le son. C'est la première étape.
* Ensuite, on a le dossier **`audio`**. Celui-ci contient les fichiers pour analyser le son. Par exemple, le fichier `asr.py` utilise l'IA de Whisper pour transcrire le discours en texte et le fichier `analytics.py` calcule la vitesse de parole et compte lesressions et silences.
* De l'autre côté, on a le dossier **`vision`**. Ici, le fichier `analysis.py` utilise MediaPipe pour détecter mon visage et mes mains, et vérifier si je regarde bien la caméra.
* Enfin, le dossier **`metrics`** regroupe toutes ces informations et le dossier **`outputs`** est l'endroit où le rapport final sera sauvegardé.

Le fichier le plus important est à la racine : c'est **`process_video.py`**. C'est le chef d'orchestre. Il appelle tous les autres modules dans le bon ordre."

### 2. Lancement du test
*(Ouvre ton terminal. Prépare la commande mais ne l'exécute pas tout de suite)*

"Maintenant, passons à la pratique. J'ai enregistré une courte vidéo de moi-même avec la webcam de mon PC ce matin pour le test.
Dans le terminal, je vais lancer mon fichier principal avec cette vidéo en paramètre."

*(Exécute la commande dans le terminal, par exemple : `python process_video.py ma_video.mp4`)*

"Pendant que le script tourne, vous pouvez voir dans le terminal que l'IA travaille étape par étape...
1. Elle extrait l'audio.
2. Elle transcrit le texte, et détecte les mots par minute.
3. Elle analyse les images pour voir la position de ma tête et de mes mains.

*(Attend que le script finisse et génère le résultat)*

Voilà, c'est terminé ! Le script a généré un rapport détaillé dans le dossier `outputs`. Ouvons-le."

### 3. Explication des résultats
*(Ouvre le fichier de résultat généré devant le prof)*

"Comme vous pouvez le voir sur les résultats :
* Pour l'**Audio** : Mon débit de parole était de X mots par minute [donne le vrai chiffre], avec X pauses détectées. L'IA a bien capté les moments où j'ai réfléchi.
* Pour la **Vision** : L'algorithme a remarqué que j'ai gardé le contact visuel [ex: 85%] du temps, mais il montre que j'ai regardé mes notes au milieu de la vidéo.

Ce qui est vraiment intéressant, c'est que le système a réussi à capturer à la fois la fluidité de ma voix et mon comportement physique, de manière totalement automatique."
