from celery import Celery
from app.core.celery_config import celery_settings

celery_app = Celery(
    "speechcoach_worker",
    broker=celery_settings.broker_url,
    backend=celery_settings.result_backend,
    include=['app.worker.tasks'] # Module where tasks are defined
)

celery_app.config_from_object(celery_settings)
