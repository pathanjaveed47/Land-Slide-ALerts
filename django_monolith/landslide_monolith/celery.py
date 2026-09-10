"""
Celery configuration for GeoSentinel AI Landslide Early Warning System.

Initializes the Celery distributed task queue using Redis broker,
enabling asynchronous background ML inference, weather API polling,
and NLP spam evaluation.
"""

import os
from celery import Celery

# Set default Django settings module for celery program
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'landslide_monolith.settings')

app = Celery('landslide_monolith')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# Namespace 'CELERY' means all celery-related configs in settings.py start with CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Celery Debug Task Request: {self.request!r}')
