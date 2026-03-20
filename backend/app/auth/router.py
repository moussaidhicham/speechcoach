import uuid
from typing import Any, Optional

from fastapi import Depends
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlmodel import select

from app.core.config import settings
from app.db.database import AsyncSessionLocal, get_session
from app.users.models import Profile, User


async def get_user_db(session=Depends(get_session)):
    yield SQLAlchemyUserDatabase(session, User)


bearer_transport = BearerTransport(tokenUrl='auth/jwt/login')


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600 * 24)


auth_backend = AuthenticationBackend(
    name='jwt',
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Any] = None):
        print(f'User {user.id} has registered. Ensuring profile exists...')
        async with AsyncSessionLocal() as session:
            statement = select(Profile).where(Profile.user_id == user.id)
            result = await session.execute(statement)
            profile = result.scalar_one_or_none()

            if profile is None:
                session.add(Profile(user_id=user.id))
                await session.commit()


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)
