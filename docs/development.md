# Development Guide

## Prerequisites

- Python 3.10+
- Node.js 20+
- FFmpeg (must be in PATH)
- MySQL 8.0+
- Redis 7+

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/moussaidhicham/speechcoach.git
cd speechcoach
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Download ML models
cd models
git clone https://huggingface.co/Systran/faster-whisper-medium whisper-medium
cd ..

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL
```

## Running the Application

### Development Mode

#### Terminal 1: Backend API
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

#### Terminal 2: Redis
```bash
redis-server
```

#### Terminal 3: Celery Worker
```bash
cd backend
.\venv\Scripts\Activate.ps1
celery -A app.worker.celery_app.celery_app worker --loglevel=info -Q default,ai_processing -P solo
```

#### Terminal 4: Frontend
```bash
cd frontend
npm run dev
```

Access the application at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

### Backend
```
backend/
├── app/
│   ├── analytics/          # ML analysis engine
│   │   ├── engine/        # Core processing logic
│   │   │   ├── agent/     # AI coaching agent
│   │   │   ├── audio/     # Audio processing
│   │   │   ├── metrics/   # Scoring logic
│   │   │   ├── rag/       # Vector search
│   │   │   └── vision/    # Vision processing
│   │   └── schemas.py    # Pydantic schemas
│   ├── api/v1/            # Versioned API endpoints
│   │   ├── endpoints/     # Route handlers
│   │   └── api.py         # API aggregator
│   ├── auth/              # Authentication logic
│   ├── constants/         # Application constants
│   ├── core/              # Configuration
│   ├── db/                # Database models
│   ├── exceptions/        # Custom exceptions
│   ├── reports/           # Report generation
│   ├── utils/             # Utilities
│   └── worker/            # Celery tasks
├── alembic/               # Database migrations
├── tests/                 # Test files
├── requirements.txt       # Python dependencies
└── main.py               # Entry point
```

### Frontend
```
frontend/
├── src/
│   ├── app/               # Next.js pages
│   ├── components/        # Reusable UI components
│   ├── constants/         # API endpoints
│   ├── features/          # Business logic features
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Axios configuration
│   ├── services/          # API services
│   └── types/             # TypeScript types
└── package.json
```

## Coding Standards

### Backend (Python)

- Use type hints for all functions
- Follow PEP 8 style guide
- Use async/await for I/O operations
- Write docstrings for complex functions
- Use Pydantic for data validation

Example:
```python
from typing import Optional
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

async def get_user_by_id(
    session: AsyncSession,
    user_id: str
) -> Optional[User]:
    """Get user by ID.

    Args:
        session: Database session
        user_id: User UUID

    Returns:
        User object or None if not found
    """
    result = await session.exec(
        select(User).where(User.id == user_id)
    )
    return result.first()
```

### Frontend (TypeScript)

- Use TypeScript for all files
- Use functional components with hooks
- Follow React best practices
- Use centralized API constants
- Write unit tests for critical logic

Example:
```typescript
import { useQuery } from '@tanstack/react-query';
import { USER_ENDPOINTS } from '@/constants/api';
import { api } from '@/lib/api';

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data } = await api.get(USER_ENDPOINTS.PROFILE);
      return data;
    },
  });
}
```

## Database Migrations

### Create a New Migration

```bash
cd backend
alembic revision --autogenerate -m "description_of_change"
```

### Apply Migrations

```bash
cd backend
alembic upgrade head
```

### Rollback

```bash
cd backend
alembic downgrade -1
```

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Debugging

### Backend

- Use FastAPI's automatic docs at `/docs`
- Check logs in terminal
- Use Python debugger: `import pdb; pdb.set_trace()`

### Frontend

- Use React DevTools
- Check browser console
- Use VS Code debugger

## Common Issues

### FFmpeg Not Found
**Error**: `ffmpeg: command not found`
**Solution**: Install FFmpeg and add to PATH

### MySQL Connection Failed
**Error**: `Can't connect to MySQL server`
**Solution**: Ensure MySQL is running and credentials are correct in `.env`

### Redis Connection Failed
**Error**: `Error connecting to Redis`
**Solution**: Ensure Redis is running: `redis-server`

### Celery Task Not Running
**Error**: Tasks stuck in "processing" state
**Solution**: Ensure Celery worker is running and connected to Redis

## Adding New Features

### Backend API Endpoint

1. Create endpoint in `app/api/v1/endpoints/`
2. Register in `app/api/v1/api.py`
3. Add to `frontend/src/constants/api.ts`
4. Create service in `frontend/src/services/`

### Frontend Page

1. Create page in `frontend/src/app/[route]/page.tsx`
2. Add components as needed
3. Use services for API calls
4. Add routing in navigation

## Performance Tips

### Backend
- Use async/await for I/O
- Use database indexes
- Cache frequently accessed data
- Use connection pooling

### Frontend
- Use React.memo for expensive components
- Lazy load routes
- Optimize images
- Use pagination for large lists

## Security Best Practices

- Never commit `.env` files
- Use environment variables for secrets
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
- Keep dependencies updated

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Update documentation
5. Submit a pull request
