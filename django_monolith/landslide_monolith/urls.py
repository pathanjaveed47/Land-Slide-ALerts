"""
Root URL Configuration for GeoSentinel AI Landslide Monolith.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('monitoring.urls')),
]
