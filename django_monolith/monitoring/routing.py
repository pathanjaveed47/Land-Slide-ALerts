"""
Channels WebSocket URL Patterns for Early Warning Monitoring.
"""

from django.urls import re_path
from monitoring.consumers import LandslideTelemetryConsumer

websocket_urlpatterns = [
    re_path(r'^ws/telemetry/$', LandslideTelemetryConsumer.as_asgi()),
]
