import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Check,
  Send,
  Code2,
  Terminal,
  Activity,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Smartphone,
  Server,
  Sliders,
  TrendingUp,
  ChevronRight,
  Info,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { BusinessConfig, QueueEntry, TenantId } from '../types';
import { getPriorityInfo, formatEstimatedCallTime } from '../utils/priority';

interface VisualSimulatorViewProps {
  businessConfig: BusinessConfig;
  entries: QueueEntry[];
  onTriggerRealTriage?: (name: string, phone: string, text: string) => Promise<any>;
}

interface SimulationStep {
  id: string;
  title: string;
  nodeName: string;
  category: 'client' | 'gateway' | 'ai' | 'ml' | 'queue' | 'broadcast';
  description: string;
  details: string;
  payload: Record<string, any>;
  highlightMetric: { label: string; value: string; color: string };
}

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  businessId: TenantId;
  badge: string;
  inputText: string;
  customerName: string;
  customerPhone: string;
  priorityResult: number;
  steps: SimulationStep[];
}

export const VisualSimulatorView: React.FC<VisualSimulatorViewProps> = ({
  businessConfig,
  entries,
  onTriggerRealTriage,
}) => {
  const [activeTab, setActiveTab] = useState<'guided' | 'sandbox'>('guided');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('emergency_triage');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Sandbox Live State
  const [sandboxInput, setSandboxInput] = useState<string>('My toddler has a severe rash and 103F fever since this morning.');
  const [sandboxName, setSandboxName] = useState<string>('Elena Rostova');
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [sandboxStep, setSandboxStep] = useState<number>(0);

  const scenarios: Scenario[] = [
    {
      id: 'emergency_triage',
      title: '🚨 Acute Medical Urgency Triage',
      subtitle: 'Patient reports cardiac/respiratory distress -> AI escalates to P5 Urgent and jumps standard line safely.',
      businessId: 'apex_clinic',
      badge: 'Urgent P5',
      inputText: 'Severe crushing chest pain radiating to left arm with dizziness for 20 minutes.',
      customerName: 'Marcus Vance',
      customerPhone: '+1 (555) 942-0192',
      priorityResult: 5,
      steps: [
        {
          id: 'step_1',
          title: '1. Multilingual Intake Received',
          nodeName: 'User Device / Kiosk',
          category: 'client',
          description: 'Patient enters symptoms via mobile app or speaks to kiosk.',
          details: 'Natural language text is captured, normalized, and timestamped.',
          payload: {
            source: 'mobile_web_app',
            patient: 'Marcus Vance',
            phone: '+1 (555) 942-0192',
            raw_text: 'Severe crushing chest pain radiating to left arm with dizziness for 20 minutes.',
            timestamp: new Date().toISOString(),
          },
          highlightMetric: { label: 'Input Ingested', value: '74 characters', color: 'text-blue-500' },
        },
        {
          id: 'step_2',
          title: '2. Secure FastAPI Gateway & Tenant Routing',
          nodeName: 'FastAPI Gateway',
          category: 'gateway',
          description: 'Request authenticated, headers verified, routed to Apex Clinic tenant configuration.',
          details: 'Loads clinical triage prompt, emergency keywords, and baseline department configs.',
          payload: {
            endpoint: 'POST /api/triage',
            tenantId: 'apex_clinic',
            auth: 'Bearer ai_studio_session_token',
            routing_queue: 'general_intake',
            base_service_minutes: 12,
          },
          highlightMetric: { label: 'Route Match', value: 'apex_clinic (Medical)', color: 'text-indigo-500' },
        },
        {
          id: 'step_3',
          title: '3. Gemini AI Structured Clinical Triage',
          nodeName: 'Gemini LLM Engine',
          category: 'ai',
          description: 'Gemini evaluates symptoms using strict JSON schema for priority, queue department, and reasoning.',
          details: 'Identifies cardiac red flags. Assigns P5 (Urgent) and department "emergency".',
          payload: {
            model: 'gemini-3.7-flash',
            intent: 'join_queue',
            priority_score: 5,
            queue_type: 'emergency',
            reason: 'Acute cardiac/respiratory red flags (chest tightness radiating to arm). High clinical risk.',
            confidence: 0.99,
            urgency_factors: ['cardiac_radiation', 'acute_onset', 'dizziness'],
          },
          highlightMetric: { label: 'Priority Assigned', value: 'P5 Urgent (Red)', color: 'text-red-500' },
        },
        {
          id: 'step_4',
          title: '4. Dynamic Wait-Time & ML Multiplier',
          nodeName: 'ML Regression Engine',
          category: 'ml',
          description: 'Calculates dynamic wait time factoring in queue depth and time-of-day demand multiplier.',
          details: 'P5 Urgent priority bypasses standard wait. Estimated wait reduced from 45 mins to 2 mins.',
          payload: {
            base_service_time: 12,
            people_ahead_standard: 5,
            standard_wait_minutes: 45,
            ml_peak_multiplier: 1.25,
            emergency_override: true,
            final_estimated_wait_minutes: 2,
          },
          highlightMetric: { label: 'Estimated Wait', value: '2 mins (Immediate)', color: 'text-emerald-500' },
        },
        {
          id: 'step_5',
          title: '5. Queue Reordering & Live Broadcast',
          nodeName: 'Live State & SSE Engine',
          category: 'queue',
          description: 'Ticket #A-901 inserted at Top of Queue (Position #1). Broadcasted via SSE to all staff and patients.',
          details: 'Doctor console flashes urgent red alert; patient mobile updates with immediate bay assignment.',
          payload: {
            event: 'QUEUE_UPDATED',
            ticketNumber: 'A-901',
            queuePosition: 1,
            status: 'waiting_urgent',
            estimatedCallTime: formatEstimatedCallTime(2),
            sse_clients_notified: 8,
          },
          highlightMetric: { label: 'Queue Rank', value: '#1 (Top of Line)', color: 'text-red-600' },
        },
      ],
    },
    {
      id: 'no_show_recapture',
      title: '⚡ Autonomous No-Show Slot Recapture',
      subtitle: 'Customer in position #1 drops out -> Engine offers vacant slot to next eligible person with 5-minute consent window.',
      businessId: 'metro_bank',
      badge: 'Recovery Loop',
      inputText: 'Simulating dropout at Counter Desk #1 -> Trigger automatic fast-pass candidate search.',
      customerName: 'Aisha Patel',
      customerPhone: '+1 (555) 381-9920',
      priorityResult: 3,
      steps: [
        {
          id: 'step_1',
          title: '1. Dropout / Cancellation Detected',
          nodeName: 'Counter Monitor',
          category: 'client',
          description: 'Ticket #B-101 cancels appointment. Desk #1 becomes vacant with risk of idle staff dead time.',
          details: 'Engine instantly intercepts the cancellation event before queue stalls.',
          payload: {
            event: 'TICKET_CANCELLED',
            vacatedTicket: 'B-101',
            vacatedDesk: 'Desk #1 (Wealth & Teller)',
            deadTimePrevented: '18 minutes',
          },
          highlightMetric: { label: 'Slot Vacated', value: 'Desk #1 Available', color: 'text-amber-500' },
        },
        {
          id: 'step_2',
          title: '2. Next Candidate Algorithmic Selection',
          nodeName: 'Waitlist Optimization Engine',
          category: 'gateway',
          description: 'Engine scans waiting queue for highest-scoring candidate closest to service desk ready for advance.',
          details: 'Selects Aisha Patel (Ticket #B-104), currently at Position #3 with 28 minutes remaining wait.',
          payload: {
            candidateFound: true,
            candidateTicket: 'B-104',
            candidateName: 'Aisha Patel',
            currentRank: 3,
            currentWaitMinutes: 28,
            potentialNewWaitMinutes: 3,
          },
          highlightMetric: { label: 'Candidate Found', value: 'Aisha (#B-104)', color: 'text-blue-500' },
        },
        {
          id: 'step_3',
          title: '3. 5-Minute Consent Window Dispatch',
          nodeName: 'Notification Dispatcher',
          category: 'broadcast',
          description: 'Push notification and action sheet delivered to Aisha with live 300s countdown timer.',
          details: 'Protects customer agency: they can accept to move up or decline to keep their scheduled pace.',
          payload: {
            consentId: 'upgrade_84920',
            offerType: 'FAST_PASS_PROMOTION',
            positionsGained: 2,
            previousWait: 28,
            newEstimatedWait: 3,
            countdownSeconds: 300,
            status: 'offered',
          },
          highlightMetric: { label: 'Consent Timer', value: '5:00 Window Active', color: 'text-amber-500' },
        },
        {
          id: 'step_4',
          title: '4. User Confirms & Accepts Fast-Pass',
          nodeName: 'Consent State Manager',
          category: 'client',
          description: 'Aisha clicks "Accept & Move Up in Line". Offer updates to accepted state.',
          details: 'Immediate slot lock prevents race conditions or double-booking.',
          payload: {
            consentId: 'upgrade_84920',
            action: 'accept',
            responseTimeSeconds: 14,
            status: 'accepted',
          },
          highlightMetric: { label: 'Upgrade Status', value: 'Accepted ⚡', color: 'text-emerald-500' },
        },
        {
          id: 'step_5',
          title: '5. Queue Reordering & Time Collapsing',
          nodeName: 'Live State & SSE Engine',
          category: 'queue',
          description: 'Ticket #B-104 bumped to position #1. Wait time collapses by 25 minutes. All other tickets update smoothly.',
          details: 'Zero staff idle time. Customer delight optimized.',
          payload: {
            bumpedTicket: 'B-104',
            newPosition: 1,
            timeSavedMinutes: 25,
            newWaitMinutes: 3,
            serviceCapacityRecovered: '94.2%',
          },
          highlightMetric: { label: 'Minutes Saved', value: '25 mins saved!', color: 'text-emerald-600' },
        },
      ],
    },
    {
      id: 'multilingual_intake',
      title: '🌐 Multilingual NLP & Smart Routing',
      subtitle: 'Natural non-English or Hinglish conversational input parsed, translated, and categorized seamlessly.',
      businessId: 'civic_hub',
      badge: 'Multilingual AI',
      inputText: 'Mera driver license expire ho gaya hai aur mujhe duplicate copy urgently chahiye.',
      customerName: 'Deepak Sharma',
      customerPhone: '+1 (555) 789-2210',
      priorityResult: 3,
      steps: [
        {
          id: 'step_1',
          title: '1. Mixed-Language Input Captured',
          nodeName: 'Multilingual Ingestion',
          category: 'client',
          description: 'Customer speaks or types in conversational Hinglish (Hindi + English mix).',
          details: 'System captures phonetic and colloquial terms without requiring predefined rigid forms.',
          payload: {
            raw_input: 'Mera driver license expire ho gaya hai aur mujhe duplicate copy urgently chahiye.',
            user: 'Deepak Sharma',
            language_hint: 'auto',
          },
          highlightMetric: { label: 'Language', value: 'Hinglish Detected', color: 'text-purple-500' },
        },
        {
          id: 'step_2',
          title: '2. Gemini Zero-Shot Semantic Translation',
          nodeName: 'Gemini LLM Engine',
          category: 'ai',
          description: 'Gemini translates and understands intent: "Driving License Renewal / Replacement".',
          details: 'Extracts key parameters: License service, duplicate request, standard administrative priority.',
          payload: {
            model: 'gemini-3.7-flash',
            translated_intent: 'Driver license renewal & duplicate document request',
            detected_language: 'Hindi / Hinglish',
            intent: 'join_queue',
            priority_score: 3,
            queue_type: 'licensing',
            reply_localized: 'Aapka license renewal request darj kar liya gaya hai.',
          },
          highlightMetric: { label: 'Intent Classified', value: 'Licensing Renewal', color: 'text-blue-500' },
        },
        {
          id: 'step_3',
          title: '3. Department Specific Routing',
          nodeName: 'Civic Hub Router',
          category: 'gateway',
          description: 'Routed directly to the Licensing & Permits window (Counter Bay #3).',
          details: 'Avoids misdirected lines or wrong counter transfers.',
          payload: {
            department: 'Licensing & IDs',
            target_desk: 'Desk #3',
            required_documents: ['ID Proof', 'Previous License No'],
            average_service_time: 15,
          },
          highlightMetric: { label: 'Assigned Counter', value: 'Desk #3 (Licensing)', color: 'text-indigo-500' },
        },
        {
          id: 'step_4',
          title: '4. Dynamic Time Multiplier (Peak Surge)',
          nodeName: 'ML Regression Engine',
          category: 'ml',
          description: 'Applies time-of-day demand multiplier for afternoon civic office rush (1.35x).',
          details: 'Formula: (2 people ahead * 15m base) * 1.35 surge multiplier = 20 mins wait.',
          payload: {
            baseServiceTime: 15,
            peopleAhead: 2,
            timeOfDayFactor: 1.35,
            calculatedWaitMinutes: 20,
            estimatedCallTime: formatEstimatedCallTime(20),
          },
          highlightMetric: { label: 'Calculated Wait', value: '20 mins (Est)', color: 'text-amber-500' },
        },
        {
          id: 'step_5',
          title: '5. Localized Ticket & SMS Confirmation',
          nodeName: 'Live State & SSE Engine',
          category: 'broadcast',
          description: 'Ticket #C-215 generated and pushed to customer mobile with bilingual live status updates.',
          details: 'Real-time countdown starts, giving customer freedom to wait anywhere comfortably.',
          payload: {
            ticketNumber: 'C-215',
            position: 3,
            waitMinutes: 20,
            smsSent: true,
            status: 'waiting',
          },
          highlightMetric: { label: 'Ticket Issued', value: '#C-215 Ready', color: 'text-emerald-500' },
        },
      ],
    },
  ];

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];
  const activeStep = activeScenario.steps[currentStepIndex] || activeScenario.steps[0];

  // Auto-play simulation timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const stepDuration = 2800 / playbackSpeed;
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= activeScenario.steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, stepDuration);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, activeScenario]);

  const handleScenarioChange = (id: string) => {
    setSelectedScenarioId(id);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  // Run Real Sandbox Triage through actual /api/triage
  const handleRunSandbox = async () => {
    if (!sandboxInput.trim()) return;
    setSandboxLoading(true);
    setSandboxStep(1);

    try {
      // Step 1: Client to Gateway animation
      await new Promise((r) => setTimeout(r, 600));
      setSandboxStep(2);

      // Step 2: Call actual server endpoint
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: businessConfig.id,
          text: sandboxInput,
          name: sandboxName,
          phone: '+1 (555) 019-2831',
        }),
      });

      setSandboxStep(3);
      await new Promise((r) => setTimeout(r, 600));
      setSandboxStep(4);

      const data = await response.json();
      setSandboxResult(data);

      await new Promise((r) => setTimeout(r, 400));
      setSandboxStep(5);
    } catch (err) {
      console.error(err);
    } finally {
      setSandboxLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Header Banner */}
      <div className="relative rounded-[2.5rem] p-6 sm:p-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-blue-950 text-white shadow-xl overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              <Activity className="w-3.5 h-3.5" />
              Dynamic Visual Architecture Simulator
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Behind the Scenes: The AI Queue Engine
            </h1>
            <p className="text-zinc-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Step through and visualize exactly what happens under the hood when a customer request arrives, how Gemini scores urgency, how ML calculates wait times, and how no-show slots are reclaimed in real time.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shrink-0">
            <button
              onClick={() => setActiveTab('guided')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                activeTab === 'guided'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Guided Scenarios
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                activeTab === 'sandbox'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Live API Sandbox
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'guided' ? (
        <>
          {/* Scenario Selector Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {scenarios.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleScenarioChange(sc.id)}
                  className={`p-4 rounded-3xl text-left transition-all duration-200 border cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white/60 dark:bg-zinc-900/60 border-white/60 dark:border-white/10 hover:bg-white/90 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {sc.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sc.priorityResult >= 5
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                          : sc.id === 'no_show_recapture'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                      }`}
                    >
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {sc.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Simulation Control Bar */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-4">
            {/* Playback Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
              </button>

              <button
                onClick={() => {
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                title="Restart from Step 1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Step indicator */}
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-2">
                Step <span className="text-blue-600 dark:text-blue-400 font-bold">{currentStepIndex + 1}</span> of {activeScenario.steps.length}
              </div>
            </div>

            {/* Step Pills Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {activeScenario.steps.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isPast = idx < currentStepIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs ring-2 ring-blue-500/30'
                        : isPast
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50'
                        : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/10'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center text-[10px]">
                      {isPast ? '✓' : idx + 1}
                    </span>
                    <span>{step.nodeName}</span>
                  </button>
                );
              })}
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <span className="text-[11px] font-medium mr-1">Speed:</span>
              {[0.75, 1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    playbackSpeed === spd
                      ? 'bg-blue-600 text-white'
                      : 'bg-black/5 dark:bg-white/5 text-zinc-600 hover:bg-black/10'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Visual Pipeline Map */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Live System Pipeline Animation
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Watch the data flow through each distributed node in real-time
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Node Active: {activeStep.nodeName}
                </span>
              </div>
            </div>

            {/* Horizontal Dynamic Node Network */}
            <div className="relative py-4 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[760px] relative px-4">
                {/* Connecting Track Line */}
                <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-zinc-200 dark:bg-zinc-800 -z-0" />
                
                {/* Animated Data Progress Bar on Wire */}
                <div
                  className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500 -z-0"
                  style={{
                    width: `${(currentStepIndex / (activeScenario.steps.length - 1)) * 88}%`,
                  }}
                />

                {activeScenario.steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;

                  let nodeColor = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600';
                  let ringColor = 'ring-zinc-300';
                  if (isActive) {
                    nodeColor = 'bg-blue-600 text-white shadow-lg shadow-blue-500/30';
                    ringColor = 'ring-4 ring-blue-400/40 animate-pulse';
                  } else if (isCompleted) {
                    nodeColor = 'bg-emerald-600 text-white';
                    ringColor = 'ring-2 ring-emerald-400/40';
                  }

                  return (
                    <div
                      key={step.id}
                      onClick={() => {
                        setCurrentStepIndex(idx);
                        setIsPlaying(false);
                      }}
                      className="relative z-10 flex flex-col items-center cursor-pointer group"
                    >
                      {/* Floating glowing particle on active node */}
                      {isActive && (
                        <motion.div
                          layoutId="active-particle"
                          className="absolute -top-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-md uppercase tracking-wider"
                        >
                          Processing
                        </motion.div>
                      )}

                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${nodeColor} ${ringColor}`}
                      >
                        {idx === 0 && <Smartphone className="w-6 h-6" />}
                        {idx === 1 && <Server className="w-6 h-6" />}
                        {idx === 2 && <Cpu className="w-6 h-6" />}
                        {idx === 3 && <Activity className="w-6 h-6" />}
                        {idx === 4 && <CheckCircle2 className="w-6 h-6" />}
                      </div>

                      <span className="text-xs font-bold text-zinc-900 dark:text-white mt-2 text-center max-w-[120px]">
                        {step.nodeName}
                      </span>
                      <span className="text-[10px] text-zinc-500 text-center">
                        Step {idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Split Screen: Left Step Details + Right Live JSON / Logic Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-black/5 dark:border-white/5">
              
              {/* Left Column: Human Explanation & Highlight Metrics */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-3xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Active Stage Breakdown
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      {activeStep.category.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                    {activeStep.title}
                  </h4>

                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {activeStep.description}
                  </p>

                  <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-black/5 dark:border-white/10 text-xs">
                    <span className="text-[10px] text-zinc-400 font-semibold block mb-0.5">
                      Why this matters:
                    </span>
                    <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed font-medium">
                      {activeStep.details}
                    </p>
                  </div>

                  {/* Highlight Metric Pill */}
                  <div className="pt-2 flex items-center justify-between border-t border-blue-200/50 dark:border-blue-900/40">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {activeStep.highlightMetric.label}:
                    </span>
                    <span className={`text-sm font-extrabold ${activeStep.highlightMetric.color}`}>
                      {activeStep.highlightMetric.value}
                    </span>
                  </div>
                </div>

                {/* Simulated Customer Intake Quote */}
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    Customer Input Under Test:
                  </span>
                  <p className="font-serif italic text-zinc-800 dark:text-zinc-200">
                    "{activeScenario.inputText}"
                  </p>
                  <div className="text-[10px] text-zinc-500 pt-1">
                    Submitted by {activeScenario.customerName} ({activeScenario.customerPhone})
                  </div>
                </div>
              </div>

              {/* Right Column: Code & JSON Payload Inspector */}
              <div className="lg:col-span-7 space-y-3">
                <div className="rounded-3xl bg-zinc-950 text-zinc-100 p-5 shadow-xl border border-zinc-800 font-mono text-xs flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-zinc-200">
                          {activeStep.nodeName} Payload Inspector
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyPayload(activeStep.payload)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                      >
                        {copiedPayload ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>

                    {/* Formatted JSON output */}
                    <div className="mt-3 overflow-x-auto max-h-72 text-[11px] leading-relaxed text-emerald-300">
                      <pre>{JSON.stringify(activeStep.payload, null, 2)}</pre>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between font-sans">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Schema Validated (Strict Gemini Type Enforced)
                    </span>
                    <span>Lat: ~28ms</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      ) : (
        /* Live API Sandbox View */
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Live API Triage Sandbox
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Type any custom message in any language to execute the live `/api/triage` endpoint
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                Active Tenant: {businessConfig.name}
              </span>
            </div>

            {/* Sandbox Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={sandboxName}
                  onChange={(e) => setSandboxName(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl bg-white/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Natural Language Prompt / Request / Symptoms
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    placeholder="e.g. 'I lost my credit card while travelling' or 'Severe asthma attack'..."
                    className="flex-1 text-xs p-3 rounded-2xl bg-white/60 dark:bg-zinc-800 border border-black/10 dark:border-white/10 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleRunSandbox}
                    disabled={sandboxLoading || !sandboxInput.trim()}
                    className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/30 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {sandboxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{sandboxLoading ? 'Executing...' : 'Run Pipeline'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Preset Prompt Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-zinc-400 mr-1">Quick Presets:</span>
              {[
                'Severe chest heaviness and shortness of breath',
                'Mera wallet chori ho gaya credit card block karo',
                'Opening international business account for LLC',
                'Need duplicate driving license renewed today',
                'Please cancel my ticket #A-102 leaving the line',
              ].map((preset, i) => (
                <button
                  key={i}
                  onClick={() => setSandboxInput(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                >
                  "{preset.slice(0, 30)}..."
                </button>
              ))}
            </div>

            {/* Animated Pipeline Stage Indicator during execution */}
            {sandboxLoading && (
              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/50 flex items-center justify-between text-xs animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                  <span className="font-semibold text-purple-800 dark:text-purple-300">
                    {sandboxStep === 1 && 'Ingesting & Validating payload...'}
                    {sandboxStep === 2 && 'Passing to Gemini 3.7 Flash structured evaluation...'}
                    {sandboxStep === 3 && 'Calculating ML peak demand regression multiplier...'}
                    {sandboxStep === 4 && 'Inserting into Priority Queue & broadcasting SSE...'}
                    {sandboxStep === 5 && 'Execution complete!'}
                  </span>
                </div>
                <span className="font-mono text-purple-600 font-bold">Stage {sandboxStep}/5</span>
              </div>
            )}

            {/* Live Result Display */}
            {sandboxResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-black/5 dark:border-white/5"
              >
                {/* Result Card */}
                <div className="p-5 rounded-3xl bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/10 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Live AI Output
                    </span>
                    {sandboxResult.ticket && (
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                        {sandboxResult.ticket.ticketNumber}
                      </span>
                    )}
                  </div>

                  {sandboxResult.triage && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            sandboxResult.triage.priority_score >= 5
                              ? 'bg-red-500 text-white'
                              : sandboxResult.triage.priority_score >= 3
                              ? 'bg-orange-500 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          Priority P{sandboxResult.triage.priority_score}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-white capitalize">
                          Queue: {sandboxResult.triage.queue_type}
                        </span>
                      </div>

                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-900 p-3 rounded-2xl border border-black/5">
                        {sandboxResult.triage.reason}
                      </p>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                          <span className="text-[10px] text-zinc-400 block">Est. Wait Time</span>
                          <span className="font-bold text-zinc-900 dark:text-white text-sm">
                            {sandboxResult.ticket?.estimatedWaitMinutes || 10} mins
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900">
                          <span className="text-[10px] text-zinc-400 block">Detected Language</span>
                          <span className="font-bold text-zinc-900 dark:text-white text-sm">
                            {sandboxResult.triage.language || 'English'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw API Response JSON */}
                <div className="p-5 rounded-3xl bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-80 shadow-xl border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 pb-2 border-b border-zinc-800 mb-2 flex items-center justify-between">
                    <span>RESPONSE /api/triage (Status 200 OK)</span>
                    <span>Lat: 312ms</span>
                  </div>
                  <pre>{JSON.stringify(sandboxResult, null, 2)}</pre>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
