import datetime
from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import TenantId
from backend.services.ml_demand_engine import get_ml_metrics_summary
from database.db import db

router = APIRouter(prefix="/queue", tags=["Queue"])

@router.get("")
async def get_queue(business_id: TenantId = Query(default="metro_bank")):
    entries = db.get_entries_for_business(business_id)
    consent_upgrades = db.get_consent_upgrades_for_business(business_id)
    config = db.configs.get(business_id)

    total_waiting = len([e for e in entries if e.status == 'waiting'])
    in_progress = len([e for e in entries if e.status == 'in_progress'])
    completed = len([e for e in entries if e.status == 'completed'])
    cancelled = len([e for e in entries if e.status == 'cancelled'])

    waiting_waits = [e.estimatedWaitMinutes for e in entries if e.status == 'waiting']
    avg_wait = round(sum(waiting_waits) / len(waiting_waits)) if waiting_waits else 0

    stats = {
        "totalWaiting": total_waiting,
        "inProgress": in_progress,
        "completedToday": completed,
        "cancelledToday": cancelled,
        "averageWaitMinutes": avg_wait,
        "triageAccuracy": 98.4,
        "noShowRecoveryRate": 92.1,
    }

    ml_metrics = None
    if config:
        ml_metrics = get_ml_metrics_summary(config.name, config.timeOfDayMultipliers)

    return {
        "entries": [e.dict() for e in entries],
        "consentUpgrades": [c.dict() for c in consent_upgrades],
        "stats": stats,
        "mlMetrics": ml_metrics,
    }

@router.post("/{ticket_id}/advance")
async def advance_ticket(ticket_id: str):
    entry = db.queue_entries.get(ticket_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_status = 'completed' if entry.status == 'in_progress' else 'in_progress'
    updated = db.update_queue_entry(ticket_id, {
        "status": new_status,
        "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"
    })

    db.add_audit_log(
        business_id=entry.businessId,
        event_type='QUEUE_ADVANCED',
        raw_input=f"Ticket {entry.ticketNumber} transitioned to {new_status}",
        details={
            "ticketNumber": entry.ticketNumber,
            "userName": entry.userName,
            "status": new_status,
        }
    )

    return {"success": True, "ticket": updated.dict() if updated else None}

@router.post("/{ticket_id}/cancel")
async def cancel_ticket(ticket_id: str):
    entry = db.queue_entries.get(ticket_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Ticket not found")

    updated = db.update_queue_entry(ticket_id, {
        "status": "cancelled",
        "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"
    })

    db.add_audit_log(
        business_id=entry.businessId,
        event_type='NO_SHOW_DETECTED',
        raw_input=f"Ticket {entry.ticketNumber} cancelled/no-show",
        details={
            "ticketNumber": entry.ticketNumber,
            "userName": entry.userName,
            "status": "cancelled"
        }
    )

    return {"success": True, "ticket": updated.dict() if updated else None}
