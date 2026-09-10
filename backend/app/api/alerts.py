import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database.session import get_db
from ..database.models import AlertLog, NotificationLog, Station
from ..schemas import AlertLogResponse, NotificationLogResponse

router = APIRouter(prefix="/alerts", tags=["Alerts & Dispatches"])


@router.get("", response_model=List[AlertLogResponse])
def get_alerts(
    status: Optional[str] = Query(default=None, description="ACTIVE, ACKNOWLEDGED, RESOLVED"),
    risk_level: Optional[str] = Query(default=None, description="Warning, Critical"),
    station_id: Optional[int] = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AlertLog)

    if status:
        query = query.filter(AlertLog.status == status.upper())
    if risk_level:
        query = query.filter(AlertLog.risk_level == risk_level.capitalize())
    if station_id:
        query = query.filter(AlertLog.station_id == station_id)

    alerts = query.order_by(AlertLog.timestamp.desc()).limit(limit).all()
    return alerts


@router.get("/notifications", response_model=List[NotificationLogResponse])
def get_notifications(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    return db.query(NotificationLog).order_by(NotificationLog.timestamp.desc()).limit(limit).all()


@router.post("/{alert_id}/ack")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"status": "success", "alert_id": alert.id, "alert_status": alert.status}


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "RESOLVED"
    alert.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"status": "success", "alert_id": alert.id, "alert_status": alert.status}
