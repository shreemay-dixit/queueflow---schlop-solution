import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AppView,
  AuditLogEntry,
  BusinessConfig,
  ConsentUpgrade,
  MLModelMetrics,
  QueueEntry,
  TenantId,
} from './types';
import { TENANTS_CONFIG } from './data/tenants';
import { AppleHeader } from './components/AppleHeader';
import { StaffDashboard } from './components/StaffDashboard';
import { UserMobileView } from './components/UserMobileView';
import { WaitlistEngineView } from './components/WaitlistEngineView';
import { VisualSimulatorView } from './components/VisualSimulatorView';
import { AIAuditLogSheet } from './components/AIAuditLogSheet';
import { APIConfigSheet } from './components/APIConfigSheet';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { DigitalTicketPassModal } from './components/DigitalTicketPassModal';
import { calculateMLTimeOfDayFactor, getMLMetrics } from './utils/mlEngine';
import { audioAnnouncer } from './utils/audioAnnouncer';
import { Bell, CheckCircle2, Sparkles, X, Zap } from 'lucide-react';

export default function App() {
  const [currentTenantId, setCurrentTenantId] = useState<TenantId>('metro_bank');
  const [activeView, setActiveView] = useState<AppView>('staff');

  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [consentUpgrades, setConsentUpgrades] = useState<ConsentUpgrade[]>([]);
  const [stats, setStats] = useState({
    totalWaiting: 0,
    inProgress: 0,
    completedToday: 0,
    cancelledToday: 0,
    averageWaitMinutes: 0,
    triageAccuracy: 98.4,
    noShowRecoveryRate: 92.1,
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeConfig, setActiveConfig] = useState<BusinessConfig>(TENANTS_CONFIG.metro_bank);
  const [mlMetrics, setMLMetrics] = useState<MLModelMetrics>(getMLMetrics(TENANTS_CONFIG.metro_bank));

  const [isAuditSheetOpen, setIsAuditSheetOpen] = useState(false);
  const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedTicketForPass, setSelectedTicketForPass] = useState<QueueEntry | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const [toastNotification, setToastNotification] = useState<{ id: string; title: string; message: string; type: 'success' | 'alert' | 'upgrade' } | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'alert' | 'upgrade' = 'success') => {
    setToastNotification({ id: String(Date.now()), title, message, type });
    setTimeout(() => setToastNotification(null), 4500);
  };

  // Keyboard shortcut listener for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Queue Data for active tenant
  const fetchQueueData = useCallback(async (tenantId: TenantId) => {
    try {
      const res = await fetch(`/api/queue?business_id=${tenantId}`);
      if (!res.ok) throw new Error('Failed to fetch queue data');
      const data = await res.json();

      setEntries(data.entries || []);
      setConsentUpgrades(data.consentUpgrades || []);
      if (data.stats) setStats(data.stats);
      if (data.config) setActiveConfig(data.config);
      if (data.mlMetrics) setMLMetrics(data.mlMetrics);
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  }, []);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async (tenantId?: TenantId) => {
    try {
      const url = tenantId ? `/api/audit-logs?business_id=${tenantId}` : '/api/audit-logs';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, []);

  // Connect SSE for Real-Time Event Sync
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'connected') {
            setIsLiveConnected(true);
            return;
          }

          // Trigger live refresh
          fetchQueueData(currentTenantId);
          fetchAuditLogs(currentTenantId);

          if (parsed.type === 'ticket_created') {
            const t = parsed.data?.ticket;
            if (t) {
              showToast(
                `⚡ New Ticket ${t.ticketNumber}`,
                `${t.userName} (${t.queueType}) triaged as Priority ${t.priorityScore}`,
                t.priorityScore >= 4 ? 'alert' : 'success'
              );
            }
          } else if (parsed.type === 'upgrade_offered') {
            const u = parsed.data?.upgrade;
            if (u) {
              showToast(
                `⏳ Consent Upgrade Offered`,
                `5-minute bump offer sent to ${u.userName} (${u.ticketNumber})`,
                'upgrade'
              );
            }
          } else if (parsed.type === 'upgrade_accepted') {
            const u = parsed.data?.upgrade;
            if (u) {
              showToast(
                `🎉 Slot Secured & Bumped!`,
                `${u.userName} accepted! Wait dropped to ${u.newEstimatedWaitMinutes} mins`,
                'success'
              );
            }
          } else if (parsed.type === 'ticket_cancelled') {
            const t = parsed.data?.ticket;
            if (t) {
              showToast(
                `⚠️ Dropout / Cancelled`,
                `Ticket ${t.ticketNumber} cancelled. No-show recovery loop triggered.`,
                'alert'
              );
            }
          }
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      };

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (e) {
      console.error('SSE initialization error:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [currentTenantId, fetchQueueData, fetchAuditLogs]);

  // Initial Load
  useEffect(() => {
    fetchQueueData(currentTenantId);
    fetchAuditLogs(currentTenantId);
  }, [currentTenantId, fetchQueueData, fetchAuditLogs]);

  // Switch Tenant
  const handleSelectTenant = (id: TenantId) => {
    setCurrentTenantId(id);
    const config = TENANTS_CONFIG[id];
    setActiveConfig(config);
    setMLMetrics(getMLMetrics(config));
    fetchQueueData(id);
    fetchAuditLogs(id);
    showToast(`Switched Tenant`, `Now managing ${config.name}`, 'success');
  };

  // Advance Ticket (Waiting -> In Progress -> Completed)
  const handleAdvanceTicket = async (ticketId: string) => {
    try {
      const res = await fetch('/api/queue/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Queue Updated', data.message || 'Ticket status advanced', 'success');
        await fetchQueueData(currentTenantId);
        await fetchAuditLogs(currentTenantId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to advance ticket', 'alert');
    }
  };

  // Cancel Ticket (Triggers dynamic no-show recovery cascade)
  const handleCancelTicket = async (ticketId: string) => {
    try {
      const res = await fetch('/api/queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, reason: 'Customer self-cancelled / staff dropout' }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          'Slot Freed & Recovery Active',
          data.message || 'Candidate offered fast bump opportunity',
          'upgrade'
        );
        await fetchQueueData(currentTenantId);
        await fetchAuditLogs(currentTenantId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to cancel ticket', 'alert');
    }
  };

  // Submit Natural Language Intake (via Gemini AI)
  const handleSubmitIntake = async (name: string, phone: string, text: string) => {
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: currentTenantId,
          user_name: name,
          user_phone: phone,
          intake_text: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          `Ticket ${data.ticket.ticketNumber} Issued!`,
          `AI assigned Priority ${data.ticket.priorityScore} (${data.ticket.estimatedWaitMinutes}m wait)`,
          data.ticket.priorityScore >= 4 ? 'alert' : 'success'
        );
        audioAnnouncer.playChime();
        await fetchQueueData(currentTenantId);
        await fetchAuditLogs(currentTenantId);
        return data;
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to process AI triage', 'alert');
      throw err;
    }
  };

  // Respond to Consent Upgrade (Accept/Decline 5-minute fast pass)
  const handleConsentResponse = async (upgradeId: string, response: 'accept' | 'decline') => {
    try {
      const res = await fetch('/api/consent/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgrade_id: upgradeId, response }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          response === 'accept' ? '🎉 Position Upgraded!' : 'Time Preserved',
          data.message,
          response === 'accept' ? 'success' : 'alert'
        );
        await fetchQueueData(currentTenantId);
        await fetchAuditLogs(currentTenantId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Autonomous Slot Recapture
  const handleTriggerUpgrade = async () => {
    try {
      const res = await fetch('/api/consent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: currentTenantId }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('Autonomous Upgrade Triggered', data.message || 'Upgrade offer sent', 'upgrade');
        await fetchQueueData(currentTenantId);
        await fetchAuditLogs(currentTenantId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Tenant Config
  const handleSaveConfig = async (newConfig: BusinessConfig) => {
    try {
      const res = await fetch('/api/tenants/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        setActiveConfig(newConfig);
        showToast('Settings Saved', 'Business configuration and rules updated', 'success');
        await fetchQueueData(currentTenantId);
      }
    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to save config', 'alert');
    }
  };

  // Reset Demo Tickets
  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/reset-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: currentTenantId }),
      });

      if (res.ok) {
        showToast('Reset Complete', 'Demo queue restored to default realistic state', 'success');
        await fetchQueueData(currentTenantId);
        await fetchAuditLogs(currentTenantId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Today's Queue as CSV Report
  const handleExportCSV = () => {
    if (entries.length === 0) {
      showToast('No Data', 'No entries to export in current queue', 'alert');
      return;
    }

    const headers = [
      'Ticket Number',
      'Customer Name',
      'Phone',
      'Priority Score',
      'Queue Department',
      'Status',
      'Estimated Wait (Mins)',
      'Created At',
      'AI Reasoning / Clinical Notes',
    ];

    const rows = entries.map((e) => [
      `"${e.ticketNumber}"`,
      `"${e.userName}"`,
      `"${e.userPhone}"`,
      e.priorityScore,
      `"${e.queueType}"`,
      `"${e.status}"`,
      e.estimatedWaitMinutes,
      `"${e.createdAt}"`,
      `"${(e.aiReasoning || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QueueFlow_${currentTenantId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Complete', "Today's queue data downloaded as CSV", 'success');
  };

  // Active user ticket for the mobile simulator
  const activeUserTicket = entries.find((e) => e.status === 'waiting') || entries[0] || null;
  const activeConsentOffer = consentUpgrades.find((u) => u.status === 'offered') || null;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-zinc-950 text-[#1D1D1F] dark:text-zinc-100 font-sans antialiased transition-colors selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Frosted Glass Atmosphere Blur Orbs (Apple HIG Light Neutral) */}
      <div className="fixed -top-[20%] -left-[10%] w-[600px] h-[600px] bg-blue-200/40 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none z-0" />
      <div className="fixed -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none z-0" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-sky-100/30 dark:bg-purple-950/15 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none z-0" />

      {/* Top Apple HIG Frosted Header */}
      <AppleHeader
        currentTenantId={currentTenantId}
        onSelectTenant={handleSelectTenant}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenAuditLogs={() => setIsAuditSheetOpen(true)}
        onOpenConfig={() => setIsConfigSheetOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onResetDemo={handleResetDemo}
        isLiveConnected={isLiveConnected}
        activeConfig={activeConfig}
      />

      {/* Main Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        <AnimatePresence mode="wait">
          {activeView === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <StaffDashboard
                businessConfig={activeConfig}
                entries={entries}
                stats={stats}
                onAdvanceTicket={handleAdvanceTicket}
                onCancelTicket={handleCancelTicket}
                onTriggerUpgrade={handleTriggerUpgrade}
                onManualIntake={handleSubmitIntake}
                onOpenTicketPass={(t) => setSelectedTicketForPass(t)}
                onExportCSV={handleExportCSV}
              />
            </motion.div>
          )}

          {activeView === 'user' && (
            <motion.div
              key="user"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <UserMobileView
                businessConfig={activeConfig}
                entries={entries}
                activeTicket={activeUserTicket}
                activeConsentOffer={activeConsentOffer}
                onSubmitIntake={handleSubmitIntake}
                onConsentResponse={handleConsentResponse}
                onCancelMyTicket={handleCancelTicket}
                onOpenTicketPass={(t) => setSelectedTicketForPass(t)}
              />
            </motion.div>
          )}

          {activeView === 'waitlist' && (
            <motion.div
              key="waitlist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <WaitlistEngineView
                businessConfig={activeConfig}
                entries={entries}
                consentUpgrades={consentUpgrades}
                mlMetrics={mlMetrics}
                onSimulateNoShow={() => {
                  const waiting = entries.filter((e) => e.status === 'waiting');
                  if (waiting.length > 0) {
                    return handleCancelTicket(waiting[0].id);
                  }
                  return Promise.resolve();
                }}
                onTriggerUpgrade={handleTriggerUpgrade}
                onConsentResponse={handleConsentResponse}
              />
            </motion.div>
          )}

          {activeView === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <VisualSimulatorView
                businessConfig={activeConfig}
                entries={entries}
                onTriggerRealTriage={handleSubmitIntake}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Slide-out Sheets */}
      <AIAuditLogSheet
        isOpen={isAuditSheetOpen}
        onClose={() => setIsAuditSheetOpen(false)}
        logs={auditLogs}
        currentTenantId={currentTenantId}
      />

      <APIConfigSheet
        isOpen={isConfigSheetOpen}
        onClose={() => setIsConfigSheetOpen(false)}
        currentConfig={activeConfig}
        onSaveConfig={handleSaveConfig}
      />

      {/* Spotlight Command Palette (⌘K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        entries={entries}
        currentTenantId={currentTenantId}
        activeConfig={activeConfig}
        onSelectTenant={handleSelectTenant}
        onChangeView={setActiveView}
        onCallNext={() => {
          const waiting = entries.filter((e) => e.status === 'waiting').sort((a, b) => {
            if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          if (waiting.length > 0) {
            handleAdvanceTicket(waiting[0].id);
          }
        }}
        onSimulateNoShow={() => {
          const waiting = entries.filter((e) => e.status === 'waiting');
          if (waiting.length > 0) {
            handleCancelTicket(waiting[0].id);
          }
        }}
        onOpenAuditLogs={() => setIsAuditSheetOpen(true)}
        onOpenConfig={() => setIsConfigSheetOpen(true)}
        onOpenNewIntake={() => setActiveView('staff')}
        onExportCSV={handleExportCSV}
        onSelectTicketPass={(t) => setSelectedTicketForPass(t)}
      />

      {/* Digital Ticket Pass & QR Modal */}
      <DigitalTicketPassModal
        isOpen={selectedTicketForPass !== null}
        onClose={() => setSelectedTicketForPass(null)}
        ticket={selectedTicketForPass}
        businessConfig={activeConfig}
      />

      {/* Floating Tactical Live Toast */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-3xl shadow-2xl backdrop-blur-2xl border max-w-sm flex items-start gap-3 ${
              toastNotification.type === 'upgrade'
                ? 'bg-amber-900/90 text-amber-100 border-amber-500/40'
                : toastNotification.type === 'alert'
                ? 'bg-red-900/90 text-red-100 border-red-500/40'
                : 'bg-zinc-900/95 text-zinc-100 border-zinc-800'
            }`}
          >
            <div className="p-1.5 rounded-xl bg-white/10 shrink-0">
              {toastNotification.type === 'upgrade' ? (
                <Zap className="w-4 h-4 text-amber-400" />
              ) : toastNotification.type === 'alert' ? (
                <Bell className="w-4 h-4 text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            <div className="flex-1 text-xs space-y-0.5">
              <div className="font-bold text-sm tracking-tight">{toastNotification.title}</div>
              <p className="text-zinc-300 leading-relaxed">{toastNotification.message}</p>
            </div>

            <button
              onClick={() => setToastNotification(null)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
