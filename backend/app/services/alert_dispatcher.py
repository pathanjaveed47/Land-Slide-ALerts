import datetime
import logging
from sqlalchemy.orm import Session
from ..database.models import Station, SensorReading, Prediction, AlertLog, NotificationLog

logger = logging.getLogger("landslide_sentinel.alerts")


def send_mock_sms(to_phone: str, message: str, alert_id: int, db: Session) -> NotificationLog:
    """Simulates automated outbound SMS broadcast."""
    timestamp = datetime.datetime.now(datetime.timezone.utc)
    logger.info(f"📱 [MOCK SMS DISPATCHED] -> {to_phone} | {message}")

    notif = NotificationLog(
        alert_id=alert_id,
        channel="SMS",
        recipient=to_phone,
        message=message,
        status="DELIVERED",
        timestamp=timestamp
    )
    db.add(notif)
    return notif


def send_mock_email(to_email: str, subject: str, body: str, alert_id: int, db: Session) -> NotificationLog:
    """Simulates automated outbound Email dispatch."""
    timestamp = datetime.datetime.now(datetime.timezone.utc)
    logger.info(f"📧 [MOCK EMAIL DISPATCHED] -> {to_email} | {subject}")

    notif = NotificationLog(
        alert_id=alert_id,
        channel="EMAIL",
        recipient=to_email,
        message=f"{subject}\n\n{body}",
        status="DELIVERED",
        timestamp=timestamp
    )
    db.add(notif)
    return notif


def determine_suggested_action(risk_level: str, factors: list[str], station: Station, fs: float = 1.0) -> str:
    if risk_level == "Critical" or fs < 1.05:
        return (
            f"EVACUATION PROTOCOL LEVEL 3 (FS={fs:.2f}): Immediate evacuation of downslope communities in {station.region}. "
            f"Close arterial mountain corridors. Dispatch NDRF/SDRF rescue teams immediately."
        )
    elif risk_level == "Warning" or fs < 1.30:
        return (
            f"ADVISORY LEVEL 2 (FS={fs:.2f}): Restrict heavy vehicular transit along {station.name} slopes. "
            f"Activate local emergency response shelters and inspect drainage culverts."
        )
    else:
        return f"MONITORING LEVEL 1 (FS={fs:.2f}): Maintain heightened telemetry surveillance across {station.name} sector."


def evaluate_station_risk(
    station: Station,
    reading: SensorReading,
    prediction: Prediction,
    db: Session
) -> tuple[AlertLog | None, bool]:
    """
    Evaluates whether an alert should be triggered or escalated.
    Returns (alert_instance, is_newly_triggered).
    """
    risk_score = prediction.risk_score
    risk_level = prediction.risk_level
    fs = prediction.factor_of_safety or 1.5

    # Critical trigger: high score, Critical tier, or FS < 1.05
    is_critical = risk_score >= station.critical_threshold or risk_level == "Critical" or fs < 1.05
    is_warning = (risk_score >= station.warning_threshold or risk_level == "Warning" or fs < 1.30) and not is_critical

    if not (is_critical or is_warning):
        return None, False

    target_level = "Critical" if is_critical else "Warning"

    # Query latest active alert for this station
    latest_active = (
        db.query(AlertLog)
        .filter(AlertLog.station_id == station.id, AlertLog.status.in_(["ACTIVE", "ACKNOWLEDGED"]))
        .order_by(AlertLog.timestamp.desc())
        .first()
    )

    now = datetime.datetime.now(datetime.timezone.utc)

    should_trigger_new = False
    if not latest_active:
        should_trigger_new = True
    elif latest_active.risk_level == "Warning" and target_level == "Critical":
        latest_active.status = "ACKNOWLEDGED"
        should_trigger_new = True
    else:
        latest_active.risk_score = risk_score
        latest_active.contributing_factors = prediction.contributing_factors
        db.flush()
        return latest_active, False

    if should_trigger_new:
        suggested_action = determine_suggested_action(target_level, prediction.contributing_factors, station, fs)
        message = f"[{target_level.upper()}] Landslide Risk Threshold Exceeded at {station.name} ({station.code}) - FS={fs:.2f}"

        alert = AlertLog(
            station_id=station.id,
            timestamp=now,
            risk_level=target_level,
            risk_score=risk_score,
            message=message,
            contributing_factors=prediction.contributing_factors,
            suggested_action=suggested_action,
            status="ACTIVE"
        )
        db.add(alert)
        db.flush()

        # Automated notifications
        sms_recipients = [
            "+91-9876543210 (SDMA Disaster Control)",
            "+91-9447123456 (Emergency Ops Chief)"
        ]
        for phone in sms_recipients:
            sms_body = (
                f"[SENTINEL ALERT - {target_level.upper()}]\n"
                f"Station: {station.name} ({station.region})\n"
                f"Risk Score: {risk_score:.1f}/100 | FS: {fs:.2f}\n"
                f"Action: {suggested_action[:100]}..."
            )
            send_mock_sms(phone, sms_body, alert.id, db)

        email_recipients = [
            "disaster.response@sdma.gov.in",
            "district.magistrate@hazardcontrol.org"
        ]
        email_body = (
            f"LandSlide Sentinel Early Warning Automated Dispatch\n"
            f"Station: {station.name} [{station.code}]\n"
            f"Region: {station.region}\n"
            f"Coordinates: {station.latitude:.4f}, {station.longitude:.4f}\n"
            f"Elevation: {station.elevation}m | Slope: {station.base_slope}°\n"
            f"Risk Level: {target_level}\n"
            f"Risk Score: {risk_score:.1f} / 100\n"
            f"Factor of Safety: {fs:.2f}\n"
            f"T+1h Risk Probability: {prediction.risk_t1h * 100:.1f}%\n"
            f"T+6h Risk Probability: {prediction.risk_t6h * 100:.1f}%\n"
            f"Confidence: {prediction.confidence * 100:.1f}%\n\n"
            f"PRIMARY CONTRIBUTING FACTORS:\n" +
            "\n".join([f" • {f}" for f in prediction.contributing_factors]) +
            f"\n\nREQUIRED IMMEDIATE ACTION:\n{suggested_action}\n"
        )
        for email in email_recipients:
            send_mock_email(email, f"URGENT: {target_level} Landslide Threat - {station.name}", email_body, alert.id, db)

        db.commit()
        return alert, True

    return None, False
