import uuid
import datetime
from fastapi import APIRouter, HTTPException
from backend.models.schemas import TriageRequest, QueueEntry
from backend.services.gemini_triage import evaluate_triage
from backend.services.ml_demand_engine import (
    calculate_ml_time_of_day_factor,
    calculate_estimated_wait_time,
)
from database.db import db

router = APIRouter(prefix="/triage", tags=["Triage"])

@router.post("")
async def create_triage_entry(payload: TriageRequest):
    config = db.configs.get(payload.businessId)
    if not config:
        raise HTTPException(status_code=404, detail="Business tenant configuration not found")

    # 1. Run Structured Gemini LLM Evaluation
    triage_result = await evaluate_triage(payload.text, config)

    # 2. Intent Branching
    if triage_result.intent == 'cancel':
        db.add_audit_log(
            business_id=payload.businessId,
            event_type='TICKET_CANCELLED',
            raw_input=payload.text,
            details={
                "intent": "cancel",
                "reasoning": triage_result.reason,
                "language": triage_result.language,
            }
        )
        return {
            "intent": "cancel",
            "triage": triage_result.dict(),
            "message": triage_result.reply_message
        }

    # 3. Dynamic ML Wait Time Calculation
    active_entries = db.get_entries_for_business(payload.businessId)
    people_ahead = len([e for e in active_entries if e.status == 'waiting'])
    
    time_factor = calculate_ml_time_of_day_factor(config.timeOfDayMultipliers)
    wait_minutes = calculate_estimated_wait_time(
        people_ahead=people_ahead,
        base_service_minutes=config.baseServiceMinutes,
        priority_score=triage_result.priority_score,
        time_of_day_factor=time_factor
    )

    # 4. Generate Ticket Code
    prefix = {
        'apex_clinic': 'A',
        'metro_bank': 'B',
        'civic_hub': 'C',
        'apple_genius': 'G',
    }.get(payload.businessId, 'Q')
    ticket_number = f"{prefix}-{100 + len(active_entries) + 1}"

    # 5. Create Queue Entry Record
    ticket_id = f"ticket_{uuid.uuid4().hex[:8]}"
    entry = QueueEntry(
        id=ticket_id,
        ticketNumber=ticket_number,
        userId=f"user_{uuid.uuid4().hex[:6]}",
        userName=payload.name,
        userPhone=payload.phone,
        businessId=payload.businessId,
        queueType=triage_result.queue_type,
        status='waiting',
        priorityScore=triage_result.priority_score,
        estimatedWaitMinutes=wait_minutes,
        initialEstimatedWaitMinutes=wait_minutes,
        aiReasoning=triage_result.reason,
        intakeText=payload.text,
        language=triage_result.language,
        intent=triage_result.intent,
        confidence=triage_result.confidence,
        mlTimeFactor=time_factor,
        bumpedUp=False,
        createdAt=datetime.datetime.utcnow().isoformat() + "Z",
        updatedAt=datetime.datetime.utcnow().isoformat() + "Z"
    )

    db.add_queue_entry(entry)

    # 6. Audit Log
    db.add_audit_log(
        business_id=payload.businessId,
        event_type='TRIAGE_EVALUATION',
        raw_input=payload.text,
        details={
            "ticketNumber": ticket_number,
            "userName": payload.name,
            "priorityScore": triage_result.priority_score,
            "queueType": triage_result.queue_type,
            "reasoning": triage_result.reason,
            "language": triage_result.language,
            "mlFactor": time_factor,
            "waitMinutesCalculated": wait_minutes,
        }
    )

    return {
        "success": True,
        "ticket": entry.dict(),
        "triage": triage_result.dict()
    }
