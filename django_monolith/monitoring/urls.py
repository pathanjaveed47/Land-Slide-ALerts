"""
URL Routing for the Early Warning Monitoring application.
"""

from django.urls import path
from monitoring import views

app_name = "monitoring"

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('api/sos/submit/', views.submit_sos_report, name='submit_sos'),
    path('api/sos/verify/<str:report_id>/', views.verify_sos_report, name='verify_sos'),
    path('api/authority/evacuate/', views.trigger_mass_evacuation, name='trigger_evacuation'),
    path('api/authority/toggle/', views.toggle_authority_mode, name='toggle_authority_mode'),
]
