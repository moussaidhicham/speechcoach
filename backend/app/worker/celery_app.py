from celery import Celery
from app.core.celery_config import celery_settings
import logging
import os

os.environ.setdefault("HF_HUB_VERBOSITY", "error")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
logging.getLogger("httpx").setLevel(logging.ERROR)
logging.getLogger("httpcore").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
logging.getLogger("huggingface_hub.utils._http").setLevel(logging.ERROR)

celery_app = Celery(
    "speechcoach_worker",
    broker=celery_settings.broker_url,
    backend=celery_settings.result_backend,
    include=['app.worker.tasks'] # Module where tasks are defined
)

celery_app.config_from_object(celery_settings)
