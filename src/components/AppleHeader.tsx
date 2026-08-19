import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2,
  Terminal,
  Sliders,
  RotateCcw,
  Radio,
  Smartphone,
  LayoutDashboard,
  GitPullRequest,
  Sparkles,
  Zap,
  Activity,
  Search,
  Volume2,
  VolumeX,
  Command,
} from 'lucide-react';
import { AppView, BusinessConfig, TenantId } from '../types';
import { TENANTS_CONFIG } from '../data/tenants';
import { audioAnnouncer } from '../utils/audioAnnouncer';

interface AppleHeaderProps {
  currentTenantId: TenantId;
  onSelectTenant: (id: TenantId) => void;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenAuditLogs: () => void;
  onOpenConfig: () => void;
  onResetDemo: () => void;
  onOpenCommandPalette: () => void;
  isLiveConnected: boolean;
  activeConfig: BusinessConfig;
}

export const AppleHeader: React.FC<AppleHeaderProps> = ({
  currentTenantId,
  onSelectTenant,
  activeView,
  onChangeView,
  onOpenAuditLogs,
  onOpenConfig,
  onResetDemo,
  onOpenCommandPalette,
  isLiveConnected,
  activeConfig,
}) => {
  const tenantsList = Object.values(TENANTS_CONFIG);
  const [isMuted, setIsMuted] = useState(audioAnnouncer.getMuted());

  const handleToggleSound = () => {
    const next = audioAnnouncer.toggleMute();
    setIsMuted(next);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/80 dark:border-white/[0.08] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* Left: Brand + Tenant Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-black shadow-xs">
              <div className="w-3.5 h-3.5 border-2 border-white dark:border-black rounded-xs" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
                  QueueFlow
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/30 uppercase tracking-wider">
                  Universal AI
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Tenant Switcher (Frosted Apple Glass Pill) */}
          <div className="relative">
            <select
              value={currentTenantId}
              onChange={(e) => onSelectTenant(e.target.value as TenantId)}
              className="appearance-none bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold pl-3 pr-8 py-1.5 rounded-xl border border-white/90 dark:border-white/10 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition focus:outline-none focus:ring-2 focus:ring-blue-500/40 backdrop-blur-md"
            >
              {tenantsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name.split('&')[0]}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-500">
              <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Center: View Switcher (Segmented Control - Frosted Apple HIG) */}
        <div className="hidden md:flex items-center p-1 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-white/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
          <button
            onClick={() => onChangeView('staff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeView === 'staff'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Staff Dashboard</span>
          </button>

          <button
            onClick={() => onChangeView('user')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeView === 'user'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>User Mobile App</span>
          </button>

          <button
            onClick={() => onChangeView('waitlist')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeView === 'waitlist'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Waitlist Engine</span>
          </button>

          <button
            onClick={() => onChangeView('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeView === 'simulator'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>Visual Simulator</span>
          </button>
        </div>

        {/* Right: Quick Command Palette & Tool Actions */}
        <div className="flex items-center gap-2">
          {/* Spotlight Command Search Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 border border-white/90 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-zinc-600 dark:text-zinc-300 text-xs font-medium transition cursor-pointer"
            title="Open Command Palette (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Search / Commands</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-black/5 dark:bg-white/10 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Sound Announcer Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isMuted
                ? 'bg-zinc-100 text-zinc-400 border-zinc-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}
            title={isMuted ? 'Unmute voice announcements' : 'Mute voice announcements'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* AI Audit Logs Button */}
          <button
            onClick={onOpenAuditLogs}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors bg-white/70 dark:bg-zinc-800/60 border border-white/90 dark:border-white/10 shadow-xs cursor-pointer"
            title="Open AI Audit Log Sheet"
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* API Config Button */}
          <button
            onClick={onOpenConfig}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors bg-white/70 dark:bg-zinc-800/60 border border-white/90 dark:border-white/10 shadow-xs cursor-pointer"
            title="Open API & Tenant Config"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={onResetDemo}
            className="p-2 rounded-xl text-zinc-500 hover:bg-white dark:hover:bg-zinc-800 transition-colors bg-white/70 dark:bg-zinc-800/60 border border-white/90 dark:border-white/10 shadow-xs cursor-pointer"
            title="Reset to Default Demo Tickets"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sub Navigation Bar */}
      <div className="md:hidden flex items-center justify-around px-4 py-2 border-t border-white/40 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
        <button
          onClick={() => onChangeView('staff')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activeView === 'staff' ? 'bg-black text-white' : 'text-zinc-600'
          }`}
        >
          Staff
        </button>
        <button
          onClick={() => onChangeView('user')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activeView === 'user' ? 'bg-black text-white' : 'text-zinc-600'
          }`}
        >
          Mobile
        </button>
        <button
          onClick={() => onChangeView('waitlist')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activeView === 'waitlist' ? 'bg-black text-white' : 'text-zinc-600'
          }`}
        >
          Waitlist
        </button>
        <button
          onClick={() => onChangeView('simulator')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
            activeView === 'simulator' ? 'bg-black text-white' : 'text-zinc-600'
          }`}
        >
          Simulator
        </button>
      </div>
    </header>
  );
};
