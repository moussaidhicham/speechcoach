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
    async with engine.begin() as conn:
        # Create all tables. Do not use in production with Alembic!
        await conn.run_sync(SQLModel.metadata.create_all)

        def ensure_feedback_created_at(sync_conn):
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

        await conn.run_sync(ensure_feedback_created_at)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
