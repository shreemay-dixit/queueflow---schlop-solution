import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, X, Search, Filter, ShieldCheck, Zap, Brain, Clock, ChevronRight } from 'lucide-react';
import { AuditLogEntry, TenantId } from '../types';

interface AIAuditLogSheetProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  currentTenantId: TenantId;
}

export const AIAuditLogSheet: React.FC<AIAuditLogSheetProps> = ({
  isOpen,
  onClose,
  logs,
  currentTenantId,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all' && log.eventType !== filterType) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        log.rawInput?.toLowerCase().includes(q) ||
        log.details.ticketNumber?.toLowerCase().includes(q) ||
        log.details.userName?.toLowerCase().includes(q) ||
        log.details.reasoning?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="w-full max-w-2xl h-full bg-zinc-950/90 backdrop-blur-2xl text-zinc-100 shadow-2xl border-l border-white/10 flex flex-col font-mono"
          >
            {/* macOS Terminal Header (Frosted) */}
            <div className="p-4 border-b border-white/10 bg-zinc-900/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5">
                  <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 transition cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>QueueFlow AI Audit Inspector — [{currentTenantId}]</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-3 bg-zinc-900/40 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs backdrop-blur-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['all', 'TRIAGE_EVALUATION', 'NO_SHOW_DETECTED', 'CONSENT_OFFERED', 'CONSENT_ACCEPTED', 'QUEUE_ADVANCED'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 rounded-xl transition whitespace-nowrap text-xs ${
                      filterType === t
                        ? 'bg-white text-zinc-900 font-bold shadow-xs'
                        : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-white/5'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter logs..."
                  className="w-full text-[11px] bg-zinc-800/80 text-zinc-200 pl-7 pr-2.5 py-1 rounded-xl border border-white/10 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            {/* Terminal Feed Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-zinc-500 text-center py-12">
                  No telemetry audit logs found for current filter.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleTimeString();
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition"
                    >
                      {/* Top metadata line */}
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">[{dateStr}]</span>
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                              log.eventType === 'TRIAGE_EVALUATION'
                                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                                : log.eventType === 'NO_SHOW_DETECTED'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : log.eventType === 'CONSENT_OFFERED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : log.eventType === 'CONSENT_ACCEPTED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}
                          >
                            {log.eventType}
                          </span>
                          {log.details.ticketNumber && (
                            <span className="text-zinc-300 font-bold">
                              {log.details.ticketNumber}
                            </span>
                          )}
                        </div>

                        {log.details.priorityScore && (
                          <span className="text-red-400 font-bold">
                            Priority: {log.details.priorityScore}/5
                          </span>
                        )}
                      </div>

                      {/* Raw input if available */}
                      {log.rawInput && (
                        <div className="text-zinc-400 text-[11px] bg-black/40 p-2 rounded border border-zinc-800">
                          <span className="text-zinc-500">Evaluated Prompt: </span>
                          <span className="text-zinc-200">"{log.rawInput}"</span>
                        </div>
                      )}

                      {/* Structured Reasoning and factors */}
                      {log.details.reasoning && (
                        <div className="text-zinc-300 text-xs pl-2 border-l-2 border-emerald-500/40">
                          <span className="text-emerald-400 font-semibold">AI Reasoning: </span>
                          {log.details.reasoning}
                        </div>
                      )}

                      {/* Parameters footer */}
                      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/50">
                        {log.details.queueType && <span>Queue: {log.details.queueType}</span>}
                        {log.details.language && <span>Lang: {log.details.language}</span>}
                        {log.details.mlFactor && <span>ML Factor: {log.details.mlFactor}x</span>}
                        {log.details.waitMinutesCalculated && (
                          <span className="text-blue-400 font-semibold">
                            Calculated Wait: {log.details.waitMinutesCalculated}m
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Bottom Status bar */}
            <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between px-4">
              <span>● Real-time WebSocket Feed Active</span>
              <span>Total Entries: {logs.length}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
