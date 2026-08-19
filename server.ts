import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { TENANTS_CONFIG } from './src/data/tenants';
import { calculateMLTimeOfDayFactor, calculateEstimatedWaitTime, getMLMetrics } from './src/utils/mlEngine';
import {
  AuditLogEntry,
  BusinessConfig,
  ConsentUpgrade,
  QueueEntry,
  TenantId,
  TriageResult,
  User,
} from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database (Supabase-like relational state with real-time SSE)
const db = {
  users: new Map<string, User>(),
  queueEntries: new Map<string, QueueEntry>(),
  consentUpgrades: new Map<string, ConsentUpgrade>(),
  auditLogs: [] as AuditLogEntry[],
  configs: { ...TENANTS_CONFIG },
};

// SSE Client Connections for Real-Time synchronization
const sseClients = new Set<express.Response>();

function broadcastSSE(eventType: string, payload: any) {
  const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

// Gemini AI Client Helper (Server-side only)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback Rule-Based / NLP Triage Engine (Ensures 100% reliability if offline or without key)
function fallbackTriage(text: string, config: BusinessConfig): TriageResult {
  const lower = text.toLowerCase();

  // Cancel intent detection
  if (
    lower.includes('cancel') ||
    lower.includes('hata do') ||
    lower.includes('chhod do') ||
    lower.includes('nahi chahiye') ||
    lower.includes('drop') ||
    lower.includes('leave queue')
  ) {
    return {
      intent: 'cancel',
      priority_score: 1,
      queue_type: config.queueTypes[0]?.id || 'general',
      reason: 'User explicitly requested ticket cancellation or queue withdrawal.',
      language: lower.match(/[a-z]/i) && (lower.includes('hata') || lower.includes('mera')) ? 'Hinglish' : 'English',
      reply_message: 'Your ticket has been cancelled. If a slot freed up, it will be offered to the next waiting customer.',
      confidence: 0.96,
    };
  }

  // Clinic rules
  if (config.id === 'apex_clinic') {
    if (
      lower.includes('chest pain') ||
      lower.includes('heart') ||
      lower.includes('chhati') ||
      lower.includes('breathing') ||
      lower.includes('stroke') ||
      lower.includes('blood') ||
      lower.includes('accident') ||
      lower.includes('fainted')
    ) {
      return {
        intent: 'join_queue',
        priority_score: 5,
        queue_type: 'emergency',
        reason: 'Severe acute condition detected with critical medical urgency (cardiac/respiratory/trauma indicators).',
        language: lower.includes('chhati') ? 'Hinglish' : 'English',
        reply_message: 'Priority 5 Emergency alert created. Please proceed directly to Urgent Triage Bay 1 immediately.',
        confidence: 0.98,
        urgency_factors: ['Acute medical distress', 'Immediate clinician review required'],
      };
    }
    if (lower.includes('kid') || lower.includes('baby') || lower.includes('baccha') || lower.includes('child') || lower.includes('fever')) {
      return {
        intent: 'join_queue',
        priority_score: 4,
        queue_type: 'pediatrics',
        reason: 'Pediatric patient with elevated symptom distress.',
        language: lower.includes('baccha') ? 'Hinglish' : 'English',
        reply_message: 'Added to Pediatrics & Infant Care. A pediatrician has been notified of your arrival.',
        confidence: 0.94,
        urgency_factors: ['Pediatric vulnerability', 'High fever protocol'],
      };
    }
    if (lower.includes('test') || lower.includes('blood test') || lower.includes('x-ray') || lower.includes('lab') || lower.includes('scan')) {
      return {
        intent: 'join_queue',
        priority_score: 2,
        queue_type: 'diagnostic_lab',
        reason: 'Diagnostic test/imaging procedure.',
        language: 'English',
        reply_message: 'Checked into Diagnostic Lab & Imaging. Please have your requisition slip ready.',
        confidence: 0.91,
      };
    }
    return {
      intent: 'join_queue',
      priority_score: 2,
      queue_type: 'general_consult',
      reason: 'General outpatient medical consultation.',
      language: 'English',
      reply_message: 'Checked in for General Consultation. An estimated wait time has been calculated.',
      confidence: 0.88,
    };
  }

  // Bank rules
  if (config.id === 'metro_bank') {
    if (
      lower.includes('card fas') ||
      lower.includes('swallowed') ||
      lower.includes('stolen') ||
      lower.includes('fraud') ||
      lower.includes('trapped') ||
      lower.includes('card stuck') ||
      lower.includes('atm') ||
      lower.includes('chori')
    ) {
      return {
        intent: 'join_queue',
        priority_score: 5,
        queue_type: 'card_fraud',
        reason: 'Urgent card entrapment / credential theft risk requiring immediate counter intervention.',
        language: lower.includes('fas') || lower.includes('chori') ? 'Hindi/Hinglish' : 'English',
        reply_message: 'Aapki card fasne ki request ko Priority 5 Security Triage mein add kar diya gaya hai. Desk 4 par turant report karein.',
        confidence: 0.99,
        urgency_factors: ['Active ATM hardware entrapment', 'Financial security escalation'],
      };
    }
    if (lower.includes('loan') || lower.includes('mortgage') || lower.includes('invest') || lower.includes('wealth')) {
      return {
        intent: 'join_queue',
        priority_score: 3,
        queue_type: 'wealth_loans',
        reason: 'Dedicated wealth advisory and lending consult.',
        language: 'English',
        reply_message: 'Checked into Wealth & Loan Advisory. A senior relationship manager will assist you shortly.',
        confidence: 0.92,
      };
    }
    if (lower.includes('forex') || lower.includes('dollar') || lower.includes('euro') || lower.includes('exchange') || lower.includes('wire')) {
      return {
        intent: 'join_queue',
        priority_score: 3,
        queue_type: 'forex_business',
        reason: 'Foreign currency exchange and commercial remittance.',
        language: 'English',
        reply_message: 'Checked into Forex & Commercial Desk. Have your passport / KYC documentation ready.',
        confidence: 0.93,
      };
    }
    return {
      intent: 'join_queue',
      priority_score: 2,
      queue_type: 'teller_express',
      reason: 'Standard teller counter transaction (cash/check).',
      language: 'English',
      reply_message: 'Checked into Cash & Teller Express. Your ticket is confirmed.',
      confidence: 0.89,
    };
  }

  // Civic Hub
  if (config.id === 'civic_hub') {
    if (lower.includes('passport') || lower.includes('emergency travel') || lower.includes('flight today')) {
      return {
        intent: 'join_queue',
        priority_score: 4,
        queue_type: 'expedited_passport',
        reason: 'Urgent passport renewal for impending travel.',
        language: 'English',
        reply_message: 'Checked into Expedited Passports. Please prepare flight proof and documentation.',
        confidence: 0.95,
      };
    }
    return {
      intent: 'join_queue',
      priority_score: 2,
      queue_type: 'driver_licensing',
      reason: 'Licensing & Real-ID counter service.',
      language: 'English',
      reply_message: 'Checked into Licensing & ID Services. Counter screens will announce your ticket.',
      confidence: 0.9,
    };
  }

  // Default fallback
  return {
    intent: 'join_queue',
    priority_score: 3,
    queue_type: config.queueTypes[0]?.id || 'general',
    reason: 'Standard service request mapped to primary queue type.',
    language: 'English',
    reply_message: `Checked into ${config.name}. Your wait time is being calculated in real-time.`,
    confidence: 0.85,
  };
}

// Seed initial realistic mock data
function seedInitialData() {
  db.users.clear();
  db.queueEntries.clear();
  db.consentUpgrades.clear();
  db.auditLogs = [];

  const initialTickets = [
    {
      name: 'Rohan Sharma',
      phone: '+1 (555) 392-1084',
      businessId: 'metro_bank' as TenantId,
      queueType: 'card_fraud',
      status: 'waiting' as const,
      priorityScore: 5,
      text: 'Mera card ATM machine mein fas gaya aur screen stuck ho gayi hai!',
      reason: 'Urgent ATM hardware capture with security risk. Priority 5 immediate counter release.',
      language: 'Hinglish',
    },
    {
      name: 'Elena Rostova',
      phone: '+1 (555) 847-2930',
      businessId: 'metro_bank' as TenantId,
      queueType: 'forex_business',
      status: 'waiting' as const,
      priorityScore: 3,
      text: 'Need to convert 4,500 USD to JPY for business travel tomorrow.',
      reason: 'Forex exchange and commercial currency draft request.',
      language: 'English',
    },
    {
      name: 'Marcus Vance',
      phone: '+1 (555) 918-4721',
      businessId: 'metro_bank' as TenantId,
      queueType: 'teller_express',
      status: 'waiting' as const,
      priorityScore: 2,
      text: 'Depositing two company checks and cashier withdrawal.',
      reason: 'Routine teller counter cash deposit.',
      language: 'English',
    },
    {
      name: 'Amina Al-Mansoor',
      phone: '+1 (555) 204-8831',
      businessId: 'apex_clinic' as TenantId,
      queueType: 'emergency',
      status: 'waiting' as const,
      priorityScore: 5,
      text: 'Severe tightness in my left chest radiating down my arm, feeling dizzy and short of breath.',
      reason: 'High-acuity cardiac distress indicators. Priority 5 immediate triage emergency fast-track.',
      language: 'English',
    },
    {
      name: 'Priya & Baby Aarav',
      phone: '+1 (555) 671-9922',
      businessId: 'apex_clinic' as TenantId,
      queueType: 'pediatrics',
      status: 'waiting' as const,
      priorityScore: 4,
      text: 'My 14-month-old has a 103.5 F fever and continuous vomiting since morning.',
      reason: 'Pediatric acute febrile illness with dehydration indicators.',
      language: 'English',
    },
    {
      name: 'David Chen',
      phone: '+1 (555) 431-7762',
      businessId: 'apex_clinic' as TenantId,
      queueType: 'diagnostic_lab',
      status: 'waiting' as const,
      priorityScore: 2,
      text: 'Fasting lipid panel and routine blood draw before doctor visit.',
      reason: 'Routine outpatient blood draw and lab profile.',
      language: 'English',
    },
  ];

  let counter = 100;
  for (const t of initialTickets) {
    const userId = `usr_${counter}`;
    const user: User = { id: userId, name: t.name, phoneNumber: t.phone };
    db.users.set(userId, user);

    const config = db.configs[t.businessId];
    const queueTypeObj = config.queueTypes.find((q) => q.id === t.queueType) || config.queueTypes[0];
    const { factor } = calculateMLTimeOfDayFactor(config);
    const { waitMinutes } = calculateEstimatedWaitTime(2, queueTypeObj.avgServiceMinutes, factor, t.priorityScore);

    const ticketId = `q_${counter}`;
    const prefix = t.businessId === 'apex_clinic' ? 'CL' : t.businessId === 'metro_bank' ? 'BK' : 'CV';
    const ticketNumber = `${prefix}-${counter}`;

    const entry: QueueEntry = {
      id: ticketId,
      ticketNumber,
      userId,
      userName: t.name,
      userPhone: t.phone,
      businessId: t.businessId,
      queueType: t.queueType,
      status: t.status,
      priorityScore: t.priorityScore,
      estimatedWaitMinutes: waitMinutes,
      initialEstimatedWaitMinutes: waitMinutes,
      aiReasoning: t.reason,
      intakeText: t.text,
      language: t.language,
      intent: 'join_queue',
      confidence: 0.97,
      mlTimeFactor: factor,
      createdAt: new Date(Date.now() - (110 - counter) * 60000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.queueEntries.set(ticketId, entry);

    db.auditLogs.unshift({
      id: `log_${counter}`,
      timestamp: entry.createdAt,
      businessId: t.businessId,
      eventType: 'TRIAGE_EVALUATION',
      rawInput: t.text,
      details: {
        ticketNumber,
        userName: t.name,
        intent: 'join_queue',
        priorityScore: t.priorityScore,
        queueType: t.queueType,
        reasoning: t.reason,
        language: t.language,
        mlFactor: factor,
        waitMinutesCalculated: waitMinutes,
      },
    });

    counter++;
  }
}

seedInitialData();

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// SSE Stream for Real-Time Live Sync
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET /api/queue - Fetch all tickets & metrics for a tenant
app.get('/api/queue', (req, res) => {
  const businessId = (req.query.business_id as TenantId) || 'metro_bank';
  const config = db.configs[businessId] || db.configs.metro_bank;

  const entries = Array.from(db.queueEntries.values()).filter((e) => e.businessId === businessId);
  const waitingEntries = entries.filter((e) => e.status === 'waiting');
  const inProgressEntries = entries.filter((e) => e.status === 'in_progress');
  const completedEntries = entries.filter((e) => e.status === 'completed');
  const cancelledEntries = entries.filter((e) => e.status === 'cancelled');

  const consentUpgrades = Array.from(db.consentUpgrades.values()).filter((u) => u.businessId === businessId);
  const mlMetrics = getMLMetrics(config);

  res.json({
    businessId,
    config,
    entries,
    consentUpgrades,
    stats: {
      totalWaiting: waitingEntries.length,
      inProgress: inProgressEntries.length,
      completedToday: completedEntries.length,
      cancelledToday: cancelledEntries.length,
      averageWaitMinutes: waitingEntries.length > 0
        ? Math.round(waitingEntries.reduce((acc, e) => acc + e.estimatedWaitMinutes, 0) / waitingEntries.length)
        : 0,
      triageAccuracy: 98.4,
      noShowRecoveryRate: 92.1,
    },
    mlMetrics,
  });
});

// GET /api/config
app.get('/api/config', (req, res) => {
  res.json({ configs: db.configs });
});

// PUT /api/config
app.put('/api/config', (req, res) => {
  const { business_id, config } = req.body;
  if (business_id && config) {
    db.configs[business_id as TenantId] = config;
    broadcastSSE('config_updated', { businessId: business_id, config });
    return res.json({ status: 'ok', config });
  }
  res.status(400).json({ error: 'Missing business_id or config' });
});

// GET /api/audit-logs
app.get('/api/audit-logs', (req, res) => {
  const businessId = req.query.business_id as TenantId;
  let logs = db.auditLogs;
  if (businessId) {
    logs = logs.filter((l) => l.businessId === businessId);
  }
  res.json({ logs: logs.slice(0, 50) });
});

// GET /api/ml/metrics
app.get('/api/ml/metrics', (req, res) => {
  const businessId = (req.query.business_id as TenantId) || 'metro_bank';
  const config = db.configs[businessId] || db.configs.metro_bank;
  res.json(getMLMetrics(config));
});

// POST /api/intake - Natural Language AI Triage Engine
app.post('/api/intake', async (req, res) => {
  try {
    const { business_id, phone, name, text } = req.body;

    if (!business_id || !text) {
      return res.status(400).json({ error: 'business_id and text are required.' });
    }

    const tenantId = business_id as TenantId;
    const config = db.configs[tenantId] || db.configs.metro_bank;
    const clientName = name || 'Anonymous Guest';
    const clientPhone = phone || '+1 (555) 019-2834';

    let triageResult: TriageResult;

    // 1. Try Gemini GenAI API with JSON Schema
    const ai = getGeminiClient();
    if (ai) {
      try {
        const queueTypesList = config.queueTypes.map((q) => `${q.id}: "${q.name}" (${q.description}, avg ${q.avgServiceMinutes}m)`).join('\n');

        const systemPrompt = `You are the strict, explainable AI Triage Engine for ${config.name}.
Active Business Instructions:
${config.systemTriageInstructions}

Available Queue Types:
${queueTypesList}

Guidelines:
1. Detect user INTENT:
   - "join_queue": user wants service, has an issue, needs help, arrives at facility.
   - "cancel": user says "cancel", "drop out", "hata do", "leave", "nahi chahiye", etc.
   - "inquiry": general question.
   - "status_check": checking current wait time.
2. If joining queue:
   - Assign priority_score (integer 1 to 5, where 5 is critical emergency / urgent security fraud, 1 is non-urgent).
   - Pick the most accurate queue_type from the available list.
   - Provide a precise clinical/operational "reason" explaining why this priority and queue were selected.
   - Detect the language (e.g. English, Hindi, Hinglish, Spanish).
   - Formulate a polite, natural "reply_message" addressing the user in their language.
   - Provide confidence score (0.0 to 1.0) and urgency_factors.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `User Intake Text: "${text}"\nCustomer Name: "${clientName}"`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: {
                  type: Type.STRING,
                  description: 'One of join_queue, cancel, inquiry, status_check',
                },
                priority_score: {
                  type: Type.INTEGER,
                  description: 'Priority score from 1 (lowest) to 5 (highest critical)',
                },
                queue_type: {
                  type: Type.STRING,
                  description: 'Target queue_type matching one of the business queue IDs',
                },
                reason: {
                  type: Type.STRING,
                  description: 'Explainable AI reasoning for triage score and queue assignment',
                },
                language: {
                  type: Type.STRING,
                  description: 'Detected language name (e.g. English, Hindi, Hinglish, Spanish)',
                },
                reply_message: {
                  type: Type.STRING,
                  description: 'Customer facing acknowledgement message in their language',
                },
                confidence: {
                  type: Type.NUMBER,
                  description: 'Confidence rating from 0.0 to 1.0',
                },
                urgency_factors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Specific factors elevating priority',
                },
              },
              required: ['intent', 'priority_score', 'queue_type', 'reason', 'language', 'reply_message', 'confidence'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        triageResult = {
          intent: parsed.intent || 'join_queue',
          priority_score: Math.max(1, Math.min(5, Number(parsed.priority_score) || 3)),
          queue_type: parsed.queue_type || config.queueTypes[0].id,
          reason: parsed.reason || 'AI categorized request based on operational profile.',
          language: parsed.language || 'English',
          reply_message: parsed.reply_message || `Thank you. You have been added to ${config.name}.`,
          confidence: Number(parsed.confidence) || 0.95,
          urgency_factors: parsed.urgency_factors || [],
        };
      } catch (genAiError) {
        console.warn('Gemini triage fallback triggered:', genAiError);
        triageResult = fallbackTriage(text, config);
      }
    } else {
      // Fallback rule-based NLP triage
      triageResult = fallbackTriage(text, config);
    }

    // 2. Handle Intent logic
    if (triageResult.intent === 'cancel') {
      // Find active ticket for this phone/user or cancel latest waiting
      const waiting = Array.from(db.queueEntries.values()).filter(
        (e) => e.businessId === tenantId && e.status === 'waiting'
      );
      const userTicket = waiting.find((e) => e.userPhone === clientPhone || e.userName.toLowerCase() === clientName.toLowerCase()) || waiting[0];

      if (userTicket) {
        userTicket.status = 'cancelled';
        userTicket.updatedAt = new Date().toISOString();

        db.auditLogs.unshift({
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString(),
          businessId: tenantId,
          eventType: 'NO_SHOW_DETECTED',
          rawInput: text,
          details: {
            ticketNumber: userTicket.ticketNumber,
            userName: userTicket.userName,
            intent: 'cancel',
            reasoning: `User cancelled ticket ${userTicket.ticketNumber}. Automatically triggering No-Show Consent Upgrade loop.`,
          },
        });

        // Trigger Consent Upgrade loop for next eligible user
        const upgradeOffer = triggerNoShowUpgrade(tenantId, userTicket);

        broadcastSSE('ticket_cancelled', { ticket: userTicket, upgradeOffer });

        return res.json({
          status: 'cancelled',
          reply_message: triageResult.reply_message || `Ticket ${userTicket.ticketNumber} has been cancelled. Thank you!`,
          ticket: userTicket,
          upgradeOffer,
          triage: triageResult,
        });
      }

      return res.json({
        status: 'no_active_ticket',
        reply_message: 'No active waiting ticket was found for this profile to cancel.',
        triage: triageResult,
      });
    }

    // 3. User is joining queue
    // Create or retrieve user
    let user = Array.from(db.users.values()).find((u) => u.phoneNumber === clientPhone);
    if (!user) {
      const userId = `usr_${Date.now()}`;
      user = { id: userId, name: clientName, phoneNumber: clientPhone };
      db.users.set(userId, user);
    } else {
      user.name = clientName;
    }

    // Calculate current queue length & wait time math
    const waitingForBusiness = Array.from(db.queueEntries.values()).filter(
      (e) => e.businessId === tenantId && e.status === 'waiting'
    );
    const queueTypeObj = config.queueTypes.find((q) => q.id === triageResult.queue_type) || config.queueTypes[0];
    const avgService = queueTypeObj.avgServiceMinutes || config.baseServiceMinutes;

    const { factor } = calculateMLTimeOfDayFactor(config);
    const { waitMinutes, breakdown } = calculateEstimatedWaitTime(
      waitingForBusiness.length,
      avgService,
      factor,
      triageResult.priority_score
    );

    const ticketSeq = 100 + db.queueEntries.size + 1;
    const prefix = tenantId === 'apex_clinic' ? 'CL' : tenantId === 'metro_bank' ? 'BK' : tenantId === 'civic_hub' ? 'CV' : 'TB';
    const ticketNumber = `${prefix}-${ticketSeq}`;

    const newEntry: QueueEntry = {
      id: `q_${Date.now()}`,
      ticketNumber,
      userId: user.id,
      userName: user.name,
      userPhone: user.phoneNumber,
      businessId: tenantId,
      queueType: triageResult.queue_type,
      status: 'waiting',
      priorityScore: triageResult.priority_score,
      estimatedWaitMinutes: waitMinutes,
      initialEstimatedWaitMinutes: waitMinutes,
      aiReasoning: triageResult.reason,
      intakeText: text,
      language: triageResult.language,
      intent: 'join_queue',
      confidence: triageResult.confidence,
      mlTimeFactor: factor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.queueEntries.set(newEntry.id, newEntry);

    // Audit log
    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: newEntry.createdAt,
      businessId: tenantId,
      eventType: 'TRIAGE_EVALUATION',
      rawInput: text,
      details: {
        ticketNumber,
        userName: user.name,
        intent: 'join_queue',
        priorityScore: triageResult.priority_score,
        queueType: triageResult.queue_type,
        reasoning: triageResult.reason,
        language: triageResult.language,
        mlFactor: factor,
        waitMinutesCalculated: waitMinutes,
      },
    });

    broadcastSSE('ticket_created', { ticket: newEntry, breakdown });

    res.json({
      status: 'success',
      reply_message: triageResult.reply_message,
      ticket: newEntry,
      triage: triageResult,
      wait_breakdown: breakdown,
    });
  } catch (error: any) {
    console.error('Error in /api/intake:', error);
    res.status(500).json({ error: error.message || 'Internal server error during intake' });
  }
});

// Helper: Trigger No-Show Consent Upgrade
function triggerNoShowUpgrade(businessId: TenantId, droppedTicket?: QueueEntry): ConsentUpgrade | null {
  // Query queue_entries for the highest priority_score where status = 'waiting' and not already offered
  const activeOffers = Array.from(db.consentUpgrades.values()).filter(
    (u) => u.businessId === businessId && u.status === 'offered'
  );
  const activeOfferedIds = new Set(activeOffers.map((o) => o.queueEntryId));

  const eligibleCandidates = Array.from(db.queueEntries.values())
    .filter((e) => e.businessId === businessId && e.status === 'waiting' && !activeOfferedIds.has(e.id))
    .sort((a, b) => {
      // Priority score descending, then arrival time ascending
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  if (eligibleCandidates.length === 0) {
    return null;
  }

  const candidate = eligibleCandidates[0];
  const oldWait = candidate.estimatedWaitMinutes;
  const newWait = Math.max(2, Math.round(oldWait * 0.35)); // dramatically shortened wait
  const positionsGained = Math.max(1, Math.min(5, Math.floor(oldWait / 4)));

  const upgradeId = `upg_${Date.now()}`;
  const now = Date.now();
  const expiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes consent window

  const consentUpgrade: ConsentUpgrade = {
    id: upgradeId,
    queueEntryId: candidate.id,
    ticketNumber: candidate.ticketNumber,
    userName: candidate.userName,
    businessId,
    previousWaitMinutes: oldWait,
    newEstimatedWaitMinutes: newWait,
    positionsGained,
    status: 'offered',
    offeredAt: new Date(now).toISOString(),
    expiresAt,
    reasonForVacancy: droppedTicket
      ? `Slot opened after ticket ${droppedTicket.ticketNumber} cancelled/no-show.`
      : 'Counter service accelerated; expedited vacant slot available.',
  };

  db.consentUpgrades.set(upgradeId, consentUpgrade);

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    businessId,
    eventType: 'CONSENT_OFFERED',
    details: {
      ticketNumber: candidate.ticketNumber,
      userName: candidate.userName,
      reasoning: `Offered 5-minute consent upgrade to ${candidate.userName} (${candidate.ticketNumber}). Wait drops from ${oldWait}m to ${newWait}m.`,
      consentId: upgradeId,
    },
  });

  return consentUpgrade;
}

// POST /api/queue/trigger-upgrade
app.post('/api/queue/trigger-upgrade', (req, res) => {
  const businessId = (req.body.business_id as TenantId) || 'metro_bank';
  const upgrade = triggerNoShowUpgrade(businessId);

  if (!upgrade) {
    return res.status(200).json({ status: 'no_eligible_candidate', message: 'No waiting candidates available for upgrade.' });
  }

  broadcastSSE('upgrade_offered', { upgrade });
  res.json({ status: 'offered', upgrade });
});

// POST /api/queue/consent-response - Accept or Decline Consent Upgrade
app.post('/api/queue/consent-response', (req, res) => {
  const { upgrade_id, response } = req.body; // response: 'accept' | 'decline'

  const upgrade = db.consentUpgrades.get(upgrade_id);
  if (!upgrade) {
    return res.status(404).json({ error: 'Upgrade offer not found' });
  }

  const ticket = db.queueEntries.get(upgrade.queueEntryId);

  if (response === 'accept') {
    upgrade.status = 'accepted';
    if (ticket) {
      ticket.bumpedUp = true;
      ticket.estimatedWaitMinutes = upgrade.newEstimatedWaitMinutes;
      ticket.priorityScore = Math.min(5, ticket.priorityScore + 1);
      ticket.updatedAt = new Date().toISOString();
    }

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      businessId: upgrade.businessId,
      eventType: 'CONSENT_ACCEPTED',
      details: {
        ticketNumber: upgrade.ticketNumber,
        userName: upgrade.userName,
        reasoning: `User accepted consent upgrade! Bumped up ${upgrade.positionsGained} positions. New wait: ${upgrade.newEstimatedWaitMinutes} min.`,
        consentId: upgrade.id,
      },
    });

    broadcastSSE('upgrade_accepted', { upgrade, ticket });
    return res.json({ status: 'accepted', upgrade, ticket });
  } else {
    upgrade.status = 'declined';

    db.auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      businessId: upgrade.businessId,
      eventType: 'MANUAL_OVERRIDE',
      details: {
        ticketNumber: upgrade.ticketNumber,
        userName: upgrade.userName,
        reasoning: `User declined consent upgrade. Retaining original queue slot. Cascading vacancy to next user.`,
        consentId: upgrade.id,
      },
    });

    // Auto-cascade to next eligible user
    const nextUpgrade = triggerNoShowUpgrade(upgrade.businessId);

    broadcastSSE('upgrade_declined', { upgrade, nextUpgrade });
    return res.json({ status: 'declined', upgrade, nextUpgrade });
  }
});

// POST /api/queue/advance - Complete ticket & recalculate waiting wait times
app.post('/api/queue/advance', (req, res) => {
  const { queue_entry_id } = req.body;
  const ticket = db.queueEntries.get(queue_entry_id);

  if (!ticket) {
    return res.status(404).json({ error: 'Queue entry not found' });
  }

  const prevStatus = ticket.status;
  if (prevStatus === 'in_progress') {
    ticket.status = 'completed';
  } else {
    ticket.status = 'completed';
  }
  ticket.updatedAt = new Date().toISOString();

  const businessId = ticket.businessId;
  const config = db.configs[businessId];
  const queueTypeObj = config.queueTypes.find((q) => q.id === ticket.queueType) || config.queueTypes[0];
  const serviceMinutesDeduction = queueTypeObj.avgServiceMinutes || config.baseServiceMinutes;

  // Recalculate estimated_wait_minutes for all remaining waiting entries for that business_id
  const waitingEntries = Array.from(db.queueEntries.values()).filter(
    (e) => e.businessId === businessId && e.status === 'waiting'
  );

  for (const w of waitingEntries) {
    const updatedWait = Math.max(2, w.estimatedWaitMinutes - Math.round(serviceMinutesDeduction * 0.7));
    w.estimatedWaitMinutes = updatedWait;
    w.updatedAt = new Date().toISOString();
  }

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    businessId,
    eventType: 'QUEUE_ADVANCED',
    details: {
      ticketNumber: ticket.ticketNumber,
      userName: ticket.userName,
      reasoning: `Ticket ${ticket.ticketNumber} marked completed. Recalculated wait times for ${waitingEntries.length} remaining tickets.`,
    },
  });

  broadcastSSE('queue_advanced', { completedTicket: ticket, remainingWaiting: waitingEntries });

  res.json({
    status: 'success',
    completedTicket: ticket,
    waitingCount: waitingEntries.length,
  });
});

// POST /api/queue/cancel - Explicit cancellation endpoint
app.post('/api/queue/cancel', (req, res) => {
  const { queue_entry_id } = req.body;
  const ticket = db.queueEntries.get(queue_entry_id);

  if (!ticket) {
    return res.status(404).json({ error: 'Queue entry not found' });
  }

  ticket.status = 'cancelled';
  ticket.updatedAt = new Date().toISOString();

  db.auditLogs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    businessId: ticket.businessId,
    eventType: 'NO_SHOW_DETECTED',
    details: {
      ticketNumber: ticket.ticketNumber,
      userName: ticket.userName,
      reasoning: `Staff or user cancelled ticket ${ticket.ticketNumber}. Triggering automated recovery consent loop.`,
    },
  });

  // Automatically trigger consent upgrade for next waiting user
  const upgradeOffer = triggerNoShowUpgrade(ticket.businessId, ticket);

  broadcastSSE('ticket_cancelled', { ticket, upgradeOffer });

  res.json({ status: 'cancelled', ticket, upgradeOffer });
});

// POST /api/demo/reset
app.post('/api/demo/reset', (req, res) => {
  seedInitialData();
  broadcastSSE('demo_reset', { message: 'Database reset to default state' });
  res.json({ status: 'ok', message: 'Demo data reseeded' });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QueueFlow server running on http://localhost:${PORT}`);
  });
}

startServer();
