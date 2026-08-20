import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  FileText,
  Filter,
  Gauge,
  Inbox,
  Laptop,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Loader2,
  Menu,
  MoreHorizontal,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sun,
  Sparkles,
  Ticket,
  TimerReset,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type {
  AuditLogEntry,
  BusinessConfig,
  ConsentUpgrade,
  MLModelMetrics,
  QueueEntry,
  QueueStatus,
  TenantId,
} from './types';
import { TENANTS_CONFIG } from './data/tenants';

type ViewKey = 'overview' | 'queue' | 'intake' | 'recovery' | 'insights' | 'settings';
type ToastTone = 'success' | 'warning' | 'error' | 'info';

type QueueResponse = {
  config?: BusinessConfig;
  entries?: QueueEntry[];
  consentUpgrades?: ConsentUpgrade[];
  stats?: Record<string, number>;
  mlMetrics?: MLModelMetrics;
};

type Toast = { title: string; message: string; tone: ToastTone } | null;

const navigation: Array<{ id: ViewKey; label: string; hint: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Overview', hint: 'Today at a glance', icon: LayoutDashboard },
  { id: 'queue', label: 'Live queue', hint: 'Tickets and counters', icon: ListChecks },
  { id: 'intake', label: 'New check-in', hint: 'AI-assisted intake', icon: Ticket },
  { id: 'recovery', label: 'Recovery', hint: 'Consent upgrades', icon: Zap },
  { id: 'insights', label: 'Intelligence', hint: 'ML demand signals', icon: BarChart3 },
  { id: 'settings', label: 'Workspace', hint: 'Rules and preferences', icon: Settings2 },
];

const tenantOrder: TenantId[] = ['metro_bank', 'apex_clinic', 'civic_hub', 'apple_genius'];

const tenantShortNames: Record<TenantId, string> = {
  metro_bank: 'Metro Bank',
  apex_clinic: 'Apex Clinic',
  civic_hub: 'Civic Hub',
  apple_genius: 'Tech Bar',
};

const statusLabels: Record<QueueStatus, string> = {
  waiting: 'Waiting',
  in_progress: 'In service',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusClass: Record<QueueStatus, string> = {
  waiting: 'status-waiting',
  in_progress: 'status-progress',
  completed: 'status-complete',
  cancelled: 'status-cancelled',
};

function formatRelative(dateValue?: string) {
  if (!dateValue || dateValue === 'now') return 'just now';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'recently';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatDate(dateValue?: string) {
  if (!dateValue || dateValue === 'now') return 'Today';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Today';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function queueTypeName(config: BusinessConfig | null, queueType: string) {
  return config?.queueTypes.find((type) => type.id === queueType)?.name || queueType.replaceAll('_', ' ');
}

function priorityLabel(score: number) {
  if (score >= 5) return 'Priority 5';
  if (score >= 4) return 'Priority 4';
  if (score >= 3) return 'Priority 3';
  if (score >= 2) return 'Priority 2';
  return 'Priority 1';
}

function priorityClass(score: number) {
  if (score >= 5) return 'priority-critical';
  if (score >= 4) return 'priority-high';
  if (score >= 3) return 'priority-medium';
  return 'priority-normal';
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.detail || 'Something went wrong.');
  }
  return payload as T;
}

function App() {
  const [tenantId, setTenantId] = useState<TenantId>('metro_bank');
  const [view, setView] = useState<ViewKey>('overview');
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [offers, setOffers] = useState<ConsentUpgrade[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [metrics, setMetrics] = useState<MLModelMetrics | null>(null);
  const [config, setConfig] = useState<BusinessConfig>(TENANTS_CONFIG.metro_bank);
  const [stats, setStats] = useState({ totalWaiting: 0, inProgress: 0, completedToday: 0, cancelledToday: 0, averageWaitMinutes: 0, triageAccuracy: 98.4, noShowRecoveryRate: 92.1 });
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [selectedTicket, setSelectedTicket] = useState<QueueEntry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | QueueStatus>('all');
  const [queueSearch, setQueueSearch] = useState('');
  const [settingsDraft, setSettingsDraft] = useState<BusinessConfig>(TENANTS_CONFIG.metro_bank);
  const [intakeForm, setIntakeForm] = useState({ name: '', phone: '', text: '' });
  const [lastTicket, setLastTicket] = useState<QueueEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => window.localStorage.getItem('queueflow-theme') === 'light' ? 'light' : 'dark');

  useEffect(() => {
    window.localStorage.setItem('queueflow-theme', theme);
  }, [theme]);

  const notify = useCallback((title: string, message: string, tone: ToastTone = 'success') => {
    setToast({ title, message, tone });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const refresh = useCallback(async (targetTenant: TenantId = tenantId, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [queue, logs, modelMetrics] = await Promise.all([
        api<QueueResponse>(`/api/queue?business_id=${targetTenant}`),
        api<{ logs?: AuditLogEntry[] }>(`/api/audit-logs?business_id=${targetTenant}`),
        api<MLModelMetrics>(`/api/ml/metrics?business_id=${targetTenant}`),
      ]);
      const nextConfig = queue.config || TENANTS_CONFIG[targetTenant];
      setConfig(nextConfig);
      setSettingsDraft(nextConfig);
      setEntries(queue.entries || []);
      setOffers(queue.consentUpgrades || []);
      setStats((current) => ({ ...current, ...(queue.stats || {}) }));
      setMetrics(queue.mlMetrics || modelMetrics || null);
      setAuditLogs(logs.logs || []);
    } catch (error) {
      console.error(error);
      if (!silent) notify('Unable to load workspace', error instanceof Error ? error.message : 'The queue service did not respond.', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [notify, tenantId]);

  useEffect(() => {
    void refresh(tenantId);
  }, [refresh, tenantId]);

  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onopen = () => setConnected(true);
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type?: string; data?: { ticket?: QueueEntry; upgrade?: ConsentUpgrade } };
        if (message.type === 'connected') {
          setConnected(true);
          return;
        }
        setConnected(true);
        void refresh(tenantId, true);
        if (message.type === 'ticket_created' && message.data?.ticket?.businessId === tenantId) {
          notify('New ticket added', `${message.data.ticket.ticketNumber} is ready for service.`, 'info');
        }
        if (message.type === 'upgrade_offered' && message.data?.upgrade?.businessId === tenantId) {
          notify('Recovery offer created', `${message.data.upgrade.ticketNumber} has a shorter wait available.`, 'info');
        }
      } catch {
        setConnected(false);
      }
    };
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, [notify, refresh, tenantId]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setView('queue');
        setQueueSearch('');
      }
      if (event.key === 'Escape') setSelectedTicket(null);
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const activeEntries = useMemo(() => entries.filter((entry) => entry.status === 'waiting' || entry.status === 'in_progress'), [entries]);
  const visibleEntries = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesFilter = queueFilter === 'all' || entry.status === queueFilter;
      const matchesSearch = !search || [entry.ticketNumber, entry.userName, entry.userPhone, queueTypeName(config, entry.queueType)].join(' ').toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [config, entries, queueFilter, queueSearch]);
  const offered = useMemo(() => offers.filter((offer) => offer.status === 'offered'), [offers]);
  const currentDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  const selectTenant = (nextTenant: TenantId) => {
    setTenantId(nextTenant);
    setView('overview');
    setMobileNavOpen(false);
    notify('Workspace changed', `Now viewing ${tenantShortNames[nextTenant]}.`, 'info');
  };

  const runAction = async (id: string, action: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await action();
      await refresh(tenantId, true);
    } catch (error) {
      notify('Action could not be completed', error instanceof Error ? error.message : 'Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const advanceTicket = (entry: QueueEntry) => runAction(entry.id, async () => {
    await api('/api/queue/advance', { method: 'POST', body: JSON.stringify({ queue_entry_id: entry.id }) });
    notify('Ticket completed', `${entry.ticketNumber} has been marked complete.`);
    setSelectedTicket(null);
  });

  const cancelTicket = (entry: QueueEntry) => runAction(entry.id, async () => {
    const result = await api<{ upgradeOffer?: ConsentUpgrade }>('/api/queue/cancel', { method: 'POST', body: JSON.stringify({ queue_entry_id: entry.id }) });
    notify('Ticket cancelled', result.upgradeOffer ? 'A recovery offer was sent to the next eligible customer.' : 'The queue has been updated.', 'warning');
    setSelectedTicket(null);
  });

  const triggerUpgrade = () => runAction('trigger-upgrade', async () => {
    const result = await api<{ status: string; upgrade?: ConsentUpgrade; message?: string }>('/api/queue/trigger-upgrade', { method: 'POST', body: JSON.stringify({ business_id: tenantId }) });
    notify(result.upgrade ? 'Recovery offer created' : 'No eligible candidates', result.upgrade ? `${result.upgrade.ticketNumber} can move ahead by ${result.upgrade.positionsGained} positions.` : result.message || 'There are no waiting candidates right now.', result.upgrade ? 'success' : 'info');
  });

  const respondToOffer = (offer: ConsentUpgrade, response: 'accept' | 'decline') => runAction(offer.id, async () => {
    await api('/api/queue/consent-response', { method: 'POST', body: JSON.stringify({ upgrade_id: offer.id, response }) });
    notify(response === 'accept' ? 'Upgrade accepted' : 'Offer declined', response === 'accept' ? `${offer.ticketNumber} is now estimated at ${offer.newEstimatedWaitMinutes} minutes.` : 'The offer will cascade to another eligible customer.', response === 'accept' ? 'success' : 'warning');
  });

  const submitIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!intakeForm.text.trim()) {
      notify('Describe the request first', 'The AI triage agent needs a short description to route the customer.', 'warning');
      return;
    }
    setBusyId('intake');
    try {
      const result = await api<{ ticket?: QueueEntry; reply_message?: string; triage?: { priority_score: number; queue_type: string } }>('/api/intake', {
        method: 'POST',
        body: JSON.stringify({ business_id: tenantId, ...intakeForm }),
      });
      if (result.ticket) {
        setLastTicket(result.ticket);
        setIntakeForm({ name: '', phone: '', text: '' });
        notify('Check-in complete', `${result.ticket.ticketNumber} was routed to ${queueTypeName(config, result.ticket.queueType)}.`, 'success');
      }
    } catch (error) {
      notify('Check-in failed', error instanceof Error ? error.message : 'Please review the customer details and try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const resetDemo = () => runAction('reset', async () => {
    await api('/api/demo/reset', { method: 'POST', body: JSON.stringify({ business_id: tenantId }) });
    notify('Demo data reset', 'The workspace has been restored to its seeded queue state.', 'info');
  });

  const saveSettings = () => runAction('settings', async () => {
    await api('/api/config', { method: 'PUT', body: JSON.stringify({ business_id: tenantId, config: settingsDraft }) });
    setConfig(settingsDraft);
    notify('Workspace saved', 'Triage instructions and operating thresholds are live.');
  });

  const exportCsv = () => {
    const headers = ['Ticket', 'Customer', 'Phone', 'Queue', 'Status', 'Priority', 'Wait minutes', 'Created'];
    const rows = entries.map((entry) => [entry.ticketNumber, entry.userName, entry.userPhone, queueTypeName(config, entry.queueType), statusLabels[entry.status], entry.priorityScore, entry.estimatedWaitMinutes, entry.createdAt].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `queueflow-${tenantId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Export ready', 'Today’s queue has been downloaded as a CSV file.', 'success');
  };

  const openView = (nextView: ViewKey) => {
    setView(nextView);
    setMobileNavOpen(false);
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'} ${mobileNavOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span /></div>
          {sidebarOpen && <div><div className="brand-name">queueflow</div><div className="brand-caption">Service orchestration</div></div>}
          <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar">
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-select">
          <span className="tenant-icon" style={{ background: config.primaryColor }}>{config.icon}</span>
          {sidebarOpen && <span className="workspace-name">{tenantShortNames[tenantId]}</span>}
          <ChevronDown size={15} className="muted-icon" />
          <select aria-label="Switch workspace" value={tenantId} onChange={(event) => selectTenant(event.target.value as TenantId)}>
            {tenantOrder.map((id) => <option key={id} value={id}>{tenantShortNames[id]}</option>)}
          </select>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return <button key={item.id} className={`nav-item ${active ? 'nav-item-active' : ''}`} onClick={() => openView(item.id)} title={sidebarOpen ? undefined : item.label}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {sidebarOpen && <span className="nav-copy"><strong>{item.label}</strong><small>{item.hint}</small></span>}
              {item.id === 'recovery' && offered.length > 0 && <span className="nav-badge">{offered.length}</span>}
            </button>;
          })}
        </nav>
        {sidebarOpen && <div className="sidebar-bottom">
          <div className="mini-status"><span className={connected ? 'live-dot' : 'live-dot offline'} /> <span>{connected ? 'Live sync enabled' : 'Reconnecting…'}</span></div>
          <div className="sidebar-help"><CircleHelp size={16} /><div><strong>Need a hand?</strong><span>Open the playbook</span></div><ChevronRight size={14} /></div>
        </div>}
      </aside>

      <main className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumb"><span>Operations</span><ChevronRight size={14} /><strong>{navigation.find((item) => item.id === view)?.label}</strong></div>
          <div className="topbar-actions">
            <button className="command-button" onClick={() => { setView('queue'); setQueueSearch(''); }}><Command size={15} /><span>Find anything</span><kbd>⌘ K</kbd></button>
            <div className="topbar-divider" />
            <button className="theme-toggle" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'dark'}>{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span></button>
            <button className="icon-button" onClick={() => notify('You’re all caught up', 'Live notifications will appear here as the queue changes.', 'info')} aria-label="Notifications"><Bell size={18} /><span className="notification-dot" /></button>
            <button className="avatar-button" onClick={() => openView('settings')} aria-label="Open workspace settings"><span>JS</span></button>
          </div>
        </header>

        <div className="content-area">
          <div className="page-header">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{currentDate}</div>
              <h1>{view === 'overview' ? 'Good morning, Jordan.' : navigation.find((item) => item.id === view)?.label}</h1>
              <p>{view === 'overview' ? `A calm view of ${config.name}'s service flow.` : navigation.find((item) => item.id === view)?.hint}</p>
            </div>
            <div className="page-actions">
              <button className="secondary-button" onClick={() => { setIsRefreshing(true); void refresh(tenantId, true); }} disabled={isRefreshing}><RefreshCw size={15} className={isRefreshing ? 'spin' : ''} /> Refresh</button>
              <button className="primary-button" onClick={() => openView('intake')}><Ticket size={15} /> New check-in</button>
            </div>
          </div>

          {loading ? <LoadingState /> : <>
            {view === 'overview' && <OverviewView config={config} stats={stats} entries={activeEntries} offers={offered} logs={auditLogs} onView={openView} onSelectTicket={setSelectedTicket} onAdvance={advanceTicket} busyId={busyId} />}
            {view === 'queue' && <QueueView config={config} entries={visibleEntries} queueFilter={queueFilter} setQueueFilter={setQueueFilter} search={queueSearch} setSearch={setQueueSearch} onSelectTicket={setSelectedTicket} onAdvance={advanceTicket} onCancel={cancelTicket} onExport={exportCsv} busyId={busyId} />}
            {view === 'intake' && <IntakeView config={config} form={intakeForm} setForm={setIntakeForm} onSubmit={submitIntake} busy={busyId === 'intake'} lastTicket={lastTicket} onOpenQueue={() => openView('queue')} />}
            {view === 'recovery' && <RecoveryView offers={offers} logs={auditLogs} onTrigger={triggerUpgrade} onRespond={respondToOffer} onSelectTicket={(ticketNumber) => setSelectedTicket(entries.find((entry) => entry.ticketNumber === ticketNumber) || null)} busyId={busyId} />}
            {view === 'insights' && <InsightsView config={config} metrics={metrics} stats={stats} entries={entries} />}
            {view === 'settings' && <SettingsView config={config} draft={settingsDraft} setDraft={setSettingsDraft} onSave={saveSettings} onReset={resetDemo} busyId={busyId} />}
          </>}
        </div>
      </main>

      {selectedTicket && <TicketDrawer entry={selectedTicket} config={config} onClose={() => setSelectedTicket(null)} onAdvance={advanceTicket} onCancel={cancelTicket} busyId={busyId} />}
      {toast && <ToastMessage toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function LoadingState() {
  return <div className="loading-state"><div className="loading-orbit"><Loader2 size={20} /></div><strong>Loading your workspace</strong><span>Syncing queue, signals, and recovery state.</span></div>;
}

function OverviewView({ config, stats, entries, offers, logs, onView, onSelectTicket, onAdvance, busyId }: { config: BusinessConfig; stats: Record<string, number>; entries: QueueEntry[]; offers: ConsentUpgrade[]; logs: AuditLogEntry[]; onView: (view: ViewKey) => void; onSelectTicket: (entry: QueueEntry) => void; onAdvance: (entry: QueueEntry) => void; busyId: string | null }) {
  const activeOffer = offers[0];
  return <div className="view-stack">
    <section className="hero-grid">
      <div className="hero-card">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-label"><span className="live-dot" /> LIVE SERVICE FLOW</div>
          <h2>Keep the line<br /><em>moving.</em></h2>
          <p>QueueFlow is quietly balancing priority, wait time, and customer consent in the background.</p>
          <button className="hero-link" onClick={() => onView('queue')}>Open live queue <ArrowUpRight size={16} /></button>
        </div>
        <div className="hero-orb"><Gauge size={26} /><span>Healthy</span><small>Flow quality</small></div>
      </div>
      <div className="metric-grid">
        <MetricCard label="Waiting now" value={stats.totalWaiting} suffix="people" icon={<Users size={17} />} accent="blue" trend="+2 since 9:00" trendUp />
        <MetricCard label="Average wait" value={`${stats.averageWaitMinutes}m`} icon={<Clock3 size={17} />} accent="violet" trend="12% faster" trendUp />
        <MetricCard label="In service" value={stats.inProgress} suffix="counter" icon={<Activity size={17} />} accent="mint" trend="On schedule" />
        <MetricCard label="Recovery rate" value={`${stats.noShowRecoveryRate}%`} icon={<Zap size={17} />} accent="amber" trend="+4.6% this week" trendUp />
      </div>
    </section>

    <section className="content-grid content-grid-main">
      <div className="panel queue-preview-panel">
        <PanelHeader title="Queue at a glance" subtitle="The next people to serve" action={<button className="text-button" onClick={() => onView('queue')}>View all <ChevronRight size={14} /></button>} />
        <div className="queue-list">
          {entries.length === 0 ? <EmptyState icon={<CheckCircle2 size={22} />} title="A quiet moment" text="No active tickets need attention right now." /> : entries.slice(0, 5).map((entry, index) => <QueueRow key={entry.id} entry={entry} config={config} index={index} onClick={() => onSelectTicket(entry)} onAdvance={onAdvance} busy={busyId === entry.id} />)}
        </div>
      </div>
      <div className="side-stack">
        <div className="panel recovery-card">
          <PanelHeader title="Recovery center" subtitle="Turn open slots into trust" action={<button className="icon-button small" onClick={() => onView('recovery')} aria-label="Open recovery"><ArrowUpRight size={15} /></button>} />
          {activeOffer ? <div className="offer-summary"><div className="offer-icon"><Zap size={18} /></div><div><strong>{activeOffer.ticketNumber} can move ahead</strong><span>Save {activeOffer.previousWaitMinutes - activeOffer.newEstimatedWaitMinutes} minutes · {activeOffer.positionsGained} positions</span></div><button className="mini-action" onClick={() => onView('recovery')}>Review</button></div> : <div className="empty-inline"><CheckCircle2 size={17} /><span>No offers waiting for a decision.</span></div>}
        </div>
        <div className="panel activity-card">
          <PanelHeader title="Recent activity" subtitle="A transparent service log" action={<button className="text-button" onClick={() => onView('recovery')}>See log <ChevronRight size={14} /></button>} />
          <div className="activity-list">{logs.slice(0, 4).map((log) => <ActivityRow key={log.id} log={log} />)}</div>
        </div>
      </div>
    </section>
    <section className="insight-strip">
      <div className="insight-icon"><Sparkles size={18} /></div><div><strong>AI triage is doing its job.</strong><span>{stats.triageAccuracy}% routing accuracy across today’s requests, with every recommendation available in the audit log.</span></div><button className="text-button" onClick={() => onView('insights')}>Explore signals <ArrowUpRight size={14} /></button>
    </section>
  </div>;
}

function MetricCard({ label, value, suffix, icon, accent, trend, trendUp }: { label: string; value: string | number; suffix?: string; icon: ReactNode; accent: string; trend: string; trendUp?: boolean }) {
  return <div className={`metric-card metric-${accent}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value} <small>{suffix}</small></div><div className={`metric-trend ${trendUp ? 'trend-up' : ''}`}>{trendUp ? <TrendingUp size={13} /> : <span className="trend-dot" />}{trend}</div></div>;
}

function QueueView({ config, entries, queueFilter, setQueueFilter, search, setSearch, onSelectTicket, onAdvance, onCancel, onExport, busyId }: { config: BusinessConfig; entries: QueueEntry[]; queueFilter: 'all' | QueueStatus; setQueueFilter: (value: 'all' | QueueStatus) => void; search: string; setSearch: (value: string) => void; onSelectTicket: (entry: QueueEntry) => void; onAdvance: (entry: QueueEntry) => void; onCancel: (entry: QueueEntry) => void; onExport: () => void; busyId: string | null }) {
  return <div className="view-stack"><div className="panel queue-panel"><div className="queue-toolbar"><div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets or customers" /><kbd>⌘ K</kbd></div><div className="toolbar-actions"><div className="filter-wrap"><Filter size={15} /><select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as 'all' | QueueStatus)} aria-label="Filter queue"><option value="all">All tickets</option><option value="waiting">Waiting</option><option value="in_progress">In service</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><button className="secondary-button" onClick={onExport}><ArrowDownToLine size={15} /> Export</button></div></div><div className="queue-table-wrap"><table className="queue-table"><thead><tr><th>Ticket</th><th>Customer</th><th>Service</th><th>Priority</th><th>Wait</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{entries.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<Inbox size={22} />} title="No tickets found" text="Try changing the filter or search phrase." /></td></tr> : entries.map((entry) => <tr key={entry.id} onClick={() => onSelectTicket(entry)}><td><div className="ticket-cell"><span className="ticket-dot" style={{ background: config.primaryColor }} /><strong>{entry.ticketNumber}</strong>{entry.bumpedUp && <span className="tiny-pill"><Zap size={11} /> Upgraded</span>}</div></td><td><div className="customer-cell"><div className="customer-avatar">{entry.userName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{entry.userName}</strong><span>{entry.userPhone}</span></div></div></td><td><span className="service-name">{queueTypeName(config, entry.queueType)}</span></td><td><span className={`priority-pill ${priorityClass(entry.priorityScore)}`}>{priorityLabel(entry.priorityScore)}</span></td><td><strong className="wait-number">{entry.estimatedWaitMinutes}m</strong><span className="table-muted"> est.</span></td><td><span className={`status-pill ${statusClass[entry.status]}`}><span />{statusLabels[entry.status]}</span></td><td><div className="table-actions" onClick={(event) => event.stopPropagation()}>{entry.status === 'waiting' || entry.status === 'in_progress' ? <button className="row-action" onClick={() => onAdvance(entry)} disabled={busyId === entry.id}>{busyId === entry.id ? <Loader2 size={14} className="spin" /> : <Check size={14} />}<span>Complete</span></button> : <button className="icon-button small" onClick={() => onSelectTicket(entry)} aria-label="Open ticket details"><MoreHorizontal size={16} /></button>}<button className="icon-button small" onClick={() => onSelectTicket(entry)} aria-label="Open ticket details"><ChevronRight size={15} /></button></div></td></tr>)}</tbody></table></div><div className="table-footer"><span>Showing {entries.length} ticket{entries.length === 1 ? '' : 's'}</span><span><span className="live-dot" /> Auto-updates when the queue changes</span></div></div><div className="queue-note"><ShieldCheck size={17} /><div><strong>Priority stays explainable.</strong><span>Every ticket is routed with a reason, confidence score, and wait-time estimate you can review in the ticket detail panel.</span></div></div></div>;
}

function QueueRow({ entry, config, index, onClick, onAdvance, busy }: { key?: string; entry: QueueEntry; config: BusinessConfig; index: number; onClick: () => void; onAdvance: (entry: QueueEntry) => void; busy: boolean }) {
  return <div className="queue-row" onClick={onClick} style={{ animationDelay: `${index * 45}ms` }}><div className="queue-position">{entry.status === 'in_progress' ? <Play size={13} fill="currentColor" /> : entry.positionInQueue || index + 1}</div><div className="queue-person"><div className="customer-avatar">{entry.userName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{entry.userName}</strong><span>{entry.ticketNumber} · {queueTypeName(config, entry.queueType)}</span></div></div><div className="queue-wait"><strong>{entry.estimatedWaitMinutes}m</strong><span>estimated</span></div><span className={`priority-pill ${priorityClass(entry.priorityScore)}`}>{entry.priorityScore >= 4 ? <Zap size={11} /> : null}{priorityLabel(entry.priorityScore)}</span><button className="icon-button small row-chevron" onClick={(event) => { event.stopPropagation(); onAdvance(entry); }} aria-label="Complete ticket" disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}</button></div>;
}

function IntakeView({ config, form, setForm, onSubmit, busy, lastTicket, onOpenQueue }: { config: BusinessConfig; form: { name: string; phone: string; text: string }; setForm: (form: { name: string; phone: string; text: string }) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean; lastTicket: QueueEntry | null; onOpenQueue: () => void }) {
  return <div className="intake-layout"><div className="panel intake-panel"><div className="intake-heading"><div className="section-icon section-icon-blue"><Sparkles size={18} /></div><div><span className="eyebrow">AI-ASSISTED CHECK-IN</span><h2>Start with the customer’s words.</h2><p>QueueFlow will identify the right service, priority, and estimated wait. Keep the note natural.</p></div></div><form className="intake-form" onSubmit={onSubmit}><div className="form-grid"><label><span>Customer name <small>Optional</small></span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Maya Patel" /></label><label><span>Phone number <small>Optional</small></span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 018-2044" /></label></div><label><span>What do they need help with?</span><textarea value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder={`“I need to ${config.queueTypes[0]?.name.toLowerCase() || 'speak to someone'}…”`} rows={6} /></label><div className="suggestion-row"><span>Try a sample</span>{config.queueTypes.slice(0, 3).map((type) => <button type="button" key={type.id} onClick={() => setForm({ ...form, text: `I need help with ${type.name.toLowerCase()}.` })}>{type.name.split(' & ')[0]}</button>)}</div><div className="form-footer"><span><ShieldCheck size={14} /> No sensitive information is stored in the browser.</span><button className="primary-button" type="submit" disabled={busy}>{busy ? <><Loader2 size={15} className="spin" /> Routing…</> : <><Send size={15} /> Route request</>}</button></div></form></div><div className="intake-side"><div className="panel principles-card"><div className="panel-kicker">DESIGNED FOR TRUST</div><h3>Clarity before complexity.</h3><p>The AI suggests a route, but the reason stays visible. Staff can always review or override the outcome from the ticket detail.</p><div className="principle-list"><div><span className="principle-number">01</span><strong>Listen first</strong><small>Natural language works better than rigid forms.</small></div><div><span className="principle-number">02</span><strong>Explain the why</strong><small>Priority and confidence travel with every ticket.</small></div><div><span className="principle-number">03</span><strong>Keep moving</strong><small>Wait-time estimates refresh as service progresses.</small></div></div></div>{lastTicket && <div className="panel ticket-result"><div className="result-top"><span className="result-check"><Check size={17} /></span><div><span className="eyebrow">CHECK-IN CONFIRMED</span><h3>{lastTicket.ticketNumber}</h3></div></div><div className="result-grid"><div><span>Service</span><strong>{queueTypeName(config, lastTicket.queueType)}</strong></div><div><span>Estimated wait</span><strong>{lastTicket.estimatedWaitMinutes} min</strong></div><div><span>Priority</span><strong>{priorityLabel(lastTicket.priorityScore)}</strong></div><div><span>Confidence</span><strong>{Math.round(lastTicket.confidence * 100)}%</strong></div></div><button className="secondary-button full-button" onClick={onOpenQueue}>View in queue <ArrowUpRight size={15} /></button></div>}</div></div>;
}

function RecoveryView({ offers, logs, onTrigger, onRespond, onSelectTicket, busyId }: { offers: ConsentUpgrade[]; logs: AuditLogEntry[]; onTrigger: () => void; onRespond: (offer: ConsentUpgrade, response: 'accept' | 'decline') => void; onSelectTicket: (ticketNumber: string) => void; busyId: string | null }) {
  const activeOffers = offers.filter((offer) => offer.status === 'offered');
  return <div className="view-stack"><section className="recovery-hero"><div><div className="hero-label"><Zap size={14} /> CONSENT-BASED RECOVERY</div><h2>Make every open slot<br /><em>feel fair.</em></h2><p>When a customer drops out, QueueFlow offers the freed capacity to the next eligible person—only with their consent.</p></div><button className="primary-button light-button" onClick={onTrigger} disabled={busyId === 'trigger-upgrade'}>{busyId === 'trigger-upgrade' ? <Loader2 size={15} className="spin" /> : <Zap size={15} />} Find next opportunity</button></section><div className="recovery-stats"><div><span>Offers waiting</span><strong>{activeOffers.length}</strong><small>Need a response</small></div><div><span>Recovery rate</span><strong>92.1%</strong><small><TrendingUp size={13} /> 4.6% this week</small></div><div><span>Avg. time saved</span><strong>{activeOffers.length ? `${Math.round(activeOffers.reduce((sum, offer) => sum + offer.previousWaitMinutes - offer.newEstimatedWaitMinutes, 0) / activeOffers.length)}m` : '—'}</strong><small>From accepted offers</small></div></div><section className="content-grid content-grid-main"><div className="panel"><PanelHeader title="Offers requiring attention" subtitle="Each offer expires after five minutes" />{activeOffers.length === 0 ? <EmptyState icon={<CheckCircle2 size={22} />} title="No pending offers" text="Trigger a recovery opportunity after a cancellation or wait for the next open slot." /> : <div className="offer-list">{activeOffers.map((offer) => <OfferCard key={offer.id} offer={offer} onRespond={onRespond} onSelect={() => onSelectTicket(offer.ticketNumber)} busy={busyId === offer.id} />)}</div>}</div><div className="panel"><PanelHeader title="Recovery activity" subtitle="What the engine decided" /><div className="activity-list recovery-log">{logs.filter((log) => ['CONSENT_OFFERED', 'CONSENT_ACCEPTED', 'NO_SHOW_DETECTED', 'MANUAL_OVERRIDE'].includes(log.eventType)).slice(0, 7).map((log) => <ActivityRow key={log.id} log={log} />)}</div></div></section></div>;
}

function OfferCard({ offer, onRespond, onSelect, busy }: { key?: string; offer: ConsentUpgrade; onRespond: (offer: ConsentUpgrade, response: 'accept' | 'decline') => void; onSelect: () => void; busy: boolean }) {
  const saved = offer.previousWaitMinutes - offer.newEstimatedWaitMinutes;
  return <div className="offer-card"><div className="offer-card-top"><div className="offer-icon"><Zap size={18} /></div><div><div className="offer-ticket" onClick={onSelect}>{offer.ticketNumber} <ArrowUpRight size={13} /></div><strong>{offer.userName}</strong></div><span className="expires-pill"><Clock3 size={12} /> Expires {formatRelative(offer.expiresAt)}</span></div><div className="offer-compare"><div><span>Current wait</span><strong>{offer.previousWaitMinutes} min</strong></div><ArrowUpRight size={18} /><div className="offer-new"><span>New estimate</span><strong>{offer.newEstimatedWaitMinutes} min</strong></div><div className="saved-time"><span>Save</span><strong>{saved} min</strong></div></div><p>{offer.reasonForVacancy}</p><div className="offer-actions"><button className="secondary-button" onClick={() => onRespond(offer, 'decline')} disabled={busy}>Keep place</button><button className="primary-button" onClick={() => onRespond(offer, 'accept')} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Accept upgrade</button></div></div>;
}

function InsightsView({ config, metrics, stats, entries }: { config: BusinessConfig; metrics: MLModelMetrics | null; stats: Record<string, number>; entries: QueueEntry[] }) {
  const trends = metrics?.hourlyTrends || [];
  const maxVolume = Math.max(...trends.map((trend) => trend.historicalVolume), 1);
  return <div className="view-stack"><div className="insights-grid"><div className="panel model-card"><div className="model-header"><div className="section-icon section-icon-violet"><Sparkles size={18} /></div><div><span className="eyebrow">PREDICTIVE OPERATIONS</span><h2>Signals, not noise.</h2></div><span className="model-live"><span className="live-dot" /> Live model</span></div><p className="model-description">QueueFlow combines service time, current demand, and priority to keep estimates honest as the day unfolds.</p><div className="model-metrics"><div><span>Model</span><strong>{metrics?.modelName || 'QueueFlow ML'}</strong><small>v{metrics?.version || '2.0'}</small></div><div><span>Mean error</span><strong>{metrics?.meanAbsoluteErrorMinutes || 1.8} min</strong><small>Lower is better</small></div><div><span>R² score</span><strong>{metrics?.r2Score || 0.94}</strong><small>Fit quality</small></div></div><div className="factor-box"><div className="factor-ring"><strong>{metrics?.currentTimeOfDayFactor?.toFixed(2) || '1.18'}×</strong><span>current factor</span></div><div><strong>Demand is {metrics && metrics.currentTimeOfDayFactor > 1.2 ? 'above' : 'near'} baseline.</strong><span>{metrics?.currentPeakFactorExplanation || 'The current estimate includes time-of-day demand and the active queue mix.'}</span></div></div></div><div className="panel coverage-card"><PanelHeader title="Operating coverage" subtitle="Today’s quality indicators" /><div className="coverage-row"><div className="coverage-donut" style={{ '--coverage': `${stats.triageAccuracy}%` } as CSSProperties}><strong>{stats.triageAccuracy}%</strong><span>triage accuracy</span></div><div className="coverage-bars"><div><span>Routing confidence</span><strong>{Math.round((entries.reduce((sum, entry) => sum + entry.confidence, 0) / Math.max(entries.length, 1)) * 100)}%</strong><div className="progress-track"><i style={{ width: `${Math.round((entries.reduce((sum, entry) => sum + entry.confidence, 0) / Math.max(entries.length, 1)) * 100)}%` }} /></div></div><div><span>Recovery success</span><strong>{stats.noShowRecoveryRate}%</strong><div className="progress-track amber"><i style={{ width: `${stats.noShowRecoveryRate}%` }} /></div></div></div></div></div></div><div className="panel demand-chart"><PanelHeader title="Demand by hour" subtitle={`${config.name} · historical volume and current multiplier`} action={<span className="chart-legend"><i /> Volume <i className="legend-factor" /> Multiplier</span>} /><div className="chart-area">{trends.length === 0 ? <EmptyState icon={<BarChart3 size={22} />} title="Waiting for signal" text="Hourly trend data will appear here when the model responds." /> : trends.map((trend) => <div className="chart-column" key={trend.hour}><div className="chart-bars"><span className="volume-bar" style={{ height: `${Math.max(8, (trend.historicalVolume / maxVolume) * 100)}%` }} /><span className="factor-bar" style={{ height: `${Math.max(8, Math.min(100, trend.factor * 55))}%` }} /></div><span>{trend.label}</span></div>)}</div></div></div>;
}

function SettingsView({ config, draft, setDraft, onSave, onReset, busyId }: { config: BusinessConfig; draft: BusinessConfig; setDraft: (config: BusinessConfig) => void; onSave: () => void; onReset: () => void; busyId: string | null }) {
  return <div className="settings-layout"><div className="panel settings-main"><PanelHeader title="Workspace rules" subtitle="These settings shape how QueueFlow triages and estimates service." /><div className="settings-section"><div className="settings-section-heading"><div><h3>Service profile</h3><p>Shown to staff and used by the wait-time model.</p></div><span className="settings-badge">{config.id}</span></div><div className="form-grid"><label><span>Workspace name</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Base service time <small>Minutes</small></span><input type="number" min={1} value={draft.baseServiceMinutes} onChange={(event) => setDraft({ ...draft, baseServiceMinutes: Number(event.target.value) })} /></label><label><span>Emergency threshold <small>Priority score</small></span><input type="number" min={1} max={5} value={draft.emergencyThreshold} onChange={(event) => setDraft({ ...draft, emergencyThreshold: Number(event.target.value) })} /></label><label><span>Accent color</span><div className="color-field"><input type="color" value={draft.primaryColor} onChange={(event) => setDraft({ ...draft, primaryColor: event.target.value })} /><span>{draft.primaryColor}</span></div></label></div></div><div className="settings-section"><div className="settings-section-heading"><div><h3>AI triage instructions</h3><p>Keep the agent’s operating principles explicit and reviewable.</p></div><Sparkles size={17} className="muted-icon" /></div><textarea className="settings-textarea" rows={7} value={draft.systemTriageInstructions} onChange={(event) => setDraft({ ...draft, systemTriageInstructions: event.target.value })} /></div><div className="settings-footer"><span><ShieldCheck size={14} /> Changes are saved to the live in-memory workspace.</span><button className="primary-button" onClick={onSave} disabled={busyId === 'settings'}>{busyId === 'settings' ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Save workspace</button></div></div><div className="settings-side"><div className="panel"><PanelHeader title="Service lanes" subtitle="Configured for this workspace" /><div className="lane-list">{draft.queueTypes.map((lane) => <div className="lane-row" key={lane.id}><span className="lane-swatch" style={{ background: lane.color === 'red' ? '#f15c5c' : lane.color === 'blue' ? '#5b8def' : lane.color === 'green' ? '#36b37e' : '#9b83f5' }} /><div><strong>{lane.name}</strong><span>{lane.avgServiceMinutes} min average · Priority {lane.defaultPriority}</span></div><ChevronRight size={15} /></div>)}</div></div><div className="panel danger-panel"><div className="panel-kicker">DEMO CONTROLS</div><h3>Reset the sandbox</h3><p>Return the queue to its seeded data without affecting the workspace rules above.</p><button className="secondary-button" onClick={onReset} disabled={busyId === 'reset'}><RefreshCw size={15} /> Reset demo data</button></div></div></div>;
}

function TicketDrawer({ entry, config, onClose, onAdvance, onCancel, busyId }: { entry: QueueEntry; config: BusinessConfig; onClose: () => void; onAdvance: (entry: QueueEntry) => void; onCancel: (entry: QueueEntry) => void; busyId: string | null }) {
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="ticket-drawer" onMouseDown={(event) => event.stopPropagation()}><div className="drawer-header"><div><span className="eyebrow">TICKET DETAIL</span><h2>{entry.ticketNumber}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close details"><X size={18} /></button></div><div className="drawer-status"><span className={`status-pill ${statusClass[entry.status]}`}><span />{statusLabels[entry.status]}</span><span className={`priority-pill ${priorityClass(entry.priorityScore)}`}>{priorityLabel(entry.priorityScore)}</span></div><div className="drawer-person"><div className="customer-avatar large">{entry.userName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><h3>{entry.userName}</h3><span>{entry.userPhone}</span></div></div><div className="drawer-facts"><div><span>Service lane</span><strong>{queueTypeName(config, entry.queueType)}</strong></div><div><span>Position</span><strong>{entry.positionInQueue ? `#${entry.positionInQueue}` : '—'}</strong></div><div><span>Estimated wait</span><strong>{entry.estimatedWaitMinutes} min</strong></div><div><span>Checked in</span><strong>{formatDate(entry.createdAt)}</strong></div></div><div className="drawer-section"><div className="drawer-section-title"><FileText size={15} /><span>Customer note</span></div><p className="quote-text">“{entry.intakeText}”</p></div><div className="drawer-section"><div className="drawer-section-title"><Sparkles size={15} /><span>Why QueueFlow routed it this way</span></div><p>{entry.aiReasoning}</p><div className="confidence-row"><span>AI confidence</span><strong>{Math.round(entry.confidence * 100)}%</strong><div className="progress-track"><i style={{ width: `${entry.confidence * 100}%` }} /></div></div></div><div className="drawer-section"><div className="drawer-section-title"><TimerReset size={15} /><span>Timing model</span></div><div className="model-line"><span>Time-of-day factor</span><strong>{entry.mlTimeFactor.toFixed(2)}×</strong></div><div className="model-line"><span>Detected language</span><strong>{entry.language}</strong></div></div><div className="drawer-footer">{entry.status === 'waiting' || entry.status === 'in_progress' ? <><button className="secondary-button" onClick={() => onCancel(entry)} disabled={busyId === entry.id}><X size={15} /> Cancel</button><button className="primary-button" onClick={() => onAdvance(entry)} disabled={busyId === entry.id}>{busyId === entry.id ? <Loader2 size={15} className="spin" /> : <Check size={15} />} Complete ticket</button></> : <button className="secondary-button full-button" onClick={onClose}>Close details</button>}</div></aside></div>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="panel-header"><div><h3>{title}</h3><span>{subtitle}</span></div>{action}</div>;
}

function ActivityRow({ log }: { key?: string; log: AuditLogEntry }) {
  const detail = log.details?.ticketNumber || log.details?.userName || 'QueueFlow';
  const eventLabel = log.eventType.replaceAll('_', ' ').toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
  return <div className="activity-row"><span className={`activity-icon activity-${log.eventType.toLowerCase()}`}><Activity size={13} /></span><div><strong>{eventLabel}</strong><span>{detail}</span></div><time>{formatRelative(log.timestamp)}</time></div>;
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><span>{text}</span></div>;
}

function ToastMessage({ toast, onClose }: { toast: Exclude<Toast, null>; onClose: () => void }) {
  const Icon = toast.tone === 'error' ? AlertCircle : toast.tone === 'warning' ? TimerReset : toast.tone === 'info' ? Activity : CheckCircle2;
  return <div className={`toast toast-${toast.tone}`}><span className="toast-icon"><Icon size={16} /></span><div><strong>{toast.title}</strong><span>{toast.message}</span></div><button className="icon-button small" onClick={onClose} aria-label="Dismiss notification"><X size={14} /></button></div>;
}

export default App;
