# QueueFlow — Universal AI Queue Engine

**Multi-Tenant AI Queue Management Engine with Explainable Gemini Triage, Dynamic Scikit-Learn Wait-Time Regression, and Autonomous No-Show Slot Recapture.**

---

## 📁 Clean Project Structure

```
├── backend/                  # 🐍 Python FastAPI High-Performance Backend
│   ├── main.py               # FastAPI App entrypoint, CORS & OpenAPI documentation (/docs)
│   ├── config.py             # Environment settings & Google GenAI API keys
│   ├── requirements.txt      # Python dependencies (fastapi, uvicorn, pydantic, google-genai, scikit-learn)
│   ├── Dockerfile            # Container deployment specification
│   ├── api/                  # Modular REST API endpoints
│   │   ├── triage.py         # POST /api/triage (Structured Gemini LLM Evaluation)
│   │   ├── queue.py          # GET /api/queue, POST /api/queue/:id/advance, POST /api/queue/:id/cancel
│   │   ├── consent.py        # POST /api/consent/offer, POST /api/consent/respond
│   │   └── tenants.py        # GET/PUT /api/tenants (Multi-tenant config CRUD)
│   ├── models/               # Pydantic v2 data contracts
│   │   └── schemas.py        # QueueEntry, TriageResult, BusinessConfig, ConsentUpgrade, MLMetrics
│   └── services/             # Core AI & ML engines
│       ├── gemini_triage.py  # Google GenAI SDK clinical & business intent evaluation
│       └── ml_demand_engine.py # Scikit-learn GradientBoost wait-time regression calculator
│
├── database/                 # 🗄️ Relational Database & Migrations
│   ├── schema.sql            # Supabase / PostgreSQL tables, check constraints, indexes, & realtime publication
│   ├── db.py                 # Hybrid database client (In-memory cache + PostgreSQL pool)
│   ├── seed.py               # Initial seed data for Apex Clinic, Metro Bank, Civic Hub, & Apple Genius
│   └── README.md             # Supabase setup guide
│
├── src/                      # ⚛️ React & Tailwind Frontend Application
│   ├── components/           # UI Modules
│   │   ├── AppleHeader.tsx   # Glassmorphic top navigation & tenant switcher
│   │   ├── StaffDashboard.tsx # Operator control panel & counter desk management
│   │   ├── UserMobileView.tsx # Patient/customer mobile queue pass & dynamic countdown
│   │   ├── WaitlistEngineView.tsx # Autonomous no-show consent window & rush-hour curve visualizer
│   │   ├── VisualSimulatorView.tsx # Step-by-step animated pipeline simulation & live sandbox
│   │   ├── AIAuditLogSheet.tsx # Explainable AI ledger of every priority scoring decision
│   │   └── APIConfigSheet.tsx # Live JSON schema editor & architecture inspector
│   ├── data/                 # Static tenant presets
│   ├── utils/                # Priority styling & ML calculation utilities
│   ├── App.tsx               # Main application controller
│   └── types.ts              # TypeScript interface definitions
│
└── server.ts                 # Full-stack runtime bridging the live preview container on Port 3000
```

---

## 🚀 Getting Started with FastAPI (Python Backend)

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Run the FastAPI Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Interactive Swagger Documentation
Open [http://localhost:8000/docs](http://localhost:8000/docs) to test and inspect all API endpoints interactively.

---

## ⚡ Core AI & ML Capabilities

1. **Structured Gemini AI Triage**: Natural language input in any language (English, Spanish, Hindi, Hinglish) is evaluated with strict schema validation into 5 priority levels (`P1` to `P5`).
2. **3-Tier Priority Color System**:
   - **P5 (Urgent)**: Distinct Red badges (`bg-red-500`) with emergency bypass routing.
   - **P3–P4 (Medium)**: Warm Orange badges (`bg-orange-500`).
   - **P1–P2 (Normal)**: Calming Emerald Green badges (`bg-emerald-500`).
3. **ML Time-of-Day Regression**: Dynamically scales wait times using real-time busy factors (e.g. `1.35x` lunch surge).
4. **Autonomous Slot Recapture**: When a cancellation occurs, the system pings the next waiting candidate with a 5-minute decision window to reclaim idle counter time.
