# SpeechCoach

SpeechCoach is a full-stack speaking-coach platform that analyzes recorded videos with audio + vision pipelines, stores sessions in MySQL, runs asynchronous processing with Celery/Redis, and generates coaching feedback with a local Ollama model.

This README is written for the current local development setup on Windows/PowerShell, which is the environment used in this project.

## Stack

- Backend: FastAPI, SQLModel, Celery, Redis, MySQL
- Frontend: Next.js, React, TypeScript
- Video/audio tooling: FFmpeg
- AI retrieval: FAISS, Sentence Transformers
- Local LLM runtime: Ollama
- Local coaching model: `speechcoach:latest` built from `backend/Modelfile`

## Project Structure

```text
SpeechCoach/
├── backend/
│   ├── app/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── core/
│   │   ├── db/
│   │   ├── users/
│   │   └── worker/
│   ├── alembic/
│   ├── models/
│   ├── Modelfile
│   ├── requirements.txt
│   └── .env
├── frontend/
├── fine_tuning/
└── report/
```

## Prerequisites

Install these tools before starting the app:

1. Python 3.10 or 3.11
1. Node.js 18+
1. MySQL 8+
1. Redis
1. FFmpeg
1. Ollama

## Windows Installation Commands

If you use `winget`, these are the easiest installs:

```powershell
winget install Python.Python.3.10
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Redis.Redis
winget install Oracle.MySQL
winget install Ollama.Ollama
```

After installing FFmpeg, verify:

```powershell
ffmpeg -version
```

After installing Ollama, verify:

```powershell
ollama --version
```

If `redis-server` or `mysql` are not available directly in PowerShell after install, restart the terminal first.

## 1. Clone The Project

```powershell
git clone <your-repository-url>
cd "C:\Users\Admin\Downloads\Master ENS Mekns\PFE\SpeechCoach"
```

## 2. Prepare MySQL

The backend expects a database named `speechcoach`.

Open MySQL and run:

```sql
CREATE DATABASE speechcoach CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Default local settings currently used by the backend:

- host: `localhost`
- port: `3306`
- user: `root`
- password: empty by default in `backend/.env`
- database: `speechcoach`

If your MySQL password is not empty, update `backend/.env`.

## 3. Configure Backend Environment

Current backend environment file:

- `backend/.env`

Expected content:

```env
PROJECT_NAME="SpeechCoach API"
MYSQL_USER="root"
MYSQL_PASSWORD=""
MYSQL_SERVER="localhost"
MYSQL_PORT=3306
MYSQL_DB="speechcoach"
SECRET_KEY="generate_a_strong_secret_key_here_pfe"
SPEECHCOACH_COACHING_BACKEND="ollama"
SPEECHCOACH_LLM_MODEL="speechcoach"
```

Notes:

- `SPEECHCOACH_COACHING_BACKEND="ollama"` means the backend uses Ollama for coaching generation.
- `SPEECHCOACH_LLM_MODEL="speechcoach"` means the backend expects an Ollama model named `speechcoach`.

## 4. Install Backend Dependencies

From the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\venv\Scripts\Activate.ps1
```

## 5. Install Frontend Dependencies

From the project root:

```powershell
cd frontend
npm install
```

Optional frontend environment file:

- `frontend/.env.local`

Recommended content:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If this file is absent, the frontend already falls back to `http://localhost:8000`.

## 6. Prepare Redis

Start Redis in a dedicated terminal:

```powershell
redis-server
```

Quick health check:

```powershell
redis-cli ping
```

Expected response:

```text
PONG
```

## 7. Prepare The Local Ollama Model

SpeechCoach now uses a merged and quantized GGUF model through Ollama.

### Required file

Before building the Ollama model, you must manually place the GGUF file here:

- `backend/models/speechcoach_qwen25-1_5b-Q4_K_M.gguf`

Important:

- this GGUF file is not stored in GitHub
- `backend/Modelfile` does not generate model weights by itself
- the `Modelfile` only tells Ollama how to wrap and serve the local GGUF file

### Build the local Ollama model

From the `backend` folder:

```powershell
cd backend
ollama create speechcoach -f Modelfile
```

### Verify the model

```powershell
ollama list
```

You should see:

- `speechcoach:latest`

### Optional manual test

```powershell
ollama run speechcoach
```

## 8. Start The Backend API

In a backend terminal:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Available at:

- API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Root endpoint: [http://localhost:8000/](http://localhost:8000/)

## 9. Start The Celery Worker

In another backend terminal:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo
```

Why `-P solo`:

- this project is run locally on Windows
- Celery's default prefork pool is problematic on Windows
- `solo` is the safe local choice here

## 10. Start The Frontend

In a frontend terminal:

```powershell
cd frontend
npm run dev
```

Frontend URL:

- [http://localhost:3000](http://localhost:3000)

## 11. Normal Local Run Order

When starting the full project locally, use this order:

1. Start MySQL
1. Start Redis
1. Start Ollama
1. Start backend API
1. Start Celery worker
1. Start frontend

## 12. What Happens During A Video Upload

1. The frontend uploads a video to `POST /video/upload`
1. FastAPI stores the file under `backend/app/storage/uploads`
1. A Celery task starts the analysis pipeline
1. Audio is extracted with FFmpeg
1. Whisper-based transcription and audio metrics are computed
1. Vision metrics are computed from extracted frames
1. A report JSON is generated
1. A second enrichment task uses RAG + Ollama coaching generation
1. The frontend displays the session report

## 13. Storage Paths Actually Used

The current runtime storage folder is:

- `backend/app/storage`

Inside it, the important subfolders are:

- `uploads/`
- `processing/`

The old `backend/storage` folder is no longer the active runtime path.

## 14. Useful Commands

### Backend dependencies

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Frontend dependencies

```powershell
cd frontend
npm install
```

### Rebuild the local Ollama model

```powershell
cd backend
ollama create speechcoach -f Modelfile
```

### Check available Ollama models

```powershell
ollama list
```

### Remove an unused Ollama model

```powershell
ollama rm <model-name>
```

### Run Alembic migrations manually

The app also creates tables on startup via `init_db()`, but Alembic is available if needed:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
```

## 15. Troubleshooting

### FFmpeg not found

Symptom:

- backend fails during audio extraction

Fix:

- install FFmpeg
- make sure `ffmpeg` is available in `PATH`
- test with:

```powershell
ffmpeg -version
```

### Redis connection error

Symptom:

- Celery tasks do not start
- upload succeeds but processing does not continue

Fix:

- start Redis with:

```powershell
redis-server
```

### MySQL connection error

Symptom:

- backend fails on startup

Fix:

- verify MySQL is running
- verify database `speechcoach` exists
- verify credentials in `backend/.env`

### Ollama model not found

Symptom:

- enrichment step fails
- logs mention missing model `speechcoach`

Fix:

```powershell
cd backend
ollama create speechcoach -f Modelfile
ollama list
```

### Celery starts processing old tasks immediately

This is normal if Redis still contains pending jobs from a previous run. The worker will consume queued tasks as soon as it starts.

### Large disk usage

Common large folders in local development:

- `backend/app/storage/processing`
- `backend/models`
- `frontend/.next`
- `backend/venv`

These should stay out of Git. The `.gitignore` already excludes the main generated/runtime folders.

## 16. Main Endpoints

Examples:

- `POST /video/upload`
- `GET /tracker/...`
- `POST /feedback/...`
- `GET /auth/...`

Use the Swagger UI to inspect the current API:

- [http://localhost:8000/docs](http://localhost:8000/docs)

## 17. Fine-Tuning Assets

The project contains a `fine_tuning/` folder used for research and model preparation.

Important files there:

- `fine_tuning/coach_dataset_expanded.jsonl`
- `fine_tuning/qwen25_qlora_colab.ipynb`
- `fine_tuning/README.md`

These are not required to run the app locally, but they are useful to reproduce the model-training workflow.

## 18. Recommended Terminal Layout

For local development, use four terminals:

1. Redis
1. Backend API
1. Celery worker
1. Frontend

Optional fifth terminal:

1. Ollama interactive/manual testing

## 19. Quick Start Summary

If everything is already installed:

```powershell
# Terminal 1
redis-server

# Terminal 2
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3
cd backend
.\venv\Scripts\Activate.ps1
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo

# Terminal 4
cd frontend
npm run dev
```

Then open:

- [http://localhost:3000](http://localhost:3000)

## 20. Current Local Inference Architecture

The current coaching path is:

- merged fine-tuned model
- quantized GGUF file
- Ollama runtime
- backend sends chat requests to Ollama

This replaced the older heavy local Hugging Face + adapter runtime because that approach caused major RAM pressure on local CPU execution.

## 21. Notes

- This repository is actively evolving.
- Some research and experimentation files are kept for reproducibility.
- For local Windows development, the commands in this README should be treated as the reference flow.
