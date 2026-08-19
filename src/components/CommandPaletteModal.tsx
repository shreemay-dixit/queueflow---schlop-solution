import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Zap,
  Volume2,
  VolumeX,
  FileDown,
  LayoutDashboard,
  Smartphone,
  GitPullRequest,
  Activity,
  Building2,
  Sparkles,
  UserPlus,
  Terminal,
  Sliders,
  RotateCcw,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { AppView, BusinessConfig, QueueEntry, TenantId } from '../types';
import { TENANTS_CONFIG } from '../data/tenants';
import { audioAnnouncer } from '../utils/audioAnnouncer';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: QueueEntry[];
  currentTenantId: TenantId;
  activeConfig: BusinessConfig;
  onSelectTenant: (id: TenantId) => void;
  onChangeView: (view: AppView) => void;
  onCallNext: () => void;
  onSimulateNoShow: () => void;
  onOpenAuditLogs: () => void;
  onOpenConfig: () => void;
  onOpenNewIntake: () => void;
  onExportCSV: () => void;
  onSelectTicketPass: (ticket: QueueEntry) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  entries,
  currentTenantId,
  activeConfig,
  onSelectTenant,
  onChangeView,
  onCallNext,
  onSimulateNoShow,
  onOpenAuditLogs,
  onOpenConfig,
  onOpenNewIntake,
  onExportCSV,
  onSelectTicketPass,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredTickets = entries.filter((e) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase();
    return (
      e.ticketNumber.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q) ||
      e.queueType.toLowerCase().includes(q) ||
      e.aiReasoning.toLowerCase().includes(q) ||
      e.intakeText.toLowerCase().includes(q)
    );
  });

  const actions = [
    {
      id: 'call_next',
      icon: Zap,
      title: 'Call Next Ticket in Queue',
      category: 'Queue Operations',
      badge: 'P5 Prioritized',
      color: 'text-amber-500',
      action: () => {
        onCallNext();
        onClose();
      },
    },
    {
      id: 'new_intake',
      icon: UserPlus,
      title: 'New Natural Language Intake',
      category: 'Queue Operations',
      badge: 'Gemini AI',
      color: 'text-blue-500',
      action: () => {
        onOpenNewIntake();
        onClose();
      },
    },
    {
      id: 'simulate_noshow',
      icon: GitPullRequest,
      title: 'Simulate No-Show Slot Recapture',
      category: 'Autonomous Features',
      badge: '5-Min Fast-Pass',
      color: 'text-purple-500',
      action: () => {
        onSimulateNoShow();
        onClose();
      },
    },
    {
      id: 'toggle_sound',
      icon: audioAnnouncer.getMuted() ? VolumeX : Volume2,
      title: audioAnnouncer.getMuted() ? 'Unmute Audio & Voice Announcer' : 'Mute Audio Announcer',
      category: 'Preferences',
      badge: audioAnnouncer.getMuted() ? 'Muted' : 'Active Chime',
      color: 'text-emerald-500',
      action: () => {
        audioAnnouncer.toggleMute();
        onClose();
      },
    },
    {
      id: 'export_csv',
      icon: FileDown,
      title: "Export Today's Queue Data (CSV)",
      category: 'Reports & Analytics',
      badge: 'Instant Download',
      color: 'text-indigo-500',
      action: () => {
        onExportCSV();
        onClose();
      },
    },
    {
      id: 'view_staff',
      icon: LayoutDashboard,
      title: 'Switch to Staff Operator Dashboard',
      category: 'Navigation',
      action: () => {
        onChangeView('staff');
        onClose();
      },
    },
    {
      id: 'view_mobile',
      icon: Smartphone,
      title: 'Switch to Customer Mobile Live Pass',
      category: 'Navigation',
      action: () => {
        onChangeView('user');
        onClose();
      },
    },
    {
      id: 'view_simulator',
      icon: Activity,
      title: 'Open Step-by-Step Visual Simulator & Sandbox',
      category: 'Navigation',
      action: () => {
        onChangeView('simulator');
        onClose();
      },
    },
    {
      id: 'open_audit',
      icon: Terminal,
      title: 'Open Explainable AI Audit Log',
      category: 'Audit & Transparency',
      action: () => {
        onOpenAuditLogs();
        onClose();
      },
    },
    {
      id: 'open_config',
      icon: Sliders,
      title: 'Open API Config & FastAPI Architecture',
      category: 'Configuration',
      action: () => {
        onOpenConfig();
        onClose();
      },
    },
  ];

  const filteredActions = actions.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
  });

  const tenantItems = Object.values(TENANTS_CONFIG).filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q);
  });

  // Handle Keyboard Navigation (Arrow keys & Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 dark:border-white/10 overflow-hidden flex flex-col max-h-[75vh]"
            onKeyDown={handleKeyDown}
          >
            {/* Spotlight Search Header */}
            <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center gap-3 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-xl">
              <Search className="w-5 h-5 text-zinc-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command, customer name, ticket # (e.g., 'B-101'), or action..."
                className="w-full text-sm bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none font-medium"
              />
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 text-[10px] font-mono font-semibold text-zinc-500 bg-black/5 dark:bg-white/10 rounded-md border border-black/5">
                  ESC
                </kbd>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Ticket Search Results */}
              {filteredTickets.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Active Tickets ({filteredTickets.length})
                  </div>
                  {filteredTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => {
                        onSelectTicketPass(ticket);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 font-extrabold text-xs flex items-center justify-center">
                          {ticket.ticketNumber}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            {ticket.userName}
                            <span className="text-[10px] font-semibold text-zinc-400 font-mono">
                              ({ticket.queueType})
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 line-clamp-1">
                            {ticket.aiReasoning}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ~{ticket.estimatedWaitMinutes}m
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Actions */}
              {filteredActions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Quick Commands & Tools
                  </div>
                  {filteredActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${action.color || 'text-zinc-700 dark:text-zinc-300'}`} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                              {action.title}
                            </div>
                            <div className="text-[10px] text-zinc-400">{action.category}</div>
                          </div>
                        </div>

                        {action.badge && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                            {action.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tenant Switcher */}
              {tenantItems.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Switch Organization Tenant
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {tenantItems.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          onSelectTenant(tenant.id);
                          onClose();
                        }}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          currentTenantId === tenant.id
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
                            : 'bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10'
                        }`}
                      >
                        <span className="text-xl">{tenant.icon}</span>
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold truncate text-zinc-900 dark:text-white">
                            {tenant.name.split('&')[0]}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate">{tenant.tagline}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-black/5 dark:border-white/10 bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-2">
                <span>Active: <strong className="text-zinc-800 dark:text-zinc-200">{activeConfig.name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-black/5 dark:bg-white/10 rounded">ESC</kbd>
                <span>to dismiss</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
