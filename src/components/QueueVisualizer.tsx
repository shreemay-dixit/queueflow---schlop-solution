import React from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  Users,
  ChevronRight,
  Flame,
  AlertTriangle,
  Check,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { BusinessConfig, QueueEntry } from '../types';
import { getPriorityInfo, formatEstimatedCallTime } from '../utils/priority';

interface QueueVisualizerProps {
  businessConfig: BusinessConfig;
  entries: QueueEntry[];
  activeTicketId?: string | null;
  onAdvanceTicket?: (ticketId: string) => Promise<void>;
  isStaffView?: boolean;
}

export const QueueVisualizer: React.FC<QueueVisualizerProps> = ({
  businessConfig,
  entries,
  activeTicketId,
  onAdvanceTicket,
  isStaffView = false,
}) => {
  const waitingTickets = entries
    .filter((e) => e.status === 'waiting')
    .sort((a, b) => {
      // Sort priority 5 first, then 4, 3, 2, 1, then arrival time
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const inProgressTicket = entries.find((e) => e.status === 'in_progress');

  return (
    <div className="rounded-3xl p-4 sm:p-5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xs space-y-4">
      {/* Header & 3-Priority Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Live Queue Line
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20">
                {waitingTickets.length} waiting
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Real-time order based on priority and arrival time
            </p>
          </div>
        </div>

        {/* 3-Priority Color Tagging Legend */}
        <div className="flex items-center gap-2 text-[11px] bg-white/60 dark:bg-zinc-800/60 px-3 py-1.5 rounded-2xl border border-white/80 dark:border-white/10 shadow-xs backdrop-blur-sm">
          <span className="text-zinc-400 font-semibold text-[10px] uppercase tracking-wider mr-1">
            Priority:
          </span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-semibold text-red-700 dark:text-red-300">5 Urgent</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="font-semibold text-orange-700 dark:text-orange-300">3–4 Medium</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">1–2 Normal</span>
          </div>
        </div>
      </div>

      {/* Main Visual Track Container */}
      <div className="flex flex-col lg:flex-row items-stretch gap-3">
        
        {/* Active Counter Bay */}
        <div className="lg:w-64 shrink-0 rounded-2xl p-3.5 bg-gradient-to-br from-blue-500/10 via-white/60 to-white/40 dark:from-blue-950/30 dark:via-zinc-900/60 dark:to-zinc-900/40 border border-blue-400/30 dark:border-blue-500/20 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                NOW SERVING
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                Desk #1
              </span>
            </div>

            {inProgressTicket ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs">
                    {inProgressTicket.ticketNumber}
                  </span>
                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {inProgressTicket.userName}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {businessConfig.queueTypes.find((q) => q.id === inProgressTicket.queueType)?.name || inProgressTicket.queueType}
                </div>
              </div>
            ) : waitingTickets.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Ready for Next Customer
                </div>
                <p className="text-[11px] text-zinc-500">
                  Next ticket up is #{waitingTickets[0].ticketNumber.slice(-3)}
                </p>
                {isStaffView && onAdvanceTicket && (
                  <button
                    onClick={() => onAdvanceTicket(waitingTickets[0].id)}
                    className="mt-2 w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-xs active:scale-95 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Call #{waitingTickets[0].ticketNumber.slice(-3)}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-zinc-400 italic py-2">
                Queue is empty. Counter open.
              </div>
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-blue-200/50 dark:border-blue-900/40 text-[10px] text-blue-600/80 dark:text-blue-400 flex items-center justify-between">
            <span>Live Counter Flow</span>
            <span>~{businessConfig.baseServiceMinutes}m / person</span>
          </div>
        </div>

        {/* Horizontal Visual Queue Line */}
        <div className="flex-1 overflow-x-auto pb-1">
          {waitingTickets.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6 rounded-2xl bg-white/40 dark:bg-zinc-800/40 border border-dashed border-zinc-300 dark:border-zinc-700 text-xs text-zinc-400 text-center">
              No one currently waiting in line.
            </div>
          ) : (
            <div className="flex items-center gap-2.5 min-w-max py-0.5">
              {waitingTickets.map((ticket, idx) => {
                const priority = getPriorityInfo(ticket.priorityScore);
                const isUserTicket = activeTicketId === ticket.id;
                const position = idx + 1;
                const estimatedCall = formatEstimatedCallTime(ticket.estimatedWaitMinutes);

                return (
                  <React.Fragment key={ticket.id}>
                    <motion.div
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`relative w-44 sm:w-48 p-3 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between ${
                        isUserTicket
                          ? 'ring-2 ring-blue-500 bg-blue-50/70 dark:bg-blue-950/40 border-blue-400'
                          : ticket.bumpedUp
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400/60'
                          : `${priority.bgLightClass} ${priority.borderClass}`
                      }`}
                    >
                      {/* User Badge if it's their ticket */}
                      {isUserTicket && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-xs flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> YOU
                        </div>
                      )}

                      {/* Top Row: Position & 3-Color Priority Tag */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-white/90 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shadow-2xs border border-black/5 dark:border-white/10">
                            #{position}
                          </span>
                          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                            {ticket.ticketNumber}
                          </span>
                        </div>

                        {/* Strict 3-Priority Color Pill */}
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${priority.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
                          {priority.label}
                        </span>
                      </div>

                      {/* Customer Name & Department */}
                      <div className="my-1">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {ticket.userName}
                        </div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {businessConfig.queueTypes.find((q) => q.id === ticket.queueType)?.name || ticket.queueType}
                        </div>
                      </div>

                      {/* Dynamic Time Info & Est Call */}
                      <div className="pt-2 mt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-semibold">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>{ticket.estimatedWaitMinutes} mins</span>
                        </div>
                        <span className="text-[9px] text-zinc-400 font-medium">
                          ~{estimatedCall}
                        </span>
                      </div>
                    </motion.div>

                    {/* Arrow connector between positions */}
                    {idx < waitingTickets.length - 1 && (
                      <div className="text-zinc-300 dark:text-zinc-700 shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
