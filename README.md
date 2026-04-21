# 🎙️ SpeechCoach

SpeechCoach est une plateforme de coaching en prise de parole propulsée par l'IA. Elle analyse les vidéos de présentation via un pipeline hybride sophistiqué — combinant le traitement déterministe du signal et le coaching agentique par IA — pour fournir des retours pédagogiques actionnables.

---

## 🏛️ Architecture : Le "Master Coach" Hybride
SpeechCoach ne se contente pas de transcrire du texte ; il évalue la **performance holistique** de l'orateur :
1.  **Moteur Déterministe** : Utilise **MediaPipe** (Vision) et **Librosa** (Audio) pour mesurer le contact visuel, la posture, l'énergie vocale et le comptage des mots de remplissage.
2.  **IA Agentique (Master Coach)** : Un agent **Groq/Llama-3.3-70B** traite les métriques brutes et les données contextuelles d'une base **RAG FAISS** (base de connaissances) pour concevoir une "Mission Master Coach" unique pour chaque session.
3.  **Gouvernance** : Une couche de post-traitement assure que les retours de l'IA sont parfaitement alignés avec les métriques mathématiques avant la livraison.

---

## 🛠️ Stack Technique
- **Backend** : FastAPI (Python), Celery + Redis (File d'attente), SQLAlchemy + MySQL (Base de données).
- **Frontend** : Next.js 15, Tailwind CSS, Framer Motion (Interface Glassmorphism).
- **IA Core** : Faster-Whisper (ASR), MediaPipe (Pose/Face), FAISS (Vector Store).
- **Inférence** : 
    - **Mode Cloud (Défaut)** : Groq LPU + Llama 3.3 (Haute performance).
    - **Mode Local (Optionnel)** : Ollama + Fine-tuned Qwen (Usage hors-ligne).

---

## 📂 Structure du Projet

```text
SpeechCoach/
├── backend/
│   ├── app/
│   │   ├── analytics/
│   │   │   ├── engine/             # Cœur de l'analyse ML
│   │   │   │   ├── agent/          # Logique Agent Coach & Prompts
│   │   │   │   ├── audio/          # Traitement ASR & Acoustique
│   │   │   │   ├── metrics/        # Schémas & Logique de scoring
│   │   │   │   ├── rag/            # Moteur de recherche vectorielle
│   │   │   │   └── vision/         # Analyse MediaPipe & Posture
│   │   │   └── storage/            # Stockage local (vidéos, frames, rapports)
│   │   ├── auth/                   # Gestion JWT & Sécurité
│   │   ├── core/                   # Configuration & Envoi d'e-mails
│   │   ├── db/                     # Modèles SQLModel & Connexion
│   │   └── worker/                 # Configuration Celery & Tâches
│   ├── models/                     # Modèles ML locaux (Non suivis par Git)
│   ├── Modelfile                   # Recette pour construire le modèle Ollama
│   ├── requirements.txt            # Dépendances Python
│   └── .env                        # Variables d'environnement
├── frontend/
│   ├── src/
│   │   ├── app/                    # Pages & Routes Next.js
│   │   ├── components/             # UI Reusable (Shadcn/Custom)
│   │   ├── features/               # Logique métier complexe (ex: Onboarding)
│   │   └── services/               # Appels API Axios
│   └── package.json                # Dépendances Node.js
├── fine_tuning/                    # Notebooks & Datasets d'entraînement
└── report/                         # Rapports PFE & Présentations
```

---

## 🚀 Guide d'Installation

### 1. Prérequis
Assurez-vous d'avoir installé :
- **Python 3.10+** & **Node.js 20+**
- **FFmpeg** (Indispensable pour l'audio/vidéo, doit être dans le PATH)
- **MySQL** & **Redis**

### 2. Installation du Projet
```powershell
# Cloner le dépôt
git clone https://github.com/moussaidhicham/speechcoach.git
cd speechcoach
```

### 3. Installation des Modèles (Important) ⚠️
Les modèles ML sont volumineux et ne sont pas stockés sur GitHub.

**A. Faster-Whisper (Medium)**
Le backend utilise Whisper en local pour une confidentialité totale de l'audio.
```powershell
cd backend/models
# Cloner le modèle depuis Hugging Face
git clone https://huggingface.co/Systran/faster-whisper-medium whisper-medium
```

**B. Configuration de l'Inférence (Groq vs Ollama)**
Le projet est configuré par défaut pour utiliser **Groq API** (Llama 3.3) pour le coaching, offrant une réponse quasi-instantanée.

*   **Option 1 (Recommandée - Cloud)** : Ajoutez votre `GROQ_API_KEY` dans le fichier `backend/.env`.
*   **Option 2 (Alternative - Local)** : Si vous souhaitez fonctionner à 100% hors-ligne, installez Ollama et préparez le modèle local :
    ```powershell
    cd backend
    # Nécessite le fichier GGUF dans backend/models/
    ollama create speechcoach -f Modelfile
    ```

### 4. Configuration du Backend
```powershell
# Depuis le dossier /backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Configurer l'environnement (.env)
uvicorn app.main:app --reload --port 8000
```

### 5. Lancement du Worker (Celery)
*Indispensable pour l'analyse vidéo en arrière-plan.*
```powershell
# Nouveau terminal (Backend venv activé)
redis-server
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo
```

### 6. Lancement du Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

## 📸 Fonctionnalités Clés
- **Interface Glassmorphism** : Design moderne et ergonomique.
- **Onboarding Intelligent** : Assistant de configuration en 5 étapes.
- **Analyse Multi-Appareils** : Ajustement automatique selon l'appareil de capture.
- **Master Coach Mission** : Coaching personnalisé généré par IA agentique.

---

## 🤝 Contribution
Projet de Master SIE (Systèmes Intelligents pour l'Éducation). Développé par Hicham Moussaid sous la direction du Pr. Hessane.

---
*SpeechCoach : Transformez vos métriques en maîtrise.*
