import uuid
import datetime
from fastapi import APIRouter, HTTPException
from backend.models.schemas import ConsentOfferRequest, ConsentResponseRequest, ConsentUpgrade
from database.db import db

router = APIRouter(prefix="/consent", tags=["Consent"])

@router.post("/offer")
async def trigger_consent_offer(payload: ConsentOfferRequest):
    entries = db.get_entries_for_business(payload.businessId)
    waiting_candidates = [e for e in entries if e.status == 'waiting' and not e.bumpedUp]

    if not waiting_candidates:
        raise HTTPException(status_code=400, detail="No waiting candidates available for upgrade.")

    # Target candidate with high priority but longest wait
    target_entry = waiting_candidates[0]
    offer_id = f"offer_{uuid.uuid4().hex[:8]}"

    new_wait = max(2, int(target_entry.estimatedWaitMinutes * 0.3))
    upgrade = ConsentUpgrade(
        id=offer_id,
        queueEntryId=target_entry.id,
        ticketNumber=target_entry.ticketNumber,
        userName=target_entry.userName,
        businessId=payload.businessId,
        previousWaitMinutes=target_entry.estimatedWaitMinutes,
        newEstimatedWaitMinutes=new_wait,
        positionsGained=max(1, (target_entry.positionInQueue or 3) - 1),
        status='offered',
        offeredAt=datetime.datetime.utcnow().isoformat() + "Z",
        expiresAt=(datetime.datetime.utcnow() + datetime.timedelta(minutes=5)).isoformat() + "Z",
        reasonForVacancy=payload.reason or "Customer cancellation opened early service bay."
    )

    db.consent_upgrades[offer_id] = upgrade

    db.add_audit_log(
        business_id=payload.businessId,
        event_type='CONSENT_OFFERED',
        raw_input=f"Fast-Pass offer dispatched to {target_entry.ticketNumber}",
        details={
            "ticketNumber": target_entry.ticketNumber,
            "userName": target_entry.userName,
            "previousWait": target_entry.estimatedWaitMinutes,
            "newWait": new_wait,
            "consentId": offer_id,
        }
    )

    return {"success": True, "offer": upgrade.dict()}

@router.post("/respond")
async def respond_to_consent(payload: ConsentResponseRequest):
    upgrade = db.consent_upgrades.get(payload.consentId)
    if not upgrade:
        raise HTTPException(status_code=404, detail="Consent offer not found")

    if payload.action == 'accept':
        upgrade.status = 'accepted'
        db.update_queue_entry(upgrade.queueEntryId, {
            "estimatedWaitMinutes": upgrade.newEstimatedWaitMinutes,
            "bumpedUp": True,
            "priorityScore": 5, # Promoted to highest priority
            "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"
        })

        db.add_audit_log(
            business_id=upgrade.businessId,
            event_type='CONSENT_ACCEPTED',
            raw_input=f"Customer {upgrade.ticketNumber} accepted slot upgrade",
            details={
                "ticketNumber": upgrade.ticketNumber,
                "userName": upgrade.userName,
                "gainedMinutes": upgrade.previousWaitMinutes - upgrade.newEstimatedWaitMinutes,
                "consentId": upgrade.id,
            }
        )
    else:
        upgrade.status = 'declined'

    return {"success": True, "upgrade": upgrade.dict()}
