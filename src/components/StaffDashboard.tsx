import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Plus,
  Search,
  Filter,
  Flame,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Users,
  Check,
  Building,
  Info,
  QrCode,
  Volume2,
  FileDown,
  Timer,
  Play,
  RotateCw,
} from 'lucide-react';
import { BusinessConfig, QueueEntry, TenantId } from '../types';
import { QueueVisualizer } from './QueueVisualizer';
import { getPriorityInfo, formatEstimatedCallTime } from '../utils/priority';
import { audioAnnouncer } from '../utils/audioAnnouncer';

interface StaffDashboardProps {
  businessConfig: BusinessConfig;
  entries: QueueEntry[];
  stats: {
    totalWaiting: number;
    inProgress: number;
    completedToday: number;
    cancelledToday: number;
    averageWaitMinutes: number;
    triageAccuracy: number;
    noShowRecoveryRate: number;
  };
  onAdvanceTicket: (ticketId: string) => Promise<void>;
  onCancelTicket: (ticketId: string) => Promise<void>;
  onTriggerUpgrade: () => Promise<void>;
  onManualIntake: (name: string, phone: string, text: string) => Promise<void>;
  onOpenTicketPass?: (ticket: QueueEntry) => void;
  onExportCSV?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  businessConfig,
  entries,
  stats,
  onAdvanceTicket,
  onCancelTicket,
  onTriggerUpgrade,
  onManualIntake,
  onOpenTicketPass,
  onExportCSV,
}) => {
  const [activeTab, setActiveTab] = useState<'waiting' | 'in_progress' | 'completed' | 'all'>('waiting');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQueueType, setSelectedQueueType] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'all' | 'urgent' | 'medium' | 'normal'>('all');
  const [selectedDesk, setSelectedDesk] = useState<string>('Station 1');
  const [isAdvancingId, setIsAdvancingId] = useState<string | null>(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Quick staff manual intake form state
  const [intakeName, setIntakeName] = useState('');
  const [intakePhone, setIntakePhone] = useState('');
  const [intakeText, setIntakeText] = useState('');
  const [isIntaking, setIsIntaking] = useState(false);

  // Live timer tick for service elapsed stopwatch
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    if (activeTab !== 'all' && entry.status !== activeTab) return false;
    if (selectedQueueType !== 'all' && entry.queueType !== selectedQueueType) return false;
    if (selectedPriorityFilter === 'urgent' && entry.priorityScore < 5) return false;
    if (selectedPriorityFilter === 'medium' && (entry.priorityScore < 3 || entry.priorityScore >= 5)) return false;
    if (selectedPriorityFilter === 'normal' && entry.priorityScore > 2) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        entry.ticketNumber.toLowerCase().includes(q) ||
        entry.userName.toLowerCase().includes(q) ||
        entry.userPhone.toLowerCase().includes(q) ||
        entry.aiReasoning.toLowerCase().includes(q) ||
        entry.intakeText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort: Priority 5 to 1 first, then arrival time
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const waitingCandidates = entries.filter((e) => e.status === 'waiting');
  const nextUpCandidate = [...waitingCandidates].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })[0];

  const handleAdvance = async (ticketId: string) => {
    setIsAdvancingId(ticketId);
    try {
      const ticket = entries.find((e) => e.id === ticketId);
      if (ticket) {
        audioAnnouncer.announceTicket(ticket.ticketNumber, ticket.userName, selectedDesk);
      }
      await onAdvanceTicket(ticketId);
    } finally {
      setIsAdvancingId(null);
    }
  };

  const handleCallNextGlobal = async () => {
    if (!nextUpCandidate) return;
    await handleAdvance(nextUpCandidate.id);
  };

  const handleReAnnounce = (ticket: QueueEntry) => {
    audioAnnouncer.announceTicket(ticket.ticketNumber, ticket.userName, selectedDesk);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeText.trim()) return;
    setIsIntaking(true);
    try {
      await onManualIntake(intakeName || 'Walk-in Guest', intakePhone || '+1 (555) 000-1122', intakeText);
      setIntakeName('');
      setIntakePhone('');
      setIntakeText('');
      setShowIntakeModal(false);
    } finally {
      setIsIntaking(false);
    }
  };

  const getPriorityBadge = (score: number) => {
    const p = getPriorityInfo(score);
    if (score >= 5) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${p.badgeClass} animate-pulse shadow-xs`}>
          <Flame className="w-3.5 h-3.5 text-red-500" />
          Urgent (P5)
        </span>
      );
    }
    if (score >= 3) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${p.badgeClass}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          Medium (P{score})
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${p.badgeClass}`}>
        <Check className="w-3.5 h-3.5 text-emerald-500" />
        Normal (P{score})
      </span>
    );
  };

  const getQueueTypeBadge = (queueTypeId: string) => {
    const qt = businessConfig.queueTypes.find((q) => q.id === queueTypeId);
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-2xs"
        style={{ backgroundColor: qt?.color || '#2563EB' }}
      >
        {qt?.name || queueTypeId}
      </span>
    );
  };

  const deskOptions = [
    'Station 1 (Main Bay)',
    'Station 2 (Consult Desk)',
    'Station 3 (Express Desk)',
    'Emergency Bay A',
    'VIP / Corporate Desk',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Service Desk Selection & Fast Operator Actions */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{businessConfig.icon}</span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                {businessConfig.name}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {businessConfig.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls Group */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Desk Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/10 text-xs font-semibold">
            <Building className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={selectedDesk}
              onChange={(e) => setSelectedDesk(e.target.value)}
              className="bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              {deskOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Call Next Button (Prominent & Priority-Aware) */}
          <button
            onClick={handleCallNextGlobal}
            disabled={!nextUpCandidate || isAdvancingId === nextUpCandidate?.id}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
            title={nextUpCandidate ? `Call next: ${nextUpCandidate.ticketNumber} (${nextUpCandidate.userName})` : 'No waiting tickets'}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Call Next {nextUpCandidate ? `(${nextUpCandidate.ticketNumber})` : ''}</span>
          </button>

          {/* New Walk-in Button */}
          <button
            onClick={() => setShowIntakeModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-xs shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Intake</span>
          </button>

          {/* Export CSV Button */}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="p-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10 transition cursor-pointer"
              title="Export Today's Queue as CSV"
            >
              <FileDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visual Live Queue Line Strip */}
      <QueueVisualizer
        entries={entries}
        businessConfig={businessConfig}
        onTicketClick={(t) => onOpenTicketPass && onOpenTicketPass(t)}
      />

      {/* Top Metric Cards (Frosted Glass Apple HIG) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:bg-white/90 transition">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Waiting Queue</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {stats.totalWaiting}
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 block">
            {stats.inProgress} at counter desks
          </span>
        </div>

        <div className="p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:bg-white/90 transition">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Avg Wait Time</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {stats.averageWaitMinutes}<span className="text-sm font-normal text-zinc-400">m</span>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            P5 Wait: ~2m (Urgent)
          </span>
        </div>

        <div className="p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:bg-white/90 transition">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Served Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {stats.completedToday < 10 ? `0${stats.completedToday}` : stats.completedToday}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            100% throughput SLA
          </span>
        </div>

        <div className="p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:bg-white/90 transition">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">AI Triage Accuracy</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {stats.triageAccuracy}%
          </div>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold mt-0.5 block">
            Gemini structured routing
          </span>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:bg-white/90 transition">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Slots Recaptured</span>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
            {stats.noShowRecoveryRate}%
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5 block">
            Zero idle counter time
          </span>
        </div>
      </div>

      {/* Control Bar: Status Tabs, Priority Filter, Department Filter, Search */}
      <div className="space-y-3 p-4 rounded-3xl bg-white/75 dark:bg-zinc-900/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Tabs (Segmented Control) */}
          <div className="flex items-center p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab('waiting')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === 'waiting'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Waiting ({entries.filter((e) => e.status === 'waiting').length})
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === 'in_progress'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              At Counter ({entries.filter((e) => e.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Completed ({entries.filter((e) => e.status === 'completed').length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              All Records ({entries.length})
            </button>
          </div>

          {/* Department & Search Group */}
          <div className="flex items-center gap-2">
            {/* Queue Type Selector */}
            <select
              value={selectedQueueType}
              onChange={(e) => setSelectedQueueType(e.target.value)}
              className="text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 cursor-pointer focus:outline-none shadow-xs"
            >
              <option value="all">All Departments</option>
              {businessConfig.queueTypes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, name, symptom..."
                className="w-full text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 pl-8 pr-3 py-2 rounded-xl border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Priority Quick Filter Chips */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5 overflow-x-auto text-xs font-medium">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            Priority Tier:
          </span>
          <button
            onClick={() => setSelectedPriorityFilter('all')}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
              selectedPriorityFilter === 'all'
                ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-2xs'
                : 'bg-black/5 dark:bg-white/5 text-zinc-600 hover:bg-black/10'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setSelectedPriorityFilter('urgent')}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedPriorityFilter === 'urgent'
                ? 'bg-red-500 text-white font-bold shadow-2xs'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 hover:bg-red-100'
            }`}
          >
            <Flame className="w-3 h-3" /> P5 Urgent ({entries.filter((e) => e.priorityScore >= 5).length})
          </button>
          <button
            onClick={() => setSelectedPriorityFilter('medium')}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedPriorityFilter === 'medium'
                ? 'bg-orange-500 text-white font-bold shadow-2xs'
                : 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 hover:bg-orange-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" /> P3-P4 Medium ({entries.filter((e) => e.priorityScore >= 3 && e.priorityScore < 5).length})
          </button>
          <button
            onClick={() => setSelectedPriorityFilter('normal')}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              selectedPriorityFilter === 'normal'
                ? 'bg-emerald-500 text-white font-bold shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <Check className="w-3 h-3" /> P1-P2 Normal ({entries.filter((e) => e.priorityScore <= 2).length})
          </button>
        </div>
      </div>

      {/* Ticket Cards Grid Viewport */}
      {sortedEntries.length === 0 ? (
        <div className="p-14 text-center rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400 mb-3 shadow-xs">
            <Check className="w-6 h-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            No Tickets in this Filter View
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            The queue is clear or no entries match your selected criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {sortedEntries.map((ticket, index) => {
              const priority = getPriorityInfo(ticket.priorityScore);
              const estCallTime = formatEstimatedCallTime(ticket.estimatedWaitMinutes);

              // Calculate elapsed time for in_progress tickets
              const elapsedSec = ticket.status === 'in_progress'
                ? Math.max(0, Math.floor((nowTime - new Date(ticket.updatedAt || ticket.createdAt).getTime()) / 1000))
                : 0;
              const elapsedMin = Math.floor(elapsedSec / 60);
              const elapsedRemainderSec = elapsedSec % 60;
              const targetDurationSec = (businessConfig.baseServiceMinutes || 10) * 60;
              const progressPct = Math.min(100, Math.round((elapsedSec / targetDurationSec) * 100));

              return (
                <motion.div
                  key={ticket.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18, delay: index * 0.02 }}
                  className={`group relative rounded-3xl p-5 backdrop-blur-2xl border transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg flex flex-col justify-between ${
                    ticket.status === 'in_progress'
                      ? 'border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                      : ticket.bumpedUp
                      ? 'border-emerald-400/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : ticket.priorityScore >= 5
                      ? 'border-red-400/60 bg-red-50/30 dark:bg-red-950/20'
                      : ticket.priorityScore >= 3
                      ? 'border-orange-300/60 bg-orange-50/20 dark:bg-orange-950/15'
                      : 'border-white/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70'
                  }`}
                >
                  <div>
                    {/* Top Row: Ticket Icon & Customer Metadata */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold text-sm shadow-xs border ${
                            ticket.priorityScore >= 5
                              ? 'bg-red-500 text-white border-red-600 shadow-red-500/20'
                              : ticket.priorityScore >= 3
                              ? 'bg-orange-500 text-white border-orange-600 shadow-orange-500/20'
                              : 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-tighter opacity-90">
                            {priority.label}
                          </span>
                          <span className="text-base font-extrabold leading-none">P{ticket.priorityScore}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                              {ticket.userName}
                            </span>
                            {ticket.bumpedUp && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500 text-white shadow-2xs">
                                ⚡ Fast-Pass
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            {ticket.ticketNumber} • {ticket.userPhone}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        {getPriorityBadge(ticket.priorityScore)}
                        {getQueueTypeBadge(ticket.queueType)}
                      </div>
                    </div>

                    {/* Customer Intake Text */}
                    <div className="mb-3 p-3 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 italic line-clamp-2">
                        "{ticket.intakeText}"
                      </p>
                      {ticket.language && ticket.language !== 'English' && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-blue-500">
                          🌐 Detected Language: {ticket.language}
                        </span>
                      )}
                    </div>

                    {/* AI Priority Reasoning */}
                    <div className="mb-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px]">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        <span>Clinical / Operational Justification:</span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 pl-3 border-l-2 border-blue-500/40 leading-relaxed font-medium">
                        {ticket.aiReasoning}
                      </p>
                    </div>

                    {/* Active In-Progress Stopwatch Duration (if serving) */}
                    {ticket.status === 'in_progress' && (
                      <div className="mb-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold text-blue-700 dark:text-blue-300">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3.5 h-3.5 animate-spin" />
                            Active Service Elapsed:
                          </span>
                          <span className="font-mono text-sm">
                            {String(elapsedMin).padStart(2, '0')}:{String(elapsedRemainderSec).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPct > 100 ? 'bg-red-500' : progressPct > 75 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-500 flex justify-between">
                          <span>Serving at {selectedDesk}</span>
                          <span>Target: ~{businessConfig.baseServiceMinutes}m</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Wait Time Indicator & Status */}
                    <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <span>
                              {ticket.status === 'completed'
                                ? 'Finished'
                                : ticket.status === 'cancelled'
                                ? 'Cancelled'
                                : `${ticket.estimatedWaitMinutes}m wait`}
                            </span>
                            {ticket.status === 'waiting' && (
                              <span className="text-[10px] text-zinc-500 font-normal">
                                ({estCallTime})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            Pace factor: {ticket.mlTimeFactor}x
                          </div>
                        </div>
                      </div>

                      {/* Tool Buttons: QR Pass & Audio Announce */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleReAnnounce(ticket)}
                          className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                          title="Voice announce ticket callout"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        {onOpenTicketPass && (
                          <button
                            onClick={() => onOpenTicketPass(ticket)}
                            className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                            title="Open digital pass & QR code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Operational Action Buttons */}
                    {ticket.status === 'waiting' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleAdvance(ticket.id)}
                          disabled={isAdvancingId === ticket.id}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 transition active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                          Call to Desk
                        </button>

                        <button
                          onClick={() => onCancelTicket(ticket.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 transition border border-red-200 dark:border-red-500/20 active:scale-95 shadow-xs cursor-pointer"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Cancel / No-Show
                        </button>
                      </div>
                    )}

                    {ticket.status === 'in_progress' && (
                      <button
                        onClick={() => handleAdvance(ticket.id)}
                        disabled={isAdvancingId === ticket.id}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-95 shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        Complete Service Consultation
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Staff Fast Natural Language Intake Modal */}
      <AnimatePresence>
        {showIntakeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/80 dark:border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      Add Walk-In / Patient Intake
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Evaluates natural text in any language using Gemini AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIntakeModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Customer / Patient Name
                    </label>
                    <input
                      type="text"
                      value={intakeName}
                      onChange={(e) => setIntakeName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={intakePhone}
                      onChange={(e) => setIntakePhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                    Symptoms or Natural Language Request
                  </label>
                  <textarea
                    rows={3}
                    value={intakeText}
                    onChange={(e) => setIntakeText(e.target.value)}
                    placeholder="e.g. Sharp pain in chest, or opening corporate LLC account..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIntakeModal(false)}
                    className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isIntaking || !intakeText.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isIntaking ? 'Triage Evaluation...' : 'Triage & Insert Ticket'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
