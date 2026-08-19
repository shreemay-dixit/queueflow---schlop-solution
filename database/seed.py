from backend.models.schemas import BusinessConfig, BusinessQueueTypeConfig, QueueEntry
from database.db import db

DEFAULT_TENANTS = {
    "apex_clinic": BusinessConfig(
        id="apex_clinic",
        name="Apex Urgent Care & Multi-Specialty Clinic",
        tagline="Autonomous AI Clinical Triage & Rapid Emergency Pathway",
        icon="🏥",
        primaryColor="#DC2626",
        baseServiceMinutes=12,
        emergencyThreshold=5,
        systemTriageInstructions="You are a clinical intake assistant. Strict emergency protocols: Chest pain, severe breathlessness, neurological deficits, severe hemorrhages are Priority 5 (Emergency Bay). Mild flu, prescriptions, and routine checkups are Priority 2 (Consultation).",
        queueTypes=[
            BusinessQueueTypeConfig(id="emergency", name="Emergency Resuscitation", avgServiceMinutes=18, color="#DC2626", description="Critical clinical intervention", defaultPriority=5),
            BusinessQueueTypeConfig(id="general_consult", name="General Physician", avgServiceMinutes=12, color="#2563EB", description="Routine clinical consultation", defaultPriority=2),
            BusinessQueueTypeConfig(id="pediatrics", name="Pediatric Care", avgServiceMinutes=15, color="#D97706", description="Infant & child health", defaultPriority=3),
            BusinessQueueTypeConfig(id="lab_diagnostics", name="Diagnostics & Bloodwork", avgServiceMinutes=8, color="#7C3AED", description="Pathology testing", defaultPriority=2),
        ],
        timeOfDayMultipliers={8: 1.0, 9: 1.2, 10: 1.4, 11: 1.5, 12: 1.4, 13: 1.2, 14: 1.1, 15: 1.3, 16: 1.4, 17: 1.5, 18: 1.3, 19: 1.1, 20: 1.0}
    ),
    "metro_bank": BusinessConfig(
        id="metro_bank",
        name="Metro International Bank & Wealth",
        tagline="Adaptive Customer Priority & Commercial Routing",
        icon="🏦",
        primaryColor="#2563EB",
        baseServiceMinutes=8,
        emergencyThreshold=5,
        systemTriageInstructions="Evaluate banking transactions. Stolen cards, unauthorized debits, and severe security issues are Priority 5. High-net-worth commercial accounts are Priority 4. Routine deposits and cash queries are Priority 2.",
        queueTypes=[
            BusinessQueueTypeConfig(id="teller", name="General Teller & Cash", avgServiceMinutes=6, color="#2563EB", description="Cash, withdrawals, deposits", defaultPriority=2),
            BusinessQueueTypeConfig(id="wealth", name="Wealth & Commercial", avgServiceMinutes=20, color="#D97706", description="Investments, corporate loans", defaultPriority=4),
            BusinessQueueTypeConfig(id="forex", name="Forex & Travel Cards", avgServiceMinutes=10, color="#059669", description="International currencies", defaultPriority=3),
            BusinessQueueTypeConfig(id="disputes", name="Fraud & Card Security", avgServiceMinutes=14, color="#DC2626", description="Immediate dispute resolution", defaultPriority=5),
        ],
        timeOfDayMultipliers={8: 0.9, 9: 1.1, 10: 1.3, 11: 1.4, 12: 1.5, 13: 1.5, 14: 1.3, 15: 1.2, 16: 1.3, 17: 1.2, 18: 1.0, 19: 0.8, 20: 0.8}
    ),
    "civic_hub": BusinessConfig(
        id="civic_hub",
        name="Civic Services & Citizen Registry",
        tagline="Multilingual Natural Voice & Document Services",
        icon="🏛️",
        primaryColor="#059669",
        baseServiceMinutes=14,
        emergencyThreshold=5,
        systemTriageInstructions="Citizens require municipal services. Elderly, disabled, and urgent document needs receive Priority 4-5. Standard vehicle and passport renewals receive Priority 2-3.",
        queueTypes=[
            BusinessQueueTypeConfig(id="licensing", name="Driver Licenses & Real ID", avgServiceMinutes=15, color="#059669", description="Driving permits and duplicates", defaultPriority=3),
            BusinessQueueTypeConfig(id="passports", name="Passport Renewal", avgServiceMinutes=18, color="#2563EB", description="International travel docs", defaultPriority=3),
            BusinessQueueTypeConfig(id="permits", name="Housing & Construction", avgServiceMinutes=25, color="#D97706", description="Property zoning & permits", defaultPriority=2),
            BusinessQueueTypeConfig(id="voter", name="Citizen Registry", avgServiceMinutes=10, color="#7C3AED", description="Voter ID and certificates", defaultPriority=2),
        ],
        timeOfDayMultipliers={8: 0.9, 9: 1.2, 10: 1.4, 11: 1.4, 12: 1.3, 13: 1.1, 14: 1.3, 15: 1.4, 16: 1.3, 17: 1.1, 18: 0.9, 19: 0.8, 20: 0.8}
    ),
    "apple_genius": BusinessConfig(
        id="apple_genius",
        name="Genius Bar & Technical Support",
        tagline="Hardware Diagnostic & Pro Workflow Triage",
        icon="💻",
        primaryColor="#18181B",
        baseServiceMinutes=15,
        emergencyThreshold=5,
        systemTriageInstructions="Urgent enterprise device failures, battery swelling or liquid spills are Priority 5. Screen repairs and diagnostics are Priority 3. Trade-ins and general inquiries are Priority 2.",
        queueTypes=[
            BusinessQueueTypeConfig(id="mac", name="Mac & Pro Workstation", avgServiceMinutes=20, color="#18181B", description="MacBook, Mac Studio diagnostics", defaultPriority=3),
            BusinessQueueTypeConfig(id="iphone", name="iPhone & Screen Repair", avgServiceMinutes=15, color="#2563EB", description="Display, battery replacements", defaultPriority=3),
            BusinessQueueTypeConfig(id="wearables", name="Apple Watch & Vision", avgServiceMinutes=12, color="#059669", description="Sensors and diagnostics", defaultPriority=2),
            BusinessQueueTypeConfig(id="trade_in", name="Setup & Trade-In", avgServiceMinutes=10, color="#D97706", description="Data transfer and recycling", defaultPriority=2),
        ],
        timeOfDayMultipliers={8: 0.8, 9: 0.9, 10: 1.1, 11: 1.3, 12: 1.4, 13: 1.4, 14: 1.3, 15: 1.4, 16: 1.5, 17: 1.6, 18: 1.5, 19: 1.3, 20: 1.1}
    )
}

def seed_database():
    for tenant_id, cfg in DEFAULT_TENANTS.items():
        db.configs[tenant_id] = cfg
        
    # Seed sample queue tickets
    db.add_queue_entry(QueueEntry(
        id="t1",
        ticketNumber="B-101",
        userId="u1",
        userName="Marcus Sterling",
        userPhone="+1 (555) 234-5678",
        businessId="metro_bank",
        queueType="teller",
        status="in_progress",
        priorityScore=3,
        estimatedWaitMinutes=0,
        initialEstimatedWaitMinutes=8,
        aiReasoning="Routine high-value cash deposit and foreign currency withdrawal.",
        intakeText="Depositing international wire receipt.",
        language="English",
        intent="join_queue",
        confidence=0.98,
        mlTimeFactor=1.2,
        createdAt="2026-08-19T06:45:00.000Z",
        updatedAt="2026-08-19T06:50:00.000Z"
    ))
    
    db.add_queue_entry(QueueEntry(
        id="t2",
        ticketNumber="B-102",
        userId="u2",
        userName="Elena Rostova",
        userPhone="+1 (555) 345-6789",
        businessId="metro_bank",
        queueType="wealth",
        status="waiting",
        priorityScore=4,
        estimatedWaitMinutes=6,
        initialEstimatedWaitMinutes=14,
        aiReasoning="Commercial LLC account setup with international multi-signatory structure.",
        intakeText="Opening corporate account for technology enterprise.",
        language="English",
        intent="join_queue",
        confidence=0.95,
        mlTimeFactor=1.2,
        createdAt="2026-08-19T06:48:00.000Z",
        updatedAt="2026-08-19T06:48:00.000Z"
    ))
    
    db.add_queue_entry(QueueEntry(
        id="t3",
        ticketNumber="B-103",
        userId="u3",
        userName="Aisha Patel",
        userPhone="+1 (555) 456-7890",
        businessId="metro_bank",
        queueType="disputes",
        status="waiting",
        priorityScore=5,
        estimatedWaitMinutes=2,
        initialEstimatedWaitMinutes=12,
        aiReasoning="Critical security issue: unauthorized international card transactions flagged.",
        intakeText="Emergency: Someone charged $4,000 in Tokyo while my card is here with me.",
        language="English",
        intent="join_queue",
        confidence=0.99,
        mlTimeFactor=1.2,
        createdAt="2026-08-19T06:52:00.000Z",
        updatedAt="2026-08-19T06:52:00.000Z"
    ))

seed_database()
