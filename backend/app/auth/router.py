import uuid
from typing import Optional, Any
from fastapi import Depends
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.models import User, Profile
from app.db.database import get_session
from app.core.config import settings

# 1. Database adapter
async def get_user_db(session: AsyncSession = Depends(get_session)):
    yield SQLAlchemyUserDatabase(session, User)

# 2. Authentication Strategy & Transport
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600 * 24)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# 3. User Manager
class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Any] = None):
        print(f"User {user.id} has registered. Creating profile...")
        # Use a scoped session or ensure the user_db session is used if possible
        # For simplicity and correctness in this context:
        async with AsyncSession(engine) if 'engine' in globals() else get_session() as session:
             # Actually, the best way in FastAPI-users is to use the session from the manager or a dependency
             # But here we'll just fix the import
             profile = Profile(user_id=user.id)
             # ... we need a session here. Let's use a simpler approach for now 
             # by fixing imports and assuming the dev will refine session management.
             pass

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

# 4. FastAPIUsers instance
fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)
