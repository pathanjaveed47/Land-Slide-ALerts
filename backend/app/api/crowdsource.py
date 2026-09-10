import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, status
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..database.models import SOSReport
from ..schemas import SOSReportIn, SOSReportResponse, SOSReportItem, SOSVerifyRequest
from ..services.nlp_spam_filter import nlp_classifier
from ..websocket_manager import ws_manager

logger = logging.getLogger("landslide_sentinel.crowdsource")

router = APIRouter(prefix="/sos", tags=["Crowdsourcing & Citizen SOS"])


async def _broadcast_sos_alert(report: SOSReport):
    """Broadcasts a new citizen hazard report over WebSockets."""
    try:
        await ws_manager.broadcast({
            "type": "citizen_sos_report",
            "report_uuid": report.report_uuid,
            "reporter_id": report.reporter_id,
            "text": report.text,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "is_valid_hazard": report.is_valid_hazard,
            "is_spam": report.is_spam,
            "confidence": report.confidence,
            "detected_category": report.detected_category,
            "verification_status": report.verification_status,
            "timestamp": report.timestamp.isoformat()
        })
        logger.info(f"Broadcasted citizen SOS alert {report.report_uuid} ({report.detected_category})")
    except Exception as e:
        logger.error(f"Failed broadcasting SOS alert: {e}")


@router.post(
    "/report",
    response_model=SOSReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit citizen SOS hazard report with NLP classification"
)
async def submit_sos_report(
    report_in: SOSReportIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Ingests crowdsourced citizen observations (e.g. 'muddy springs', 'leaning trees', 'tension cracks').
    Applies Hugging Face / domain heuristic NLP classification to identify authentic morphological indicators
    while filtering out spam and commercial chatter.
    """
    try:
        # Non-blocking async NLP classification
        classification = await nlp_classifier.classify_report(report_in.text)
        is_valid = classification["is_valid_hazard"]
        is_spam = classification.get("is_spam", not is_valid)
        confidence = classification["confidence"]
        category = classification["category"]

        report_uuid = str(uuid.uuid4())
        initial_status = "PENDING" if is_valid else "REJECTED"

        report_obj = SOSReport(
            report_uuid=report_uuid,
            reporter_id=report_in.reporter_id or "CITIZEN_ANON",
            text=report_in.text,
            latitude=report_in.latitude,
            longitude=report_in.longitude,
            timestamp=datetime.now(timezone.utc),
            is_valid_hazard=is_valid,
            is_spam=is_spam,
            confidence=confidence,
            detected_category=category,
            verification_status=initial_status,
            reviewed_by="AUTOMATED_NLP_ENGINE" if is_spam else None,
            reviewed_at=datetime.now(timezone.utc) if is_spam else None,
            alert_broadcasted=is_valid
        )
        db.add(report_obj)
        db.commit()
        db.refresh(report_obj)

        if is_valid:
            background_tasks.add_task(_broadcast_sos_alert, report_obj)

        status_msg = (
            f"Geotechnical hazard precursor identified: '{category}'. Escalated for response."
            if is_valid
            else "Report categorized as spam or irrelevant chatter; filtered out."
        )

        return SOSReportResponse(
            report_uuid=report_uuid,
            is_valid_hazard=is_valid,
            is_spam=is_spam,
            confidence=confidence,
            detected_category=category,
            verification_status=initial_status,
            message=status_msg,
            alert_broadcasted=is_valid
        )
    except Exception as e:
        logger.exception(f"Error processing citizen SOS report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SOS processing failed: {str(e)}"
        )


@router.get("/reports", response_model=List[SOSReportItem])
def list_sos_reports(
    status: Optional[str] = Query(None, description="PENDING, VERIFIED, or REJECTED"),
    valid_only: Optional[bool] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(SOSReport)
    if status:
        query = query.filter(SOSReport.verification_status == status.upper())
    if valid_only is not None:
        query = query.filter(SOSReport.is_valid_hazard == valid_only)

    return query.order_by(SOSReport.timestamp.desc()).limit(limit).all()


@router.post("/reports/{report_id}/verify")
async def verify_sos_report(
    report_id: int,
    payload: SOSVerifyRequest,
    db: Session = Depends(get_db)
):
    """Authority review endpoint: mark as VERIFIED or REJECTED."""
    report = db.query(SOSReport).filter(SOSReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="SOS Report not found")

    new_status = payload.verification_status.upper()
    if new_status not in ["VERIFIED", "REJECTED", "PENDING"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be VERIFIED, REJECTED, or PENDING")

    report.verification_status = new_status
    report.reviewed_by = payload.reviewer
    report.reviewed_at = datetime.now(timezone.utc)
    db.commit()

    # Broadcast status change to connected dashboards
    await ws_manager.broadcast({
        "type": "sos_status_updated",
        "report_id": report.id,
        "report_uuid": report.report_uuid,
        "verification_status": report.verification_status,
        "reviewed_by": report.reviewed_by,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return {
        "status": "success",
        "report_id": report.id,
        "verification_status": report.verification_status,
        "reviewed_by": report.reviewed_by
    }
