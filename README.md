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
- **Inférence** : Groq LPU (Production) / Ollama (Fallback local).

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

### 3. Configuration du Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Configurer l'environnement
# Créez un fichier .env dans /backend avec vos accès MYSQL et votre GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 4. Lancement du Worker (Celery)
*Indispensable pour l'analyse vidéo en arrière-plan.*
```powershell
cd backend
.\venv\Scripts\Activate.ps1
# Lancer Redis en parallèle
redis-server
# Lancer le worker
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo
```

### 5. Configuration du Frontend
```powershell
cd frontend
npm install
npm run dev
```

Accédez à l'application sur : [http://localhost:3000](http://localhost:3000)

---

## 📸 Fonctionnalités Clés
- **Interface Glassmorphism** : Un design moderne, haut de gamme et contrasté.
- **Onboarding Intelligent** : Un assistant en 5 étapes pour adapter le coaching à votre niveau (Débutant à Expert).
- **Analyse Multi-Appareils** : Seuils de vision spécifiques pour Laptop, Tablette et Smartphone.
- **Sécurisation SMTP** : Vérification d'e-mail et récupération de mot de passe intégrées.
- **Rapports Complets** : Exportation des analyses au format PDF et Markdown.

---

## 📂 Structure du Projet
- `backend/app/` : Cœur de l'application FastAPI (Auth, Analytics, DB).
- `backend/app/analytics/engine/` : Le "Cerveau" (Audio, Vision, RAG, Agent).
- `frontend/src/` : Application Next.js (Composants, Features, Services).
- `report/` : Rapports d'avancement PFE et supports de présentation.

---

## 🤝 Contribution
Ce projet fait partie du **Master SIE (Systèmes Intelligents pour l'Éducation)**. Développé par Hicham Moussaid sous la direction du Pr. Hessane.

---
*SpeechCoach : Transformez vos métriques en maîtrise.*
