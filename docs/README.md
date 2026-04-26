# SpeechCoach Documentation

Welcome to the SpeechCoach documentation. This folder contains comprehensive documentation for the project.

## Documentation Index

### Getting Started
- **[Architecture](architecture.md)** - System architecture and component overview
- **[Development](development.md)** - Setup guide and coding standards
- **[API](api.md)** - Complete API reference

### Technical Documentation
- **[Emotion Detection](emotion-detection.md)** - Model-based emotion detection implementation

### Module Documentation
- **[Fine-tuning](../fine_tuning/README.md)** - ML model fine-tuning guide
- **[Fine-tuning Docs](../fine_tuning/docs/)** - Detailed fine-tuning documentation

## Quick Start

### For Developers

1. Read the [Architecture](architecture.md) to understand the system
2. Follow the [Development](development.md) guide to set up your environment
3. Check the [API](api.md) documentation for endpoint details

## Additional Resources

### Project README
- [Main README](../README.md) - Project overview and features

### Backend
- [Backend README](../backend/README.md) - Backend-specific documentation

### Frontend
- [Frontend README](../frontend/README.md) - Frontend-specific documentation

## 🔧 Common Tasks

### Adding a New API Endpoint
1. Create endpoint in `backend/app/api/v1/endpoints/`
2. Register in `backend/app/api/v1/api.py`
3. Add to `frontend/src/constants/api.ts`
4. Create service in `frontend/src/services/`
5. Update [API documentation](api.md)

### Database Migration
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Running Tests
```bash
# Backend
cd backend
pytest tests/

# Frontend
cd frontend
npm test
```

## 📝 Contributing to Documentation

When adding new features or making changes:

1. Update relevant documentation files
2. Add new sections if needed
3. Keep examples up to date
4. Follow the existing documentation style
5. Update this index if adding new documents

## 🆘 Getting Help

- Check existing documentation first
- Review code comments
- Look at test files for usage examples
- Check API docs at `/docs` endpoint when running

## 📄 License

This documentation is part of the SpeechCoach project. See the main project LICENSE file for details.
