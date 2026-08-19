import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sliders, X, Check, Save, RotateCcw, AlertCircle, Sparkles, Server, FolderTree, Code2, Database } from 'lucide-react';
import { BusinessConfig, TenantId } from '../types';

interface APIConfigSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: BusinessConfig;
  onSaveConfig: (updatedConfig: BusinessConfig) => Promise<void>;
}

export const APIConfigSheet: React.FC<APIConfigSheetProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'architecture'>('config');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setJsonText(JSON.stringify(currentConfig, null, 2));
      setJsonError(null);
    }
  }, [currentConfig, isOpen]);

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsSaving(true);
      setJsonError(null);
      await onSaveConfig(parsed);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      setJsonError(e.message || 'Invalid JSON syntax');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="w-full max-w-2xl h-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl text-zinc-900 dark:text-zinc-100 shadow-2xl border-l border-white/60 dark:border-white/10 flex flex-col"
          >
            {/* Header (Frosted) */}
            <div className="p-5 border-b border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    API & Stack Architecture — {currentConfig.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    FastAPI Python backend & multi-tenant configuration
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5">
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      activeTab === 'config'
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    JSON Config
                  </button>
                  <button
                    onClick={() => setActiveTab('architecture')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      activeTab === 'architecture'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <FolderTree className="w-3 h-3" />
                    Stack & Structure
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editor Body */}
            {activeTab === 'config' ? (
              <div className="flex-1 p-5 overflow-y-auto space-y-4 font-sans text-xs">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 backdrop-blur-xs">
                  <p className="font-medium">
                    💡 You can modify queue categories, average service durations, hourly multipliers, and Gemini triage guidelines below.
                  </p>
                </div>

                {jsonError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center gap-2 font-mono text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Raw JSON Configuration
                  </label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={20}
                    className="w-full font-mono text-xs p-4 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed shadow-inner"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 p-5 overflow-y-auto space-y-5 font-sans text-xs">
                {/* Structure Breakdown Card */}
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                    <FolderTree className="w-4 h-4 text-blue-500" />
                    Clean Project Structure
                  </div>
                  <div className="font-mono text-[11px] bg-zinc-950 text-emerald-400 p-4 rounded-xl space-y-1 overflow-x-auto">
                    <div>├── <span className="text-blue-400 font-bold">backend/</span> (FastAPI Python Application)</div>
                    <div>│   ├── main.py (App entrypoint & CORS)</div>
                    <div>│   ├── config.py (Settings & Gemini API key)</div>
                    <div>│   ├── requirements.txt (fastapi, uvicorn, pydantic, google-genai)</div>
                    <div>│   ├── api/ (triage.py, queue.py, consent.py, tenants.py)</div>
                    <div>│   ├── models/ (schemas.py Pydantic models)</div>
                    <div>│   └── services/ (gemini_triage.py, ml_demand_engine.py)</div>
                    <div>├── <span className="text-amber-400 font-bold">database/</span> (PostgreSQL & Supabase Models)</div>
                    <div>│   ├── schema.sql (PostgreSQL tables, indexes, realtime pub)</div>
                    <div>│   ├── db.py (Database connection pool)</div>
                    <div>│   └── seed.py (Tenant & initial ticket records)</div>
                    <div>└── <span className="text-purple-400 font-bold">src/</span> (Modern Frontend UI)</div>
                    <div>    ├── components/ (StaffDashboard, UserMobileView, VisualSimulator)</div>
                    <div>    ├── data/ (tenants.ts)</div>
                    <div>    └── utils/ (mlEngine.ts, priority.ts)</div>
                  </div>
                </div>

                {/* FastAPI Routes Overview */}
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
                    <Server className="w-4 h-4 text-emerald-500" />
                    FastAPI Python Endpoints
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-between border border-black/5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">POST /api/triage</span>
                      <span className="text-zinc-500">Gemini LLM Intent & Priority Evaluation</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-between border border-black/5">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">GET /api/queue</span>
                      <span className="text-zinc-500">Fetch Priority Queue & ML Surge Multiplier</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-between border border-black/5">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">POST /api/consent/offer</span>
                      <span className="text-zinc-500">Autonomous No-Show Fast-Pass Promotion</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-between border border-black/5">
                      <span className="text-purple-600 dark:text-purple-400 font-bold">POST /api/consent/respond</span>
                      <span className="text-zinc-500">Accept/Decline Reclaimed Slot</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            {activeTab === 'config' && (
              <div className="p-4 border-t border-white/40 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl flex items-center justify-between">
                <button
                  onClick={() => setJsonText(JSON.stringify(currentConfig, null, 2))}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Changes
                </button>

                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Config Saved!
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs shadow-xs active:scale-95 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Apply Live Config'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
