from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel
from app.core.config import settings

# Async Engine (for FastAPI)
engine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    echo=True,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Sync Engine (for Celery workers on Windows to avoid asyncio conflicts)
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    echo=False
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)

async def init_db():
    """
    Initialize database schema.

    WARNING: In production, use Alembic migrations instead of this function.
    The manual ALTER TABLE statements below are legacy compatibility code for
    databases that may not have run migrations. They should be replaced with
    proper Alembic migrations in the future.

    See: backend/alembic/versions/ for existing migrations.
    """
    async with engine.begin() as conn:
        # Create all tables. Do not use in production with Alembic!
        await conn.run_sync(SQLModel.metadata.create_all)

        def ensure_feedback_created_at(sync_conn):
            """
            Legacy compatibility: Add created_at column if missing.
            Should be replaced by Alembic migration 4e7e6f2e9b0b.
            """
            inspector = inspect(sync_conn)
            if "platformfeedback" not in inspector.get_table_names():
                return

            columns = {column["name"] for column in inspector.get_columns("platformfeedback")}
            if "created_at" not in columns:
                sync_conn.execute(
                    text(
                        "ALTER TABLE platformfeedback "
                        "ADD COLUMN created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP"
                    )
                )

        def ensure_profile_preferences(sync_conn):
            """
            Legacy compatibility: Add profile columns if missing.
            These columns should be added via Alembic migration in the future.
            """
            inspector = inspect(sync_conn)
            if "profile" not in inspector.get_table_names():
                return

            columns = {column["name"] for column in inspector.get_columns("profile")}
            if "preferred_device_type" not in columns:
                sync_conn.execute(
                    text(
                        "ALTER TABLE profile "
                        "ADD COLUMN preferred_device_type VARCHAR(32) NULL DEFAULT 'auto'"
                    )
                )
            if "avatar_offset_y" not in columns:
                sync_conn.execute(
                    text(
                        "ALTER TABLE profile "
                        "ADD COLUMN avatar_offset_y FLOAT NULL DEFAULT 50.0"
                    )
                )
            if "avatar_scale" not in columns:
                sync_conn.execute(
                    text(
                        "ALTER TABLE profile "
                        "ADD COLUMN avatar_scale FLOAT NULL DEFAULT 1.0"
                    )
                )

        await conn.run_sync(ensure_feedback_created_at)
        await conn.run_sync(ensure_profile_preferences)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
