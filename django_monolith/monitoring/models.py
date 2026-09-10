"""
MongoDB Document Models for GeoSentinel AI Landslide Early Warning System.

Uses MongoEngine ODM for schema-flexible time-series sensor telemetry
and crowdsourced SOS emergency incident reports.
"""

from datetime import datetime, timezone
import mongoengine as me


class SensorData(me.Document):
    """
    Physical in-situ slope telemetry document.
    Tracks hydrometeorological accumulation and inertial shear strain acceleration.
    """
    station_id = me.StringField(required=True, default="STATION-SLOPE-01")
    cumulative_rainfall = me.FloatField(required=True, help_text="72-hour cumulative precipitation in millimeters (mm)")
    soil_moisture = me.FloatField(required=True, help_text="Volumetric water content percentage (0.0 - 100.0%)")
    acceleration_rate = me.FloatField(required=True, help_text="Biaxial inclinometer shear displacement rate (mm/s²)")
    timestamp = me.DateTimeField(default=lambda: datetime.now(timezone.utc))
    latitude = me.FloatField(required=True, default=30.155)
    longitude = me.FloatField(required=True, default=78.245)

    # Multi-Horizon AI Forecasting Scores
    risk_score_t1h = me.FloatField(default=0.0, help_text="T+1h Immediate Failure Risk (0.0 to 1.0)")
    risk_score_t6h = me.FloatField(default=0.0, help_text="T+6h Wetting-Front Saturation Risk (0.0 to 1.0)")
    risk_level = me.StringField(
        choices=["Safe", "Advisory", "Watch", "Warning", "Critical"],
        default="Safe"
    )

    meta = {
        'collection': 'sensor_data',
        'ordering': ['-timestamp'],
        'indexes': [
            'station_id',
            'timestamp',
            'risk_level',
            ('latitude', 'longitude'),
        ]
    }

    def to_dict(self):
        return {
            "id": str(self.id),
            "station_id": self.station_id,
            "cumulative_rainfall": self.cumulative_rainfall,
            "soil_moisture": self.soil_moisture,
            "acceleration_rate": self.acceleration_rate,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "risk_score_t1h": self.risk_score_t1h,
            "risk_score_t6h": self.risk_score_t6h,
            "risk_level": self.risk_level,
        }


class SOSReport(me.Document):
    """
    Citizen and field-responder crowdsourced incident report.
    Evaluated by NLP pipeline for spam and slope hazard authenticity.
    """
    user_id = me.StringField(required=True, default="ANON_CITIZEN")
    text_description = me.StringField(required=True, max_length=2000)
    latitude = me.FloatField(required=True)
    longitude = me.FloatField(required=True)

    # Authority & AI Verification Lifecycle
    verification_status = me.StringField(
        choices=["Pending", "Verified", "Rejected"],
        default="Pending"
    )
    is_spam = me.BooleanField(default=False)
    spam_confidence = me.FloatField(default=0.0)
    detected_category = me.StringField(default="UNSPECIFIED")
    timestamp = me.DateTimeField(default=lambda: datetime.now(timezone.utc))
    verified_by = me.StringField(null=True)
    verified_at = me.DateTimeField(null=True)

    meta = {
        'collection': 'sos_reports',
        'ordering': ['-timestamp'],
        'indexes': [
            'timestamp',
            'verification_status',
            'is_spam',
            ('latitude', 'longitude'),
        ]
    }

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "text_description": self.text_description,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "verification_status": self.verification_status,
            "is_spam": self.is_spam,
            "spam_confidence": self.spam_confidence,
            "detected_category": self.detected_category,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "verified_by": self.verified_by,
        }
