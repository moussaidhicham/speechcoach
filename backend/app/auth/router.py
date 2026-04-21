import uuid
import logging
from typing import Any, Optional

from fastapi import Depends, HTTPException, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlmodel import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal, get_session
from app.db.models import Profile, User
from app.core.mail import send_verification_email, send_reset_password_email

logger = logging.getLogger(__name__)


class LoggingJWTStrategy(JWTStrategy):
    """Custom JWT strategy with logging for debugging"""

    async def write_token(self, user: Any) -> str:
        token = await super().write_token(user)
        logger.info(f"JWT token generated for user {user.id}: token length={len(token)}")
        return token

    async def read_token(self, token: Optional[str], user_manager: BaseUserManager[User, uuid.UUID]) -> Optional[User]:
        try:
            user = await super().read_token(token, user_manager)
            if user:
                logger.info(f"JWT validated for user: {user.id}")
            return user
        except Exception as e:
            logger.error(f"JWT validation error: {e}")
            raise


async def get_user_db(session=Depends(get_session)):
    yield SQLAlchemyUserDatabase(session, User)


bearer_transport = BearerTransport(tokenUrl='auth/jwt/login')

# Create JWT strategy once as a singleton
_jwt_strategy: LoggingJWTStrategy | None = None

def get_jwt_strategy() -> LoggingJWTStrategy:
    global _jwt_strategy
    if _jwt_strategy is None:
        logger.info(f"Creating JWT strategy with secret length: {len(settings.SECRET_KEY)}")
        _jwt_strategy = LoggingJWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600 * 24)
    return _jwt_strategy


auth_backend = AuthenticationBackend(
    name='jwt',
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)


def get_jwt_strategy_dependency() -> LoggingJWTStrategy:
    return get_jwt_strategy()


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Any] = None):
        logger.info(f'User {user.id} ({user.email}) has registered. is_active={user.is_active}, is_verified={user.is_verified}')
        async with AsyncSessionLocal() as session:
            statement = select(Profile).where(Profile.user_id == user.id)
            result = await session.execute(statement)
            profile = result.scalar_one_or_none()

            if profile is None:
                session.add(Profile(user_id=user.id))
                await session.commit()

        # Trigger verification email
        await self.request_verify(user, request)

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Any] = None
    ):
        logger.info(f'Password reset requested for user {user.id} ({user.email})')
        await send_reset_password_email(user.email, token)

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Any] = None
    ):
        logger.info(f'Verification email requested for user {user.id} ({user.email})')
        await send_verification_email(user.email, token)

    async def on_after_reset_password(self, user: User, request: Optional[Any] = None):
        logger.info(f'Password reset for user {user.id} ({user.email}). is_active={user.is_active}, is_verified={user.is_verified}')


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True, verified=True)
current_active_user_any = fastapi_users.current_user(active=True)

# Custom current_user dependency for SQLModel compatibility
async def get_current_user(
    request: Request,
    user_manager=Depends(get_user_manager),
    strategy=Depends(get_jwt_strategy_dependency),
) -> User:
    # Manually extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
    
    if token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        user = await strategy.read_token(token, user_manager)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return user
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

