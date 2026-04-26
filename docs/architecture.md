# SpeechCoach Architecture

## System Overview

SpeechCoach is a hybrid AI-powered public speaking coaching platform that combines deterministic signal processing with agentic AI coaching.

## Architecture Diagram

```
┌─────────────┐
│   Frontend  │ (Next.js 15)
│  (React)    │
└──────┬──────┘
       │ HTTP/REST
       ↓
┌─────────────────────────────────────┐
│         Backend (FastAPI)           │
├─────────────────────────────────────┤
│  ┌─────────┐  ┌──────────────────┐ │
│  │   API   │  │   Worker (Celery) │ │
│  │  v1/*   │  │  Background Tasks │ │
│  └────┬────┘  └────────┬─────────┘ │
│       │                │           │
│       ↓                ↓           │
│  ┌─────────────────────────────┐  │
│  │   Analytics Engine (ML)     │  │
│  │  - Audio (Whisper, Librosa) │  │
│  │  - Vision (MediaPipe)       │  │
│  │  - Agent (Groq/Llama)       │  │
│  └────────┬────────────────────┘  │
│           │                        │
│           ↓                        │
│  ┌─────────────────────────────┐  │
│  │   Database (MySQL)         │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Components

### Frontend
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with Glassmorphism design
- **State**: React Context + Custom Hooks
- **API**: Axios with centralized constants

### Backend
- **Framework**: FastAPI with async/await
- **Auth**: FastAPI-Users with JWT
- **Database**: SQLModel (SQLAlchemy) + MySQL
- **Tasks**: Celery + Redis for background processing
- **API Versioning**: `/api/v1/` for versioned endpoints, `/auth/` for auth

### Analytics Engine
- **Audio Processing**:
  - ASR: Faster-Whisper (Medium model)
  - Acoustics: Librosa (WPM, pauses, fillers)
  - Emotion: Wav2Vec2 (optional)
- **Vision Processing**:
  - Pose: MediaPipe (posture, hands)
  - Face: MediaPipe (eye contact, expressions)
  - Emotion: HSEmotion (optional)
- **AI Coaching**:
  - Backend: Groq API (Llama 3.3-70B) or Ollama (local)
  - RAG: FAISS vector store for coaching knowledge
  - Governance: Post-processing to align AI with metrics

### Data Flow

1. **Video Upload**
   - Frontend uploads video to `/api/v1/video/upload`
   - Backend saves to storage and creates VideoSession
   - Celery task triggered for processing

2. **Video Processing** (Background)
   - Extract audio track
   - Run ASR (Whisper) → transcript
   - Run audio analysis (Librosa) → audio metrics
   - Run vision analysis (MediaPipe) → vision metrics
   - Generate AI coaching (Groq/Llama) → coaching feedback
   - Save results to database

3. **Report Generation**
   - Frontend polls `/api/v1/tracker/status/{id}`
   - When complete, fetch results from `/api/v1/tracker/result/{id}`
   - Generate reports (Markdown, HTML, PDF) on demand

## API Structure

### Authentication (Unversioned)
```
POST /auth/jwt/login
POST /auth/register
POST /auth/verify
GET  /auth/status
POST /auth/reset-password
```

### API v1 (Versioned)
```
POST /api/v1/video/upload
GET  /api/v1/user/profile
PATCH /api/v1/user/profile
GET  /api/v1/tracker/status/{id}
GET  /api/v1/tracker/history
GET  /api/v1/tracker/result/{id}
GET  /api/v1/tracker/report/{id}/markdown
GET  /api/v1/tracker/report/{id}/pdf
GET  /api/v1/tracker/report/{id}/print
DELETE /api/v1/tracker/session/{id}
PATCH /api/v1/tracker/session/{id}
POST /api/v1/feedback
GET  /api/v1/feedback/stats
```

## Database Schema

### Core Tables
- `users` - User accounts
- `profiles` - User preferences and settings
- `video_sessions` - Video upload records
- `analysis_results` - Analysis metrics and scores
- `coaching_feedback` - AI-generated feedback
- `platform_feedback` - User feedback on platform

## Security

- **Authentication**: JWT tokens with FastAPI-Users
- **Authorization**: Role-based access (user, superuser)
- **CORS**: Configured for frontend origins
- **Secrets**: Environment variables (.env, gitignored)
- **Password Hashing**: bcrypt via FastAPI-Users

## Deployment

### Development
```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Worker (separate terminal)
redis-server
celery -A app.worker.celery_app.celery_app worker --loglevel=info

# Frontend
cd frontend
npm install
npm run dev
```

### Production
- Use Gunicorn + Uvicorn workers for backend
- Use PM2 or systemd for Celery worker
- Use Nginx as reverse proxy
- Use Docker for containerization (optional)

## Performance

- **ASR**: Faster-Whisper (medium) - ~2-3x real-time
- **Vision**: MediaPipe - Real-time
- **AI Coaching**: Groq API - <1s response
- **Report Generation**: <500ms

## Scalability

- Horizontal scaling: Multiple backend instances
- Task queue: Celery with Redis for background jobs
- Database: MySQL with connection pooling
- Storage: Local filesystem (can be migrated to S3)
