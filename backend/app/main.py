import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from pydantic import BaseModel
from app.db.database import init_db
from app.auth.router import (
    auth_backend,
    fastapi_users,
    current_active_user,
    current_active_user_any,
    get_current_user,
    get_user_manager,
    get_jwt_strategy_dependency
)
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
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://[::1]:3000",
        "http://[::1]:3001",
        "http://[::1]:3002",
        "http://192.168.1.2:3000",  # Added for mobile/LAN access
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# STATIC FILES
STORAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "storage"))
os.makedirs(STORAGE_DIR, exist_ok=True)
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import traceback
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Manually add CORS headers
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": traceback.format_exc()
        },
        headers=headers
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
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)

class VerifyResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

@app.post("/auth/verify", response_model=VerifyResponse, tags=["auth"])
async def verify(
    request: Request,
    token: str = Body(..., embed=True),
    user_manager=Depends(get_user_manager),
    strategy=Depends(get_jwt_strategy_dependency),
):
    try:
        user = await user_manager.verify(token, request)
        access_token = await strategy.write_token(user)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
    except Exception as e:
        # Re-raise or handle specific fastapi-users exceptions
        raise e

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@app.post("/auth/change-password", tags=["auth"])
async def change_password(
    data: PasswordChangeRequest,
    user=Depends(get_current_user),
    user_manager=Depends(get_user_manager),
):
    try:
        # Check current password
        verified, updated_password_hash = user_manager.password_helper.verify_and_update(
            data.current_password, user.hashed_password
        )
        if not verified:
            raise HTTPException(status_code=400, detail="INVALID_CURRENT_PASSWORD")
        
        # Update password
        # BaseUserManager.update handles hashing when password is provided in the schema
        await user_manager.update(UserUpdate(password=data.new_password), user)
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail="INTERNAL_SERVER_ERROR")

@app.get("/auth/status")
async def get_auth_status(current_user=Depends(get_current_user)):
    """Simple endpoint to check current auth and verification status."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "is_superuser": current_user.is_superuser
    }

app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/auth",
    tags=["users"],
)

@app.get("/auth/test")
async def test_auth(request: Request):
    """Test endpoint to check if auth works without FastAPI-Users dependencies."""
    auth_header = request.headers.get("Authorization")
    logger.info(f"Test endpoint called with auth header: {auth_header[:30] if auth_header else 'None'}...")
    return {"message": "Test works", "has_auth": bool(auth_header)}

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
async def authenticated_route(user=Depends(get_current_user)):
    return {"message": f"Hello {user.email}!"}
