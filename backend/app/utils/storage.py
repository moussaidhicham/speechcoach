"""
Centralized storage path configuration.
All file storage paths should be imported from this module.
"""
import os
from pathlib import Path

# Base storage directory (relative to backend/app/)
BASE_DIR = Path(__file__).parent.parent.parent / "app" / "storage"

# Ensure base directory exists
BASE_DIR.mkdir(parents=True, exist_ok=True)

# Storage subdirectories
UPLOADS_DIR = BASE_DIR / "uploads"
PROCESSING_DIR = BASE_DIR / "processing"
AVATARS_DIR = BASE_DIR / "avatars"

# Ensure all subdirectories exist
for directory in [UPLOADS_DIR, PROCESSING_DIR, AVATARS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Export as strings for compatibility with existing code
STORAGE_BASE_DIR = str(BASE_DIR)
STORAGE_UPLOADS_DIR = str(UPLOADS_DIR)
STORAGE_PROCESSING_DIR = str(PROCESSING_DIR)
STORAGE_AVATARS_DIR = str(AVATARS_DIR)

# URL paths for serving files
STORAGE_URL_PREFIX = "/storage"
UPLOADS_URL_PREFIX = f"{STORAGE_URL_PREFIX}/uploads"
PROCESSING_URL_PREFIX = f"{STORAGE_URL_PREFIX}/processing"
AVATARS_URL_PREFIX = f"{STORAGE_URL_PREFIX}/avatars"
