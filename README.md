# SpeechCoach

SpeechCoach est une plateforme de coaching en prise de parole propulsée par l'IA. Elle analyse les vidéos de présentation via un pipeline hybride sophistiqué — combinant le traitement déterministe du signal et le coaching agentique par IA — pour fournir des retours pédagogiques actionnables.

---

## Documentation

Pour une documentation complète, consultez le dossier [`docs/`](docs/README.md) :

- **[Architecture](docs/architecture.md)** - Vue d'ensemble du système et des composants
- **[Développement](docs/development.md)** - Guide d'installation et standards de code
- **[API](docs/api.md)** - Référence complète de l'API
- **[Détection d'Émotion](docs/emotion-detection.md)** - Implémentation technique

---

## Architecture : Le "Master Coach" Hybride

SpeechCoach ne se contente pas de transcrire du texte ; il évalue la performance holistique de l'orateur :

1. **Moteur Déterministe** : Utilise MediaPipe (Vision) et Librosa (Audio) pour mesurer le contact visuel, la posture, l'énergie vocale et le comptage des mots de remplissage.
2. **IA Agentique (Master Coach)** : Un agent Groq/Llama-3.3-70B traite les métriques brutes et les données contextuelles d'une base RAG FAISS (base de connaissances) pour concevoir une "Mission Master Coach" unique pour chaque session.
3. **Gouvernance** : Une couche de post-traitement assure que les retours de l'IA sont parfaitement alignés avec les métriques mathématiques avant la livraison.

---

## Stack Technique

- **Backend** : FastAPI (Python), Celery + Redis (File d'attente), SQLModel + MySQL (Base de données)
- **Frontend** : Next.js 15, Tailwind CSS, Framer Motion (Interface Glassmorphism)
- **IA Core** : Faster-Whisper (ASR), MediaPipe (Pose/Face), FAISS (Vector Store)
- **Inférence** :
  - **Mode Cloud (Défaut)** : Groq LPU + Llama 3.3 (Haute performance)
  - **Mode Local (Optionnel)** : Ollama + Fine-tuned Qwen (Usage hors-ligne)

---

## Structure du Projet

```text
SpeechCoach/
├── docs/                          # Documentation complète
│   ├── architecture.md            # Architecture système
│   ├── development.md             # Guide de développement
│   ├── api.md                     # Référence API
│   └── emotion-detection.md       # Documentation technique
├── backend/
│   ├── app/
│   │   ├── analytics/             # Moteur d'analyse ML
│   │   │   ├── engine/             # Cœur de l'analyse
│   │   │   │   ├── agent/          # Logique Agent Coach
│   │   │   │   ├── audio/          # Traitement ASR & Acoustique
│   │   │   │   ├── metrics/        # Scoring
│   │   │   │   ├── rag/            # Recherche vectorielle
│   │   │   │   └── vision/         # Analyse MediaPipe
│   │   │   └── schemas.py         # Schémas Pydantic
│   │   ├── api/v1/                # API versionnée
│   │   │   ├── endpoints/         # Routeurs API
│   │   │   │   ├── auth.py         # Authentication
│   │   │   │   ├── users.py        # Gestion utilisateurs
│   │   │   │   ├── videos.py       # Upload vidéo
│   │   │   │   ├── sessions.py     # Sessions & rapports
│   │   │   │   └── feedback.py     # Feedback plateforme
│   │   │   └── api.py             # Agrégateur API
│   │   ├── auth/                  # Gestion JWT & Sécurité
│   │   ├── constants/             # Constantes applicatives
│   │   ├── core/                  # Configuration & Email
│   │   ├── db/                    # Modèles SQLModel & Connexion
│   │   ├── exceptions/            # Exceptions personnalisées
│   │   ├── reports/               # Génération de rapports
│   │   ├── utils/                 # Utilitaires
│   │   └── worker/                # Tâches Celery
│   ├── alembic/                   # Migrations base de données
│   ├── models/                    # Modèles ML locaux (Non suivis)
│   ├── Modelfile                  # Recette modèle Ollama
│   ├── requirements.txt           # Dépendances Python
│   └── .env                       # Variables d'environnement
├── frontend/
│   ├── src/
│   │   ├── app/                   # Pages Next.js
│   │   ├── components/            # UI Réutilisable
│   │   ├── constants/             # Endpoints API
│   │   ├── features/              # Logique métier
│   │   ├── hooks/                 # Hooks personnalisés
│   │   ├── lib/                   # Configuration Axios
│   │   ├── services/              # Services API
│   │   └── types/                 # Types TypeScript
│   └── package.json               # Dépendances Node.js
├── fine_tuning/                   # Notebooks & Datasets
└── report/                        # Rapports PFE & Présentations
```

---

## Installation Rapide

### Prérequis

- Python 3.10+ & Node.js 20+
- FFmpeg (Indispensable pour l'audio/vidéo)
- MySQL & Redis

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/moussaidhicham/speechcoach.git
cd speechcoach

# 2. Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Télécharger les modèles ML
cd models
git clone https://huggingface.co/Systran/faster-whisper-medium whisper-medium
cd ..

# 4. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos configurations
uvicorn app.main:app --reload --port 8000

# 5. Worker (nouveau terminal)
redis-server
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo

# 6. Frontend (nouveau terminal)
cd ../frontend
npm install
npm run dev
```

### Accès

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs

> **Note** : Pour une installation détaillée, consultez le [Guide de Développement](docs/development.md).

---

## Fonctionnalités Clés

- **Interface Glassmorphism** : Design moderne et ergonomique
- **Onboarding Intelligent** : Assistant de configuration en 5 étapes
- **Analyse Multi-Appareils** : Ajustement automatique selon l'appareil
- **Master Coach Mission** : Coaching personnalisé par IA agentique
- **API Versionnée** : Endpoints `/api/v1/` pour stabilité future
- **Rapports Exportables** : Markdown, HTML, PDF
- **Détection d'Émotion** : Système double piste (règles + IA)

---

## API Endpoints

### Authentication (Non versionnée)
- `POST /auth/jwt/login` - Connexion
- `POST /auth/register` - Inscription
- `GET /auth/status` - Statut authentification

### API v1 (Versionnée)
- `POST /api/v1/video/upload` - Upload vidéo
- `GET /api/v1/user/profile` - Profil utilisateur
- `GET /api/v1/tracker/status/{id}` - Statut session
- `GET /api/v1/tracker/history` - Historique sessions
- `GET /api/v1/tracker/result/{id}` - Résultats analyse
- `GET /api/v1/tracker/report/{id}/pdf` - Rapport PDF

> **Documentation API complète** : [docs/api.md](docs/api.md) ou http://localhost:8000/docs

---

## Contribution

Projet de Master SIE (Systèmes Intelligents pour l'Éducation). Développé par Hicham Moussaid sous la direction du Pr. Hessane.

Pour contribuer :
1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## License

Ce projet est sous license MIT - voir le fichier LICENSE pour les détails.

---

*SpeechCoach : Transformez vos métriques en maîtrise.*
