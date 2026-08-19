import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitPullRequest,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Play,
  RotateCcw,
  BarChart3,
  Flame,
  UserX,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BusinessConfig, ConsentUpgrade, MLModelMetrics, QueueEntry, TenantId } from '../types';
import { getPriorityInfo } from '../utils/priority';

interface WaitlistEngineViewProps {
  businessConfig: BusinessConfig;
  entries: QueueEntry[];
  consentUpgrades: ConsentUpgrade[];
  mlMetrics: MLModelMetrics;
  onSimulateNoShow: () => Promise<void>;
  onTriggerUpgrade: () => Promise<void>;
  onConsentResponse: (upgradeId: string, response: 'accept' | 'decline') => Promise<void>;
}

export const WaitlistEngineView: React.FC<WaitlistEngineViewProps> = ({
  businessConfig,
  entries,
  consentUpgrades,
  mlMetrics,
  onSimulateNoShow,
  onTriggerUpgrade,
  onConsentResponse,
}) => {
  const [now, setNow] = useState(Date.now());

  // Tick clock every second for live timers
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Columns data
  const pendingQueue = entries
    .filter((e) => e.status === 'waiting' && !e.bumpedUp)
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const automatedOutreach = consentUpgrades.filter((u) => u.status === 'offered');
  const slotsSecured = consentUpgrades.filter((u) => u.status === 'accepted');

  const getRemainingSeconds = (expiresAt: string) => {
    const diff = Math.floor((new Date(expiresAt).getTime() - now) / 1000);
    return Math.max(0, diff);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: No-Show Recovery Engine Stats & Simulator Controls */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950/95 via-zinc-900/90 to-slate-950/95 backdrop-blur-2xl text-white p-6 sm:p-8 border border-white/20 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
              <Zap className="w-3.5 h-3.5" />
              Dynamic Slot Recovery
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Automatic Reopened Slot Manager
            </h2>
            <p className="text-zinc-300 text-xs sm:text-sm max-w-2xl">
              When a customer cancels or steps away, QueueFlow immediately offers the vacated spot to the next eligible person in line with a 5-minute confirmation window.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSimulateNoShow}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold transition shadow-lg shadow-red-500/30 active:scale-95 cursor-pointer"
            >
              <UserX className="w-4 h-4" />
              Simulate Cancellation
            </button>

            <button
              onClick={onTriggerUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium backdrop-blur-md border border-white/20 transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Offer Slot to Next Person
            </button>
          </div>
        </div>

        {/* Aggregate KPI chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <span className="text-zinc-400 block text-[11px]">Accept Window</span>
            <span className="text-lg font-bold text-white">5 Minutes</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <span className="text-zinc-400 block text-[11px]">Acceptance Rate</span>
            <span className="text-lg font-bold text-emerald-400">92.1%</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <span className="text-zinc-400 block text-[11px]">Avg Time Saved</span>
            <span className="text-lg font-bold text-blue-400">14.8 mins</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
            <span className="text-zinc-400 block text-[11px]">Current Rush Factor</span>
            <span className="text-lg font-bold text-amber-400">{mlMetrics.currentTimeOfDayFactor}x</span>
          </div>
        </div>
      </div>

      {/* 3-Column Pipeline: [Pending Queue] -> [Automated Outreach] -> [Slots Secured] */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Pending Queue */}
        <div className="rounded-3xl p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/40 dark:border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Waiting Candidates
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border border-white/80 dark:border-white/5 shadow-xs">
              {pendingQueue.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {pendingQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No waiting candidates available.
              </div>
            ) : (
              pendingQueue.map((item, idx) => {
                const priority = getPriorityInfo(item.priorityScore);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-white/70 dark:border-white/5 space-y-2 hover:border-blue-500/30 transition backdrop-blur-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {item.ticketNumber} • {item.userName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priority.badgeClass}`}>
                        {priority.label} (P{item.priorityScore})
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 italic">
                      "{item.intakeText}"
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/40 dark:border-white/5">
                      <span>Wait: {item.estimatedWaitMinutes}m</span>
                      <span>Queue rank #{idx + 1}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Automated Outreach (Live 5-Minute Countdown) */}
        <div className="rounded-3xl p-5 bg-gradient-to-b from-amber-500/[0.04] to-transparent dark:from-amber-500/[0.08] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-amber-400/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/40 dark:border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Active Offers Sent
                </h3>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  5-minute decision window
                </span>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-300/40">
              {automatedOutreach.length} active
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {automatedOutreach.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No active offers at this moment.
                <button
                  onClick={onTriggerUpgrade}
                  className="block mt-2 mx-auto text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Offer Reopened Slot
                </button>
              </div>
            ) : (
              automatedOutreach.map((offer) => {
                const remaining = getRemainingSeconds(offer.expiresAt);
                return (
                  <motion.div
                    key={offer.id}
                    layout
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900 border border-amber-400/50 shadow-sm space-y-3 backdrop-blur-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {offer.ticketNumber} • {offer.userName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse">
                        ⏳ Awaiting Reply
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500">
                      {offer.reasonForVacancy}
                    </p>

                    {/* Animated Countdown */}
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <Clock className="w-4 h-4" />
                        <span>Expires in {formatTimer(remaining)}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        +{offer.positionsGained} positions
                      </span>
                    </div>

                    {/* Simulation Accept/Decline triggers */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          onConsentResponse(offer.id, 'accept');
                          confetti({ particleCount: 70, spread: 60 });
                        }}
                        className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Accept Slot
                      </button>
                      <button
                        onClick={() => onConsentResponse(offer.id, 'decline')}
                        className="py-1.5 px-2 rounded-xl bg-white/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-100 border border-black/5 cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Slots Secured */}
        <div className="rounded-3xl p-5 bg-gradient-to-b from-emerald-500/[0.04] to-transparent dark:from-emerald-500/[0.08] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-emerald-400/40 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-white/40 dark:border-white/5 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Slots Reclaimed & Bumped
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300/40">
              {slotsSecured.length} reclaimed
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {slotsSecured.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No slots reclaimed yet. When someone accepts, they will appear here.
              </div>
            ) : (
              slotsSecured.map((sec) => (
                <div
                  key={sec.id}
                  className="p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900 border border-emerald-400/40 shadow-sm space-y-2 backdrop-blur-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {sec.ticketNumber} • {sec.userName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                      ✓ Bumped
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>Moved up {sec.positionsGained} spots</span>
                    <span className="font-semibold text-emerald-600">
                      Wait: {sec.previousWaitMinutes}m ➔ {sec.newEstimatedWaitMinutes}m
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rush Hour Multiplier Visualizer */}
      <div className="p-6 rounded-3xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/40 dark:border-white/5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Rush-Hour Demand Patterns ({businessConfig.name})
              </h3>
              <p className="text-xs text-zinc-500">
                Wait times adjust automatically based on historical busy hours.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-white/80 dark:border-white/10 shadow-xs">
            Current Pace: {mlMetrics.currentTimeOfDayFactor}x
          </span>
        </div>

        {/* Hourly Trend Visualizer */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
            Hourly Busy Curve
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-13 gap-2">
            {mlMetrics.hourlyTrends.map((trend) => (
              <div
                key={trend.hour}
                className={`p-2.5 rounded-2xl text-center border transition backdrop-blur-xs ${
                  trend.factor >= 1.4
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : trend.factor >= 1.2
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-white/60 dark:bg-zinc-800/60 border-white/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div className="text-[10px] font-medium">{trend.label}</div>
                <div className="text-xs font-extrabold mt-1">{trend.factor}x</div>
                <div className="text-[9px] text-zinc-400 mt-0.5">{trend.historicalVolume} visitors</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

