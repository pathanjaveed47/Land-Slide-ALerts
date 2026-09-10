"""
ASGI Configuration for GeoSentinel AI Landslide Monolith.

Exposes the ASGI callable as a module-level variable named `application`.
Routes standard HTTP traffic to Django views and WebSocket traffic
to Django Channels consumers.
"""

import os
import django

# Initialize Django settings before importing channel routers
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'landslide_monolith.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
import monitoring.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                monitoring.routing.websocket_urlpatterns
            )
        )
    ),
})
