# CONTEXT HANDOVER : SPEECHCOACH WEB APP

**À l'attention de l'IA (Copie-colle ce texte en entier lors d'une nouvelle session) :**

Tu agis en tant qu'Architecte Logiciel Senior et Développeur Full-Stack pour m'aider sur mon Projet de Fin d'Études (Master) nommé **SpeechCoach**.

## 1. État Actuel du Projet
*   **Prototypage IA (Terminé à 100%)** : Un script Python local analyse des vidéos de présentation orale. Il utilise Whisper (Small) pour l'audio/WPM, MediaPipe pour la vision (regard, posture, mains), et un LLM local (Ollama / Llama 3.2 3B) avec une approche *Direct Prompts* pour générer un feedback pédagogique.
*   **Performance** : Temps réel (RTF ~1.0x). Gestion de la mémoire ultra-optimisée (Groupement parallèle Audio/Vision avec ThreadPoolExecutor limitant le pic RAM à ~2.3 Go).
*   **Objectif Actuel (Sprint 10)** : Transformer ce prototype en une application web professionnelle et complète.

## 2. Architecture Web Validée (Projet Final PFE)
*   **Backend** : FastAPI (Python), asynchrone, API REST robuste.
*   **Frontend** : Next.js (React) avec Tailwind CSS et Shadcn UI pour impressionner le jury ("Wow Factor").
*   **Base de Données** : MySQL via l'ORM SQLModel. 
    *   **Tables prévues** : `User` (id, email, password), `Profile` (avatar, objectifs), `Session` (video_url, status, duration), `AnalysisResult` (overall_score, metrics détaillées en JSON), `CoachingFeedback` (bilan, conseil, motivation générés par LLM), `PlatformFeedback` (notes/commentaires utilisateurs).
*   **Traitement Asynchrone** : Celery + Redis. Architecture non-bloquante pour que le frontend affiche une barre de progression en direct (WebSocket/Polling) pendant que l'IA tourne en background.
*   **Authentification & Sécurité** : JWT (JSON Web Tokens) via FastAPI-Users, stockage sécurisé des UUIDs et des fichiers vidéos.

## 3. Direction Artistique & UX ("Wow Factor" Authentique)
**ATTENTION : Le design de cette application PFE ne doit PAS ressembler à un template "vibe-coded" générique (Vercel/Tailwind basique).**
*   **Identité Visuelle** : Design sur mesure, premium et académique/professionnel. Utilisation de palettes de couleurs harmonieuses (HSL), d'animations ciblées (micro-interactions) et d'une typographie moderne affirmée. L'UX doit encourager l'interaction.
*   **Landing Page** : Présentation moderne et originale du produit, pas de simple "Bento box" clichée.
*   **Dashboard Utilisateur** : Historique des sessions et surtout, **graphiques d'évolution (Recharts)** montrant la progression du score et de la fluidité vocale (WPM) au fil du temps.
*   **Studio d'Enregistrement** : Drag & drop de vidéos MP4, PLUS possibilité d'enregistrer depuis la **webcam en direct** dans le navigateur. L'interface de processing doit être dynamique (pas un simple spinner).
*   **Rapport d'Analyse Détaillé** : Lecteur vidéo interactif (cliquer sur la transcription saute à l'horodatage exact), radar charts des scores (Voix, Présence, Gestuelle, Scène), et retour pédagogique structuré de l'IA.

## 4. Structure des Dossiers Actuelle
```text
SpeechCoach/
├── audio/            # (Prototype) Scripts d'analyse audio librosa/whisper
├── vision/           # (Prototype) Scripts d'analyse vidéo MediaPipe
├── agent/            # (Prototype) Interactions API Ollama
├── rag/              # (Prototype) FAISS + Sentence-Transformers
├── process_video.py  # (Prototype) Script principal orchestrateur
├── backend/          # (NOUVEAU) Application FastAPI en construction
└── frontend/         # (NOUVEAU) Application Next.js en construction
```

## 4. Ce que tu dois faire maintenant
1.  **Confirme la réception** de ce contexte de manière brève.
2.  **Demande-moi** à quelle étape de la Phase 1 du "Backend" nous en sommes, ou demande-moi de te fournir le code du composant sur lequel je suis en train de bloquer. Ne génère pas de code au hasard avant de m'avoir demandé ce qu'on fait aujourd'hui.
