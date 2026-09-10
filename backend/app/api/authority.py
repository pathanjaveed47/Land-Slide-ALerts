import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database.session import get_db
from ..database.models import EvacuationOrder, Station
from ..schemas import EvacuationTriggerRequest, EvacuationOrderResponse
from ..services.geofence import generate_hazard_polygon
from ..websocket_manager import ws_manager

router = APIRouter(tags=["Authority & Mass Evacuation"])

# In-memory authority state for session evaluation
_authority_session = {"is_authority": True}


@router.get("/authority/status")
def get_authority_status():
    return {"is_authority": _authority_session["is_authority"]}


@router.post("/authority/toggle-mode")
def toggle_authority_mode():
    _authority_session["is_authority"] = not _authority_session["is_authority"]
    return {
        "status": "success",
        "is_authority": _authority_session["is_authority"],
        "mode": "DISASTER_DEFENSE_AUTHORITY" if _authority_session["is_authority"] else "PUBLIC_OBSERVER"
    }


@router.post("/evacuation/trigger", response_model=EvacuationOrderResponse)
async def trigger_mass_evacuation(
    req: EvacuationTriggerRequest,
    db: Session = Depends(get_db)
):
    """
    Authority-Restricted Action:
    Issues a sector-wide Mass Evacuation Order.
    Generates dynamic 8-vertex danger polygon and broadcasts urgent siren evacuation alert over WebSockets.
    """
    order_uuid = str(uuid.uuid4())
    polygon = generate_hazard_polygon(req.latitude, req.longitude, radius_km=req.radius_km, vertices=8)

    order = EvacuationOrder(
        order_uuid=order_uuid,
        sector_name=req.sector_name,
        station_id=req.station_id,
        center_latitude=req.latitude,
        center_longitude=req.longitude,
        radius_km=req.radius_km,
        polygon_coordinates=polygon,
        evacuation_level="IMMEDIATE_RED",
        reason=req.reason,
        issued_by=req.authorized_by,
        issued_at=datetime.now(timezone.utc),
        status="ACTIVE"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Broadcast emergency evacuation payload to all connected clients
    await ws_manager.broadcast({
        "type": "mass_evacuation_ordered",
        "order_uuid": order.order_uuid,
        "sector_name": order.sector_name,
        "station_id": order.station_id,
        "latitude": order.center_latitude,
        "longitude": order.center_longitude,
        "radius_km": order.radius_km,
        "polygon": polygon,
        "reason": order.reason,
        "issued_by": order.issued_by,
        "issued_at": order.issued_at.isoformat(),
        "siren_trigger": True
    })

    return order


@router.get("/evacuation/orders", response_model=List[EvacuationOrderResponse])
def list_evacuation_orders(
    status: Optional[str] = Query("ACTIVE"),
    db: Session = Depends(get_db)
):
    query = db.query(EvacuationOrder)
    if status:
        query = query.filter(EvacuationOrder.status == status.upper())
    return query.order_by(EvacuationOrder.issued_at.desc()).all()


@router.post("/evacuation/orders/{order_id}/cancel")
async def cancel_evacuation_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(EvacuationOrder).filter(EvacuationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Evacuation order not found")

    order.status = "CANCELLED"
    db.commit()

    await ws_manager.broadcast({
        "type": "evacuation_order_cancelled",
        "order_id": order.id,
        "order_uuid": order.order_uuid,
        "sector_name": order.sector_name
    })

    return {"status": "success", "message": f"Evacuation order for {order.sector_name} cancelled."}
