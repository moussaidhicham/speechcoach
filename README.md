# 🎙️ SpeechCoach

SpeechCoach is a premium AI-powered speaking-coach platform. It analyzes presentation videos through a sophisticated hybrid pipeline—combining deterministic signal processing with agentic AI coaching—to provide actionable pedagogical feedback.

---

## 🏛️ Architecture: The Hybrid Master Coach
SpeechCoach doesn't just transcribe text; it evaluates the **holistic performance** of an orator:
1.  **Deterministic Engine**: Uses **MediaPipe** (Vision) and **Librosa** (Audio) to measure eye contact, posture, vocal energy, and filler counts.
2.  **Agentic AI (Master Coach)**: A **Groq/Llama-3.3-70B** agent processes raw metrics and contextual data from a **FAISS RAG** (Knowledge Base) to curate a unique "Master Coach Mission" for each session.
3.  **Governance**: A post-processing layer ensures AI feedback is perfectly aligned with mathematical metrics before delivery.

---

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python), Celery + Redis (Worker Queue), SQLAlchemy + MySQL (Database).
- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion (Glassmorphism UI).
- **Core AI**: Faster-Whisper (ASR), MediaPipe (Pose/Face), FAISS (Vector Store).
- **Inference**: Groq LPU (Production) / Ollama (Local Fallback).

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Python 3.10+** & **Node.js 20+**
- **FFmpeg** (Ensure it's in your PATH)
- **MySQL** & **Redis**

### 2. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Configure backend/.env with your MYSQL_DB and GROQ_API_KEY
uvicorn app.main:app --reload
```

### 3. Worker Setup (Celery)
*Required for video analysis.*
```powershell
cd backend
.\venv\Scripts\Activate.ps1
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo
```

### 4. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

---

## 📸 Key Features
- **Glassmorphism UI**: A high-contrast, premium interface for a professional user experience.
- **Smart Onboarding**: 5-step wizard to tailor coaching to your level (Beginner to Expert).
- **Device-Aware Analysis**: Specific vision thresholds for Laptop, Tablet, and Smartphone recording.
- **Secure Auth**: SMTP-integrated email verification and password recovery.
- **Deep Insights**: Exportable reports in PDF and Markdown formats.

---

## 📂 Project Structure
- `backend/app/`: FastAPI application cores (Auth, Analytics, DB).
- `backend/app/analytics/engine/`: The "Brain" (Audio, Vision, RAG, Agent).
- `frontend/src/`: Next.js application (Components, Features, Services).
- `report/`: PFE Progress reports and presentation assets.

---

## 🤝 Contribution
This project is part of the **Master SIE (Systèmes Intelligents pour l'Éducation)** PFE. Developed by Hicham Moussaid.

---
*SpeechCoach: Transform your metrics into mastery.*
