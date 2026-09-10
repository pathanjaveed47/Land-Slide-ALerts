"""
Django Settings for GeoSentinel AI: Monolithic Landslide Early Warning System.

Integrates:
- MongoDB via MongoEngine (NoSQL ODM for SensorData and SOSReport documents)
- Django Channels 4.x with Daphne ASGI & Redis Channel Layer
- Celery 5.x with Redis message broker & Celery Beat scheduler
- Tailwind CSS & Leaflet.js inside unified Django templates
"""

import os
import sys
import logging
from pathlib import Path
import mongoengine

logger = logging.getLogger("landslide_monolith.settings")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security & Environment Settings
SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-geosentinel-monolith-ai-landslide-ews-key-2026!#$*'
)
DEBUG = os.getenv('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = ['*']

# Application Definition
# Daphne MUST be listed before django.contrib.staticfiles for ASGI development
INSTALLED_APPS = [
    'daphne',
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Monolithic Core Application
    'monitoring',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'landslide_monolith.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'monitoring' / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ASGI Application for Django Channels
ASGI_APPLICATION = 'landslide_monolith.asgi.application'
WSGI_APPLICATION = 'landslide_monolith.wsgi.application'

# ------------------------------------------------------------------------------
# 1. DATABASE CONFIGURATION (SQLite for Django Auth + MongoDB for Geotechnical Data)
# ------------------------------------------------------------------------------
# Lightweight SQLite for Django's internal auth, admin, and session management
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Connect MongoDB using MongoEngine ODM for all telemetry and SOS documents
MONGODB_NAME = os.getenv('MONGODB_NAME', 'landslide_ews_db')
MONGODB_HOST = os.getenv('MONGODB_HOST', 'mongodb://localhost:27017/landslide_ews_db')

try:
    mongoengine.connect(
        db=MONGODB_NAME,
        host=MONGODB_HOST,
        alias='default',
        serverSelectionTimeoutMS=2000,
        connect=False  # Lazy connection pool
    )
    logger.info(f"MongoEngine registered for MongoDB: {MONGODB_NAME}")
except Exception as err:
    logger.warning(f"MongoEngine connection initialization deferred: {err}")

# ------------------------------------------------------------------------------
# 2. REDIS CONFIGURATION (Django Channels + Celery Distributed Task Queue)
# ------------------------------------------------------------------------------
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Redis Configuration for Django Channels
# Automatically uses InMemoryChannelLayer during pytest to enable testing without Redis daemon
if 'pytest' in sys.modules or os.getenv('USE_INMEMORY_CHANNELS', 'False').lower() == 'true':
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [f"{REDIS_URL}/1"],
                'capacity': 1500,
                'expiry': 30,
            },
        },
    }

# Celery Configuration
CELERY_BROKER_URL = f"{REDIS_URL}/0"
CELERY_RESULT_BACKEND = f"{REDIS_URL}/0"
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True

# Celery Beat Schedule (Periodic 10-Minute Sensor Telemetry Ingestion)
CELERY_BEAT_SCHEDULE = {
    'poll-sensor-telemetry-every-10-mins': {
        'task': 'monitoring.tasks.fetch_and_evaluate_sensor_telemetry',
        'schedule': 600.0,  # 600 seconds = 10 minutes
    },
}

# ------------------------------------------------------------------------------
# 3. STATIC & MEDIA FILES
# ------------------------------------------------------------------------------
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'monitoring' / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ------------------------------------------------------------------------------
# 4. INTERNATIONALIZATION & SYSTEM DEFAULTS
# ------------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
