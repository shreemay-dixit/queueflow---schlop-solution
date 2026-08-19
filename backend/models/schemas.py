from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field

TenantId = Literal['apex_clinic', 'metro_bank', 'civic_hub', 'apple_genius']
QueueStatus = Literal['waiting', 'in_progress', 'completed', 'cancelled']
PriorityTier = Literal['urgent', 'medium', 'normal']
UpgradeStatus = Literal['offered', 'accepted', 'declined', 'expired']

class User(BaseModel):
    id: str
    phoneNumber: str
    name: str
    avatar: Optional[str] = None

class QueueEntry(BaseModel):
    id: str
    ticketNumber: str
    userId: str
    userName: str
    userPhone: str
    businessId: TenantId
    queueType: str
    status: QueueStatus
    priorityScore: int = Field(ge=1, le=5)  # 1 to 5
    estimatedWaitMinutes: int
    initialEstimatedWaitMinutes: int
    aiReasoning: str
    intakeText: str
    language: str
    intent: Literal['join_queue', 'cancel', 'inquiry', 'status_check']
    confidence: float
    mlTimeFactor: float
    positionInQueue: Optional[int] = None
    bumpedUp: Optional[bool] = False
    createdAt: str
    updatedAt: str

class ConsentUpgrade(BaseModel):
    id: str
    queueEntryId: str
    ticketNumber: str
    userName: str
    businessId: TenantId
    previousWaitMinutes: int
    newEstimatedWaitMinutes: int
    positionsGained: int
    status: UpgradeStatus
    offeredAt: str
    expiresAt: str
    reasonForVacancy: str

class BusinessQueueTypeConfig(BaseModel):
    id: str
    name: str
    avgServiceMinutes: int
    color: str
    description: str
    defaultPriority: int

class BusinessConfig(BaseModel):
    id: TenantId
    name: str
    tagline: str
    icon: str
    primaryColor: str
    baseServiceMinutes: int
    queueTypes: List[BusinessQueueTypeConfig]
    systemTriageInstructions: str
    timeOfDayMultipliers: Dict[int, float]
    emergencyThreshold: int

class TriageRequest(BaseModel):
    businessId: TenantId
    text: str
    name: str = "Anonymous Guest"
    phone: str = "+1 (555) 019-2831"

class TriageResult(BaseModel):
    intent: Literal['join_queue', 'cancel', 'inquiry', 'status_check']
    priority_score: int = Field(ge=1, le=5)
    queue_type: str
    reason: str
    language: str
    reply_message: str
    confidence: float
    urgency_factors: Optional[List[str]] = None

class ConsentOfferRequest(BaseModel):
    businessId: TenantId
    reason: Optional[str] = "Customer cancellation opened early service bay."

class ConsentResponseRequest(BaseModel):
    consentId: str
    action: Literal['accept', 'decline']

class QueueResponse(BaseModel):
    entries: List[QueueEntry]
    consentUpgrades: List[ConsentUpgrade]
    stats: Dict[str, float]
