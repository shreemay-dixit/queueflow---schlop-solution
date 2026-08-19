export type TenantId = 'apex_clinic' | 'metro_bank' | 'civic_hub' | 'apple_genius';

export type AppView = 'staff' | 'user' | 'waitlist' | 'simulator';

export type QueueStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled';

export type PriorityTier = 'urgent' | 'medium' | 'normal';

export type UpgradeStatus = 'offered' | 'accepted' | 'declined' | 'expired';

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  avatar?: string;
}

export interface QueueEntry {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  businessId: TenantId;
  queueType: string;
  status: QueueStatus;
  priorityScore: number; // 1 to 5
  estimatedWaitMinutes: number;
  initialEstimatedWaitMinutes: number;
  aiReasoning: string;
  intakeText: string;
  language: string;
  intent: 'join_queue' | 'cancel' | 'inquiry' | 'status_check';
  confidence: number;
  mlTimeFactor: number;
  positionInQueue?: number;
  bumpedUp?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentUpgrade {
  id: string;
  queueEntryId: string;
  ticketNumber: string;
  userName: string;
  businessId: TenantId;
  previousWaitMinutes: number;
  newEstimatedWaitMinutes: number;
  positionsGained: number;
  status: UpgradeStatus;
  offeredAt: string;
  expiresAt: string;
  reasonForVacancy: string;
}

export interface BusinessQueueTypeConfig {
  id: string;
  name: string;
  avgServiceMinutes: number;
  color: string;
  description: string;
  defaultPriority: number;
}

export interface BusinessConfig {
  id: TenantId;
  name: string;
  tagline: string;
  icon: string;
  primaryColor: string;
  baseServiceMinutes: number;
  queueTypes: BusinessQueueTypeConfig[];
  systemTriageInstructions: string;
  timeOfDayMultipliers: { [hour: number]: number };
  emergencyThreshold: number;
}

export interface TriageResult {
  intent: 'join_queue' | 'cancel' | 'inquiry' | 'status_check';
  priority_score: number; // 1-5
  queue_type: string;
  reason: string;
  language: string;
  reply_message: string;
  confidence: number;
  urgency_factors?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  businessId: TenantId;
  eventType: 'TRIAGE_EVALUATION' | 'NO_SHOW_DETECTED' | 'CONSENT_OFFERED' | 'CONSENT_ACCEPTED' | 'QUEUE_ADVANCED' | 'MANUAL_OVERRIDE';
  rawInput?: string;
  details: {
    ticketNumber?: string;
    userName?: string;
    intent?: string;
    priorityScore?: number;
    queueType?: string;
    reasoning?: string;
    language?: string;
    mlFactor?: number;
    waitMinutesCalculated?: number;
    consentId?: string;
  };
}

export interface MLModelMetrics {
  modelName: string;
  version: string;
  featuresUsed: string[];
  meanAbsoluteErrorMinutes: number;
  r2Score: number;
  currentTimeOfDayFactor: number;
  currentPeakFactorExplanation: string;
  hourlyTrends: { hour: number; label: string; factor: number; historicalVolume: number }[];
}
