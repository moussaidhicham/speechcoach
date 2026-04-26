import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
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
from app.utils.storage import STORAGE_BASE_DIR, STORAGE_URL_PREFIX

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

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

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Trusted Host Middleware (prevent Host header attacks)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "::1"]  # Add your production domain
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
        "http://192.168.1.2:3000",  # For mobile/LAN access (development only)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    # XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # HSTS (HTTPS only in production)
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Content Security Policy
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response

# STATIC FILES
app.mount(STORAGE_URL_PREFIX, StaticFiles(directory=STORAGE_BASE_DIR), name="storage")

# Exception Handler (without leaking sensitive information)
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
    
    # In development, show the error message
    # In production, show a generic error
    if "localhost" in settings.PROJECT_NAME or "127.0.0.1" in settings.PROJECT_NAME:
        detail = str(exc)
    else:
        detail = "Une erreur interne s'est produite. Veuillez réessayer plus tard."
    
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
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

# --- API v1 (New Structure) ---
from app.api.v1.api import api_router
app.include_router(
    api_router,
    prefix="/api/v1",
    tags=["api-v1"],
)

@app.get("/")
@limiter.limit("100/minute")
def read_root(request: Request):
    return {"message": f"Bienvenue sur {settings.PROJECT_NAME}"}

@app.get("/authenticated-route")
@limiter.limit("60/minute")
async def authenticated_route(request: Request, user=Depends(get_current_user)):
    return {"message": f"Bonjour {user.email}!"}
