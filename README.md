# SpeechCoach (PFE Master SIE)

Système de coaching automatique de prise de parole via analyse multimodale (Audio + Vision).

## 🚀 Quick Start (Full-Stack)

### Pré-requis
- **FFmpeg**: [Download](https://www.gyan.dev/ffmpeg/builds/) (Windows full release) → Add `bin/` to PATH
- **Python 3.10+**
- **Node.js 18+**

Vérifiez FFmpeg: `ffmpeg -version`

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

### API Endpoints
- `POST /video/upload` - Upload & analyze video
- `/storage/...` - Processed reports/images
- `/auth/*` - User auth

## 🏗️ Architecture

```
SpeechCoach/
├── backend/          # FastAPI + Celery + Alembic (PostgreSQL)
│   ├── app/
│   │   ├── analytics/  # Video processing engine
│   │   ├── auth/
│   │   ├── users/
│   │   └── core/
├── frontend/         # Next.js 16 + shadcn/ui + TypeScript
│   └── src/app/
│       ├── studio/     # Video upload & recording
│       ├── dashboard/
│       ├── report/[id] # View analysis
│       └── history/
└── storage/          # Uploads/processed files (gitignored)
```

## Features
- **Multimodal Analysis**: Audio (energy, transcript) + Vision (timeline, frames)
- **AI Coach**: LLM-powered feedback & recommendations
- **Real-time Dashboard**: Progress tracking
- **User Auth**: JWT, profiles
- **Async Processing**: Celery workers

## Local Development
```
Backend: http://localhost:8000/docs (Swagger)
Frontend: http://localhost:3000
```

## Deployment
- Backend: Docker + Railway/Render
- Frontend: Vercel/Netlify

Enjoy coaching! 🎤✨
