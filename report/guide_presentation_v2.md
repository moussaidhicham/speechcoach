# 📋 Guide de Préparation — Réunion d'Avancement n°2
## SpeechCoach : Sprints 6 à 9

---

## PARTIE 1 : SCRIPT SLIDE PAR SLIDE

> 💡 Pour chaque slide, le script est rédigé en style oral naturel.
> Les mots-clés à accentuer sont en **gras**.

---

### Slide 1 — Titre
*(pas de discours, juste l'introduction)*

> « Bonjour, je vais vous présenter le bilan d'avancement du projet **SpeechCoach** pour les **sprints 6 à 9**. Cette phase marque le passage d'un simple extracteur de métriques vers un véritable **coach virtuel intelligent** capable de guider les étudiants. »

---

### Slide 2 — Plan de la Présentation

> « Voici le plan de la présentation. Dans la **première partie**, je vous montrerai le pipeline global avec un flowchart et l'état d'avancement. Ensuite, dans la **deuxième partie**, on verra comment on transforme les métriques brutes en score et en recommandations, d'abord par des **règles déterministes** puis par une **architecture RAG**. La **troisième partie** couvrira l'intégration du **LLM** — le cerveau du coach — avec des exemples de feedback réels. Enfin, on terminera par les **optimisations de performance** et les **perspectives** pour les prochains sprints. »

---

### Slide 3 — Architecture Globale (Flowchart)

> « Voici le **pipeline complet** du système. Tout commence par un **fichier vidéo MP4**. L'outil **FFmpeg** se charge de l'ingestion : il extrait le **fichier audio WAV** et les **frames vidéo** séparément.

> Ensuite, deux axes s'exécutent **en parallèle** grâce à un **ThreadPoolExecutor** :
> - L'**axe audio** utilise **Whisper** pour la transcription, puis **Librosa** pour analyser le signal (débit, pauses, énergie).
> - L'**axe vision** utilise **MediaPipe** pour le regard et la posture, et **OpenCV** pour la qualité de la scène.

> Les résultats des deux axes convergent vers le **module de scoring** qui donne un score global sur 100. Ce score alimente ensuite le **RAG** (qui récupère des fiches pédagogiques pertinentes dans **FAISS**), puis le **LLM** — ici **Llama 3.2** — qui génère le feedback final.

> Point important : **tout est local**, aucune donnée ne quitte la machine de l'utilisateur. »

---

### Slide 4 — État d'Avancement (Roadmap)

> « Au niveau de l'avancement, vous pouvez voir que les **sprints 0 à 5** ont été présentés lors de la première réunion — c'est tout le socle technique : le pipeline FFmpeg, Whisper, MediaPipe, etc.

> Depuis, on a réalisé **quatre sprints supplémentaires** :
> - **Sprint 6** : le scoring pédagogique avec un score global sur 100, basé sur la pondération de Mehrabian.
> - **Sprint 7** : un moteur de recommandations basé sur des **règles déterministes**, qui donne un Top 3 de conseils actionnables et un plan d'entraînement sur 7 jours.
> - **Sprint 8** : l'architecture **RAG**, avec une base vectorielle FAISS indexant des fiches pédagogiques.
> - **Sprint 9** : l'intégration du **LLM local** — Llama 3.2 3B — pour générer un feedback fluide et humain.

> On est **en avance** sur le planning initial : le coaching IA, prévu pour mai, est déjà fonctionnel en mars. »

---

### Slide 5 — Sprint 6 : Scoring Multimodal

> « Le Sprint 6, c'est le passage **du chiffre au score pédagogique**. On a défini deux axes principaux :

> **L'axe audio** évalue trois choses : le **débit** — la zone idéale est entre 130 et 160 mots par minute —, la **fluidité** — les "euh" comptent comme des pénalités —, et la **dynamique vocale** — une voix monotone est pénalisée.

> **L'axe vision** regarde le **contact visuel** — avec un seuil professionnel relevé à 92%, qui est le standard des présentations TED —, la **posture** — un corps figé perd des points —, et le **cadrage** — le visage doit rester bien visible dans la frame.

> La formule du score global, c'est simplement la moyenne des quatre sous-scores (Voix, Posture, Regard, Scène) multipliée par 10.

> Un problème important qu'on a résolu : les premiers scores donnaient **99/100 systématiquement** parce que les seuils étaient trop souples. On a recalibré au niveau "TED Talk" et maintenant les scores varient entre **50 et 96** selon la qualité réelle. »

---

### Slide 6 — Sprint 7 : Moteur de Recommandations (Règles)

> « Avant d'intégrer un LLM, on a voulu s'assurer que le système donne déjà un **feedback utile par des règles simples**.

> Le principe est une logique **"Condition → Conseil"**. Chaque métrique est testée contre des seuils. Par exemple, si le WPM dépasse 160, le système dit "Votre débit est trop rapide". Si l'eye contact est en dessous de 40%, il propose "Collez un post-it à côté de l'objectif de votre caméra".

> Chaque règle a un **score de sévérité** entre 0 et 100. On trie par criticité et on garde le **Top 3** — les trois axes d'amélioration les plus urgents.

> À partir de ces trois recommandations, le système génère automatiquement un **plan d'entraînement sur 7 jours**, avec des exercices progressifs adaptés aux faiblesses détectées.

> C'est le module `recommendations.py` qui contient **plus de 10 règles** couvrant tous les axes : voix, regard, gestuelle, cadrage et environnement. »

---

### Slide 7 — Sprint 8 : Architecture RAG

> « Le Sprint 8 enrichit les recommandations avec des **fiches pédagogiques réelles**. C'est l'architecture **RAG** : Retrieval-Augmented Generation.

> Le processus est le suivant : les **faiblesses détectées** sont d'abord transformées en recommandations déterministes (Sprint 7), puis ces recommandations sont **vectorisées** par un modèle d'embedding (**MiniLM-L12**, un modèle multilingue à 384 dimensions). Ces vecteurs sont comparés à une base de **12 fiches pédagogiques** indexées dans **FAISS**, la librairie de Facebook pour la recherche vectorielle ultra-rapide. On récupère le **Top 3** des fiches les plus pertinentes par similarité cosinus, puis on les injecte dans le prompt du LLM.

> **Pourquoi le RAG plutôt que juste un LLM ?** Deux raisons : premièrement, c'est **anti-hallucination** — le modèle ne peut pas inventer de conseils puisqu'il s'appuie sur des documents réels. Deuxièmement, c'est **traçable** — chaque conseil est lié à une fiche source identifiable. »

---

### Slide 8 — Sprint 9 : Migration du LLM

> « Le Sprint 9, c'est le **cerveau du coach** — l'intégration du LLM local.

> On a commencé avec **Llama 3.2 1B**, le modèle à 1 milliard de paramètres. Mais on a rencontré des problèmes graves :
> - Des **hallucinations logiques** : Il confondait les forces et les faiblesses. Par exemple, il écrivait "Votre point fort est un regard insuffisant".
> - Un **ton robotique** : des listes à puces répétitives sans cohérence.
> - Il **n'obéissait pas** aux consignes négatives et ajoutait des introductions comme "Bonjour, voici votre bilan".

> On a donc migré vers **Llama 3.2 3B** — 3 milliards de paramètres — qui résout tous ces problèmes : raisonnement fluide, distinction parfaite entre forces et faiblesses, et un ton naturel de coaching.

> Le point clé de cette version, c'est la **stratégie "Text Completion"** : au lieu de donner des instructions complexes au modèle, on lui donne des **"phrases à trous"** qu'il complète naturellement. On fait **trois appels séquentiels** : un pour le Bilan, un pour le Conseil prioritaire, et un pour la Motivation.

> Et tout ça tourne **100% en local** grâce à **Ollama**, avec seulement **2 Go de RAM**. Pas de cloud, pas de fuite de données. »

---

### Slide 9 — Exemples de Feedback Réels

> « Voici deux exemples **réels** générés par le système.

> À gauche, un test avec un score de **52.6/100** : le système identifie les problèmes de posture et de cadrage visuel, et donne un conseil concret sur les mains. La motivation est encourageante malgré le score bas.

> À droite, un test avec **95.7/100** : le ton est beaucoup plus félicitant, il reconnaît le rythme vocal exceptionnel et donne comme seule amélioration possible l'éclairage.

> Trois choses importantes à noter :
> 1. **Pas de "Bonjour"** : le modèle entre directement dans l'analyse, comme un vrai coach.
> 2. **Cohérence logique** : le score bas déclenche un bilan plus critique, le score haut est félicitant.
> 3. **Perspective "Vous"** : un ton Coach-Élève, respectueux et engageant. »

---

### Slide 10 — Optimisation du Temps de Traitement (RTF)

> « Un problème majeur qu'on a dû résoudre : le **temps de traitement**. Au début, l'analyse prenait **2.77 fois le temps réel** — soit 10 minutes de calcul pour une vidéo de 4 minutes. Inacceptable.

> On a actionné **trois leviers** :
> - **Audio** : on a réduit le beam size de Whisper de 5 à 1, activé la quantification INT8, et forcé la langue pour éviter la détection automatique qui prenait 30 secondes. Gain : **x2.5**.
> - **Vision** : on a réduit la résolution de 720p à 360p, avec un saut intelligent de frames. Gain : **x1.8**.
> - **Pipeline** : on a parallélisé Audio et Vision avec un ThreadPoolExecutor au lieu de les exécuter séquentiellement. Gain : **x1.5**.

> **Résultat final : RTF 1.01x** — on est au temps réel. L'analyse d'une vidéo de 2 minutes prend environ 2 minutes. »

---

### Slide 11 — Gestion de la Mémoire

> « Un autre défi crucial : la **mémoire RAM**. L'exécution est 100% locale, souvent sur un PC étudiant avec 8 Go de RAM. Si on charge tous les modèles en même temps — Whisper, MediaPipe, les embeddings et le LLM — on dépasse la capacité.

> La solution, c'est ce qu'on a appelé le **"Garbage Collection Cognitif"** : un chargement et destruction **séquentiel** des modèles.
> - **Phase 1** : on charge Whisper + Librosa (~1.5 Go), on fait la transcription, puis on **libère la mémoire**.
> - **Phase 2** : on charge MediaPipe + OpenCV (~0.8 Go), on analyse la vidéo, puis on **libère**.
> - **Phase 3** : on charge Sentence-Transformers (~0.5 Go) pour le RAG, puis on **libère**.
> - **Phase 4** : Ollama, qui gère le LLM dans un process externe séparé.

> Résultat : le pic mémoire reste **inférieur à 2.5 Go**, et le système est stable même sur des machines modestes. »

---

### Slide 12 — Problèmes Rencontrés & Solutions

> « Pour résumer les quatre problèmes majeurs qu'on a rencontrés :

> 1. **Hallucinations du LLM 1B** : confusion entre forces et faiblesses → Migration vers le 3B avec la stratégie de phrases à trous.
> 2. **Scores irréalistes (99/100)** : seuils trop souples → Recalibrage au standard TED Talk avec un seuil de regard à 92%.
> 3. **Régression de performance** : l'ajout du RAG et du LLM a fait exploser le RTF → Garbage collection séquentiel.
> 4. **Bug regex destructeur** : la fonction de nettoyage du texte généré supprimait des paragraphes entiers → Réécriture chirurgicale de la regex. »

---

### Slide 13 — Perspectives (Sprint 10-12)

> « Pour les prochains sprints, on passe **du code au produit**.

> **Sprint 10** : on développe un **Dashboard Web** avec un backend **FastAPI** qui expose le pipeline comme un service REST, et un frontend **React** avec des graphiques interactifs.
> **Sprint 11** : on ajoute un **historique** pour suivre la progression de l'étudiant sur 7 jours.
> **Sprint 12** : documentation finale et préparation de la **soutenance**.

> L'objectif final reste un outil fonctionnel, testé et documenté, **100% local et confidentiel**. »

---

### Slide 14 — Démonstration

> « Je vais maintenant vous faire une démonstration en direct. On va lancer `python process_video.py` sur un fichier vidéo test, et vous verrez le système analyser la vidéo puis générer le rapport complet avec le feedback du coach IA. »

---

### Slide 15 — Merci

> « Merci de votre attention. Je suis disponible pour vos questions. »

---

## PARTIE 2 : QUESTIONS POSSIBLES DU PROF & RÉPONSES

---

### Q1 : « Pourquoi avoir choisi un modèle local au lieu d'utiliser ChatGPT ou une API cloud ? »

> **Réponse :** « Trois raisons principales. Premièrement, la **confidentialité** : les vidéos des étudiants contiennent leur visage et leur voix, ce sont des données sensibles qu'on ne veut pas envoyer vers un serveur externe. Deuxièmement, l'**indépendance** : le système doit fonctionner sans connexion internet, par exemple dans une salle de cours ou dans un campus avec une connexion limitée. Troisièmement, le **coût** : une API comme GPT-4 coûte par token, et chaque analyse de vidéo générerait un coût non négligeable pour un étudiant. Avec Ollama et Llama 3.2, tout est gratuit et illimité. »

---

### Q2 : « Comment garantissez-vous que le LLM ne produit pas d'hallucinations ? »

> **Réponse :** « On utilise trois garde-fous. D'abord, le **RAG** — le modèle ne génère pas de conseils à partir de rien, il s'appuie sur des fiches pédagogiques réelles récupérées par similarité vectorielle. Ensuite, la **stratégie Text Completion** — au lieu de demander au modèle "analyse ceci", on lui donne des phrases préformatées qu'il complète, ce qui contraint fortement sa sortie. Enfin, les **recommandations déterministes** du Sprint 7 servent de fallback : même si le LLM échoue, l'utilisateur reçoit quand même un feedback utile basé sur des règles. »

---

### Q3 : « Comment fonctionne exactement le RAG dans votre système ? »

> **Réponse :** « Le RAG repose sur trois étapes. D'abord, les faiblesses de l'utilisateur sont transformées en vecteurs par un modèle d'embedding multilingue appelé MiniLM-L12, qui produit des vecteurs de 384 dimensions. Ensuite, ces vecteurs sont comparés par similarité cosinus à une base de 12 fiches pédagogiques indexées dans FAISS. On récupère les 3 fiches les plus pertinentes. Enfin, ces fiches sont injectées dans le prompt du LLM pour que sa réponse soit fondée sur des sources réelles et non sur des inventions. »

---

### Q4 : « Pourquoi 3B paramètres et pas 7B ou 13B ? »

> **Réponse :** « C'est un compromis entre **qualité et déployabilité**. Le modèle 1B était trop limité — il hallucinait et ne suivait pas les consignes. Le 3B offre un raisonnement suffisamment fluide pour notre cas d'usage. Un modèle 7B ou 13B donnerait une meilleure qualité de texte, mais il nécessiterait un GPU dédié, ce qui va à l'encontre de notre objectif de fonctionner sur n'importe quel PC étudiant. Le 3B ne consomme que 2 Go de RAM et tourne sur CPU. »

---

### Q5 : « Comment est calculé le score global de 100 ? »

> **Réponse :** « Le score est la moyenne de quatre sous-scores, chacun noté sur 10 : Voix & Débit (basé sur le WPM et les fillers), Posture & Gestes (basé sur l'activité des mains et leur visibilité), Regard & Présence (basé sur le pourcentage d'eye contact), et Cadrage & Scène (basé sur la luminosité, la netteté et la présence du visage). Les seuils ont été calibrés pour être exigeants — par exemple, il faut plus de 92% de contact visuel pour obtenir un 10/10 en regard. »

---

### Q6 : « Comment détectez-vous le contact visuel exactement ? »

> **Réponse :** « On utilise une estimation de la pose de la tête — le Head Pose Estimation — via les landmarks 3D de MediaPipe Face Mesh. On extrait les trois angles d'Euler : Yaw (gauche/droite), Pitch (haut/bas) et Roll (inclinaison). On considère que l'utilisateur regarde la caméra si les angles Yaw et Pitch sont dans des seuils raisonnables. On a aussi calibré une tolérance asymétrique pour le Pitch, parce que les webcams de laptop forcent un regard légèrement vers le bas. »

---

### Q7 : « Pourquoi FAISS plutôt qu'une simple base de données ? »

> **Réponse :** « Une base de données classique fait des recherches par mots-clés — il faut que les mots correspondent exactement. FAISS fait de la recherche **sémantique** : il compare le **sens** des phrases, pas les mots exacts. Par exemple, si l'utilisateur a un problème de "regard fuyant", FAISS trouvera une fiche intitulée "maintenir le contact visuel" même si les mots sont différents. C'est beaucoup plus pertinent pour du coaching. Et en termes de performance, FAISS est optimisé par Meta AI pour rechercher dans des millions de vecteurs en quelques millisecondes. »

---

### Q8 : « Comment avez-vous choisi vos seuils de scoring (92% pour le regard etc.) ? »

> **Réponse :** « On a procédé par itération empirique. Les premiers seuils étaient basés sur la littérature, mais ils donnaient des scores trop généreux. On a ensuite analysé manuellement une dizaine de vidéos en comparant le score généré à notre évaluation humaine. On a durci les seuils jusqu'à obtenir une distribution réaliste — entre 50 et 96/100 — qui reflète la qualité perçue. Le seuil de 92% pour le regard est inspiré du standard des présentations professionnelles (type TED Talk). »

---

### Q9 : « Qu'est-ce que le RTF (Real-Time Factor) ? »

> **Réponse :** « Le RTF, ou Real-Time Factor, est le ratio entre le temps de traitement et la durée de la vidéo. Un RTF de 1.0 signifie que l'analyse prend exactement le même temps que la vidéo. Un RTF de 2.77 signifie qu'une vidéo de 4 minutes prend environ 11 minutes à analyser. Notre objectif était d'atteindre un RTF de 1.0 — le temps réel — et on y est arrivé avec un RTF de 1.01x grâce aux optimisations audio, vision et pipeline. »

---

### Q10 : « Le modèle de Mehrabian (93% non-verbal) n'est-il pas controversé ? »

> **Réponse :** « Oui, la règle du 7-38-55 de Mehrabian est souvent citée de manière simplifiée. Dans l'étude originale, elle ne s'applique qu'à la communication de sentiments et d'attitudes, pas à tout type de discours. Cependant, dans notre contexte — l'évaluation d'une prise de parole — l'idée que le non-verbal joue un rôle majeur reste valide. On utilise le modèle de Mehrabian comme un **cadre de pondération** pour justifier l'importance qu'on donne au regard et à la posture dans le score global, pas comme une vérité scientifique absolue. »

---

### Q11 : « Comment assurez-vous la reproductibilité des résultats ? »

> **Réponse :** « Les métriques audio et vision sont entièrement déterministes — pour la même vidéo, on obtient toujours exactement les mêmes scores. La seule source de variabilité est le LLM, qui peut formuler le feedback différemment à chaque exécution, mais le fond du message reste cohérent car il est ancré par le RAG et les métriques fixes. On vérifie la stabilité en faisant tourner 10 runs consécutifs et en validant que le JSON de scoring est identique. »

---

### Q12 : « Est-ce que le système fonctionne en anglais et en français ? »

> **Réponse :** « Oui. Whisper détecte automatiquement la langue de la vidéo, et l'analyse audio fonctionne indépendamment de la langue. Pour les fillers, on a un lexique adapté pour le français ("euh", "hum") et l'anglais ("uh", "um", "like"). Le modèle d'embedding du RAG est multilingue (paraphrase-multilingual-MiniLM), et le LLM Llama 3.2 est capable de générer du texte dans les deux langues. On force cependant la sortie en français pour la cohérence. »

---

### Q13 : « Est-ce que le Thread Pool ne pose pas de problèmes avec le GIL de Python ? »

> **Réponse :** « Bonne question. Le GIL (Global Interpreter Lock) de Python empêche l'exécution parallèle de code Python pur. Mais dans notre cas, les deux tâches sont principalement des appels à des librairies C/C++ (Whisper via CTranslate2, MediaPipe via C++). Ces librairies relâchent le GIL pendant l'exécution, ce qui permet un vrai parallélisme avec ThreadPoolExecutor. On a mesuré un gain réel de x1.5, ce qui confirme que le parallélisme est effectif. »

---

### Q14 : « Pourquoi ne pas utiliser un VLM (Vision Language Model) pour analyser directement la vidéo ? »

> **Réponse :** « C'est une approche intéressante mais prématurée pour notre contexte. Un VLM comme GPT-4V pourrait théoriquement analyser une vidéo de bout en bout, mais il nécessite une API cloud (confidentialité), coûte cher par requête, et n'est pas exécutable localement. Notre approche modulaire nous donne un contrôle total sur chaque métrique, une traçabilité complète, et une exécution 100% locale. C'est dans le "plan anti-retard" du prof : les VLMs sont à sacrifier en premier si on manque de temps. »

---

### Q15 : « Comment les fiches pédagogiques du RAG ont-elles été créées ? »

> **Réponse :** « Les fiches ont été rédigées manuellement à partir de la littérature sur la prise de parole en public et le coaching vocal. Chaque fiche couvre un sujet (gestion du regard, posture, élimination des parasites, etc.) et contient des conseils actionnables et des exercices. On a actuellement 12 fiches dans la base. Ce corpus est extensible — il suffit d'ajouter un document au format JSON et de relancer l'indexation FAISS. »

---

## PARTIE 3 : GLOSSAIRE TECHNIQUE

| Terme | Définition / Rôle dans SpeechCoach |
|-------|--------------------------------------|
| **FFmpeg** | Outil open-source de manipulation audio/vidéo. Utilisé pour extraire le WAV et les frames depuis un fichier MP4. |
| **Whisper** | Modèle de reconnaissance vocale (ASR) d'OpenAI. Transcrit la parole en texte avec timestamps. |
| **Faster-Whisper** | Implémentation optimisée de Whisper via CTranslate2. Plus rapide et moins gourmande en mémoire. |
| **CTranslate2** | Moteur d'inférence optimisé pour les modèles Transformer. Permet la quantification INT8. |
| **Librosa** | Librairie Python d'analyse audio. Utilisée pour calculer l'énergie RMS, détecter les silences et les pauses. |
| **MediaPipe** | Framework de Google pour la vision par ordinateur en temps réel. Utilisé pour Face Mesh (468 landmarks) et Pose (33 keypoints). |
| **OpenCV** | Librairie de vision par ordinateur. Utilisée pour mesurer la luminosité, le flou (Laplacien), et le cadrage. |
| **WPM** | Words Per Minute : le débit de parole en mots par minute. Zone idéale : 130-160 WPM. |
| **RTF** | Real-Time Factor : ratio temps de traitement / durée vidéo. RTF 1.0 = temps réel. |
| **RMS** | Root Mean Square : mesure de l'énergie moyenne d'un signal audio. Permet de détecter parole vs silence. |
| **Fillers** | Hésitations verbales (« euh », « um », « like »). Indicateur de fluidité du discours. |
| **Head Pose Estimation** | Estimation de l'orientation de la tête en 3D (Yaw, Pitch, Roll) à partir des landmarks du visage. |
| **Yaw** | Angle de rotation gauche/droite de la tête. |
| **Pitch** | Angle de rotation haut/bas de la tête. |
| **Roll** | Angle d'inclinaison latérale de la tête. |
| **Eye Contact Ratio** | Pourcentage du temps où l'utilisateur regarde approximativement la caméra (basé sur le Head Pose). |
| **Face Mesh** | Module MediaPipe qui détecte 468 points (landmarks) sur le visage en temps réel. |
| **Landmarks** | Points de repère anatomiques détectés sur le visage ou le corps. |
| **Scoring** | Processus de transformation des métriques brutes en un score pédagogique sur 100. |
| **Mehrabian (Règle)** | Modèle de communication (7% verbal, 38% vocal, 55% visuel). Utilisé comme cadre de pondération des scores. |
| **Recommandations (rule-based)** | Système déterministe : conditions sur les métriques → conseils actionnables. Pas de LLM nécessaire. |
| **RAG** | Retrieval-Augmented Generation : on récupère des documents pertinents avant de générer du texte avec un LLM. Anti-hallucination. |
| **FAISS** | Facebook AI Similarity Search : librairie de recherche de similarité vectorielle ultra-rapide. Indexe les fiches pédagogiques. |
| **Embedding** | Représentation numérique d'un texte sous forme de vecteur (ici 384 dimensions). Permet la comparaison sémantique. |
| **Sentence-Transformers** | Librairie Python pour générer des embeddings de phrases. Modèle utilisé : paraphrase-multilingual-MiniLM-L12-v2. |
| **MiniLM-L12** | Modèle d'embedding compact (12 couches) et multilingue. Produit des vecteurs de 384 dimensions. |
| **Similarité Cosinus** | Mesure mathématique de la proximité entre deux vecteurs. Valeur entre -1 et 1 ; plus c'est proche de 1, plus les textes sont similaires. |
| **Top-K** | Technique de récupération des K documents les plus similaires (ici K=3). |
| **LLM** | Large Language Model : modèle de langue de grande taille capable de générer du texte. |
| **Llama 3.2** | Famille de modèles LLM open-source de Meta AI. Versions 1B et 3B utilisées dans SpeechCoach. |
| **Ollama** | Outil permettant d'exécuter des LLM localement en une commande. Gère le téléchargement et l'inférence. |
| **Text Completion** | Stratégie de prompting où on donne au modèle une phrase à compléter plutôt que des instructions complexes. |
| **Hallucination** | Quand un LLM génère des informations fausses ou inventées non présentes dans les données source. |
| **Prompt Engineering** | Art de formuler les instructions pour un LLM pour obtenir le résultat souhaité. |
| **Beam Size** | Paramètre de Whisper. Beam size 1 = greedy search (rapide). Beam size 5 = meilleure qualité mais plus lent. |
| **INT8 (Quantification)** | Réduction de la précision des poids d'un modèle (32 bits → 8 bits) pour accélérer l'inférence et réduire la mémoire. |
| **ThreadPoolExecutor** | Pool de threads Python permettant d'exécuter des tâches en parallèle (ici Audio et Vision simultanément). |
| **GIL** | Global Interpreter Lock : verrou empêchant l'exécution parallèle de bytecode Python pur. Contourné par les librairies C/C++. |
| **Cold Start** | Temps initial de chargement des modèles en RAM (~45 secondes). Ne se produit qu'à la première exécution. |
| **Garbage Collection** | Libération de la mémoire occupée par un modèle après utilisation. Stratégie séquentielle dans SpeechCoach. |
| **FastAPI** | Framework Python moderne pour créer des API REST performantes. Prévu pour le Sprint 10. |
| **React** | Librairie JavaScript pour créer des interfaces utilisateur interactives. Prévu pour le Dashboard Sprint 10. |
| **Dataclass** | Structure Python pour définir des objets de données (utilisé dans le schéma de métriques). |
| **JSON** | Format d'échange de données utilisé comme contrat entre les modules (scores.json, metrics.json). |
| **Variance Laplacienne** | Mesure de la netteté d'une image. Une faible variance = image floue. |
