import os
from kombu import Queue

class CeleryConfig:
    # Use Redis as the message broker
    broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
    
    # Use Redis to store results
    result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # JSON serialization for safety
    task_serializer = 'json'
    result_serializer = 'json'
    accept_content = ['json']
    
    # Optional: configure routing if needed
    task_default_queue = 'default'
    task_queues = (
        Queue('default', routing_key='task.#'),
        Queue('ai_processing', routing_key='ai.#'),
    )

celery_settings = CeleryConfig()
