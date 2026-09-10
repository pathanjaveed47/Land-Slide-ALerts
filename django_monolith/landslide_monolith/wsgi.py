"""
WSGI Configuration for GeoSentinel AI Landslide Monolith.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'landslide_monolith.settings')
application = get_wsgi_application()
