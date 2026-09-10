"""
Role-Based Views for GeoSentinel AI Landslide Early Warning System.

Includes:
- Main monolithic dashboard view
- Authority-only SOS report verification endpoint
- Authority-only Mass Evacuation trigger endpoint
- Citizen SOS report submission endpoint
"""

import json
import logging
from datetime import datetime, timezone
from django.shortcuts import render
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from monitoring.models import SensorData, SOSReport
from monitoring.consumers import generate_hazard_polygon
from monitoring.tasks import process_sos_report_nlp

logger = logging.getLogger("monitoring.views")


def user_is_authority(request) -> bool:
    """
    Validates if the user possesses an 'Authority' role.
    Checks Django User Group ('Authority'), superuser status,
    or session-level Authority authorization flag for rapid team testing.
    """
    user = request.user
    if user.is_authenticated:
        if user.is_superuser or user.is_staff or user.groups.filter(name="Authority").exists():
            return True
    # Session-level role flag for frictionless team simulation & evaluation
    return bool(request.session.get("is_authority_mode", False))


def dashboard_view(request):
    """
    Main monolithic dashboard view rendering index.html with Tailwind CSS and Leaflet.js.
    Passes existing sensor monitoring stations, recent readings, and role status.
    """
    is_auth = user_is_authority(request)

    # Fetch recent sensor telemetry from MongoDB
    try:
        recent_sensors = list(SensorData.objects.order_by('-timestamp')[:8])
        recent_readings_json = [s.to_dict() for s in recent_sensors]
    except Exception as e:
        logger.warning(f"Could not load sensor readings from MongoDB: {e}")
        recent_readings_json = []

    # Fetch recent crowdsourced SOS reports
    try:
        recent_sos = list(SOSReport.objects.order_by('-timestamp')[:10])
        recent_sos_json = [r.to_dict() for r in recent_sos]
    except Exception as e:
        logger.warning(f"Could not load SOS reports from MongoDB: {e}")
        recent_sos_json = []

    # Seed baseline sensor stations for Leaflet map initialization
    initial_stations = [
        {"station_id": "STATION-CHAMOLI-01", "name": "Chamoli Crest InSAR-Node", "lat": 30.155, "lon": 78.245, "status": "Safe"},
        {"station_id": "STATION-WAYANAD-02", "name": "Wayanad Escarpment Piezometer", "lat": 11.685, "lon": 76.132, "status": "Safe"},
        {"station_id": "STATION-NILGIRIS-03", "name": "Nilgiris Mountain Pass Extensometer", "lat": 11.410, "lon": 76.695, "status": "Safe"},
    ]

    context = {
        "is_authority": is_auth,
        "recent_readings": recent_readings_json,
        "recent_sos_reports": recent_sos_json,
        "initial_stations_json": json.dumps(initial_stations),
    }
    return render(request, "monitoring/index.html", context)


@csrf_exempt
def toggle_authority_mode(request):
    """Utility endpoint allowing the team to toggle the 'Authority' role session for testing."""
    if request.method == "POST":
        current = request.session.get("is_authority_mode", False)
        request.session["is_authority_mode"] = not current
        return JsonResponse({
            "status": "success",
            "is_authority_mode": request.session["is_authority_mode"]
        })
    return JsonResponse({"error": "POST required"}, status=405)


@csrf_exempt
def verify_sos_report(request, report_id: str):
    """
    Authority-Restricted Endpoint:
    Allows certified authorities to review citizen SOS reports,
    marking them as 'Verified' (escalating to civil defense) or 'Rejected' (false alarm).
    """
    if not user_is_authority(request):
        return HttpResponseForbidden(json.dumps({
            "error": "Access Denied: Only certified 'Authority' personnel can verify SOS reports."
        }), content_type="application/json")

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8'))
        action = body.get("action", "Verified")  # "Verified" or "Rejected"

        report = SOSReport.objects.get(id=report_id)
        report.verification_status = action
        report.verified_by = getattr(request.user, "username", "Authority_Officer_01")
        report.verified_at = datetime.now(timezone.utc)
        report.save()

        # Broadcast authority-verified update over Channels
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "landslide_global_alerts",
                {
                    "type": "localized_sos_broadcast",
                    "payload": report.to_dict()
                }
            )

        return JsonResponse({
            "status": "success",
            "message": f"SOS Report {report_id} has been marked as '{action}' by civil authority.",
            "report": report.to_dict()
        })
    except Exception as e:
        logger.exception(f"Failed verifying SOS report: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def trigger_mass_evacuation(request):
    """
    Authority-Restricted Endpoint:
    Allows authorized civil protection officers to manually trigger a Mass Evacuation Alert,
    broadcasting a high-priority 'Critical Warning' frame and emergency danger polygon.
    """
    if not user_is_authority(request):
        return HttpResponseForbidden(json.dumps({
            "error": "Access Denied: Only certified 'Authority' personnel can trigger mass evacuation alerts."
        }), content_type="application/json")

    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
        target_lat = float(body.get("latitude", 30.155))
        target_lon = float(body.get("longitude", 78.245))
        zone_name = body.get("zone_name", "Chamoli Sector 4 Mountain Slope")

        # Broadcast immediate Critical Warning over Channels
        channel_layer = get_channel_layer()
        if channel_layer:
            payload = {
                "station_id": f"MANUAL_EVAC_{zone_name}",
                "latitude": target_lat,
                "longitude": target_lon,
                "cumulative_rainfall": 210.0,
                "soil_moisture": 98.0,
                "acceleration_rate": 8.5,
                "risk_score_t1h": 0.99,
                "risk_score_t6h": 0.99,
                "risk_level": "Critical",
                "authority_initiated": True,
                "officer": getattr(request.user, "username", "Authority_Command"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            async_to_sync(channel_layer.group_send)(
                "landslide_global_alerts",
                {
                    "type": "risk_update_broadcast",
                    "payload": payload
                }
            )

        return JsonResponse({
            "status": "success",
            "message": f"MASS EVACUATION ALERT broadcasted for {zone_name} by Civil Authority.",
            "coordinates": [target_lat, target_lon]
        })
    except Exception as e:
        logger.exception(f"Evacuation trigger failure: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def submit_sos_report(request):
    """
    Public Citizen SOS Submission Endpoint:
    Ingests citizen field reports, persisting to MongoDB and launching Celery NLP evaluation.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        body = json.loads(request.body.decode('utf-8'))
        text = body.get("text_description", "")
        lat = float(body.get("latitude", 30.155))
        lon = float(body.get("longitude", 78.245))
        user_id = body.get("user_id", "CITIZEN_MOBILE_APP")

        # Create MongoDB Document
        report_doc = SOSReport(
            user_id=user_id,
            text_description=text,
            latitude=lat,
            longitude=lon,
            verification_status="Pending",
            timestamp=datetime.now(timezone.utc)
        )
        report_doc.save()

        # Trigger Celery asynchronous NLP task (or execute inline if Celery daemon is offline)
        try:
            process_sos_report_nlp.delay(str(report_doc.id))
        except Exception:
            # Inline fallback
            process_sos_report_nlp(str(report_doc.id))

        # Reload updated doc
        report_doc.reload()

        return JsonResponse({
            "status": "success",
            "message": "SOS Report submitted and evaluated by AI NLP pipeline.",
            "report": report_doc.to_dict()
        }, status=201)
    except Exception as e:
        logger.exception(f"Error submitting SOS report: {e}")
        return JsonResponse({"error": str(e)}, status=500)
