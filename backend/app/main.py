import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from app.db.database import init_db
from app.auth.router import auth_backend, fastapi_users, current_active_user
from app.users.schemas import UserRead, UserCreate, UserUpdate
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs on startup
    logger.info("Initializing database...")
    # NOTE: In production with Alembic, we might not want init_db() to run create_all
    await init_db()
    logger.info("Database initialized.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for SpeechCoach video analysis and coaching.",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Middleware (Allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "storage"))
os.makedirs(STORAGE_DIR, exist_ok=True)
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please check the backend logs."},
    )

# --- Authentication Routers ---
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/auth",
    tags=["users"],
)

# --- Feature Modules ---
from app.users.router import profile_router
app.include_router(
    profile_router,
    prefix="/user",
    tags=["profile"],
)

from app.analytics.video_router import video_router
from app.analytics.status_router import status_router
from app.analytics.feedback_router import feedback_router

app.include_router(
    video_router,
    prefix="/video",
    tags=["video"],
)

app.include_router(
    status_router,
    prefix="/tracker",
    tags=["tracker"],
)

app.include_router(
    feedback_router,
    prefix="/feedback",
    tags=["feedback"],
)

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}

@app.get("/authenticated-route")
async def authenticated_route(user=Depends(current_active_user)):
    return {"message": f"Hello {user.email}!"}
