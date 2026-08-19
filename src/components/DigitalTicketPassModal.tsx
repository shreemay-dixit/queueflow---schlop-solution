import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  QrCode,
  Smartphone,
  Share2,
  Copy,
  Check,
  Printer,
  Clock,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { QueueEntry, BusinessConfig } from '../types';
import { getPriorityInfo } from '../utils/priority';

interface DigitalTicketPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: QueueEntry | null;
  businessConfig: BusinessConfig;
}

export const DigitalTicketPassModal: React.FC<DigitalTicketPassModalProps> = ({
  isOpen,
  onClose,
  ticket,
  businessConfig,
}) => {
  const [copied, setCopied] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'pass' | 'sms' | 'qr'>('pass');

  if (!ticket) return null;

  const priorityStyle = getPriorityInfo(ticket.priorityScore);
  const shareableUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://queueflow.app'}?ticket=${ticket.id}&tenant=${ticket.businessId}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleSendSMS = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 3500);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 dark:border-white/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-white/60 dark:bg-zinc-800/60 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Digital Queue Pass & Sharing
                  </h3>
                  <p className="text-xs text-zinc-500">Apple Wallet pass, SMS link & live QR</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="px-6 pt-3 flex items-center gap-1 border-b border-black/5 dark:border-white/5">
              <button
                onClick={() => setActiveTab('pass')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                  activeTab === 'pass'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Apple Wallet Pass
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                  activeTab === 'qr'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Live QR Code
              </button>
              <button
                onClick={() => setActiveTab('sms')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
                  activeTab === 'sms'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                SMS Dispatch
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-5">
              {activeTab === 'pass' && (
                <div className="relative p-6 rounded-3xl bg-linear-to-b from-zinc-900 via-zinc-850 to-zinc-950 text-white shadow-xl border border-zinc-700/60 overflow-hidden space-y-5">
                  {/* Top Bar with Logo & Tenant */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{businessConfig.icon}</span>
                      <div>
                        <div className="text-xs font-bold tracking-wide uppercase text-zinc-400">
                          {businessConfig.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">{businessConfig.tagline}</div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        ticket.priorityScore === 5
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {priorityStyle.label}
                    </span>
                  </div>

                  {/* Big Ticket Number & Position */}
                  <div className="flex items-baseline justify-between border-y border-zinc-800/80 py-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                        Ticket Number
                      </div>
                      <div className="text-3xl font-extrabold tracking-tight text-white">
                        {ticket.ticketNumber}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">{ticket.userName}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                        Est. Wait Time
                      </div>
                      <div className="text-2xl font-bold text-emerald-400 flex items-center justify-end gap-1">
                        <Clock className="w-4 h-4" />
                        {ticket.estimatedWaitMinutes}m
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Pos #{ticket.positionInQueue || 1} in line
                      </div>
                    </div>
                  </div>

                  {/* AI Triage Explanatory Snippet */}
                  <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400">
                      <Sparkles className="w-3 h-3" />
                      AI Routing Notes
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {ticket.aiReasoning}
                    </p>
                  </div>

                  {/* Apple Barcode Graphics */}
                  <div className="pt-2 flex flex-col items-center justify-center gap-2">
                    <div className="w-full h-12 bg-white rounded-lg p-2 flex items-center justify-center gap-1">
                      {/* Stylized Barcode lines */}
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-full bg-black"
                          style={{
                            width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2.5)}px`,
                            opacity: i % 7 === 0 ? 0.4 : 1,
                          }}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 tracking-widest uppercase">
                      ID: {ticket.id}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'qr' && (
                <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 space-y-4 text-center">
                  <div className="p-4 bg-white rounded-2xl shadow-md border border-zinc-200 inline-block">
                    {/* SVG High Resolution QR Code Pattern */}
                    <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none">
                      <rect width="100" height="100" fill="white" />
                      {/* Corner Position Boxes */}
                      <rect x="10" y="10" width="24" height="24" fill="black" />
                      <rect x="14" y="14" width="16" height="16" fill="white" />
                      <rect x="18" y="18" width="8" height="8" fill="black" />

                      <rect x="66" y="10" width="24" height="24" fill="black" />
                      <rect x="70" y="14" width="16" height="16" fill="white" />
                      <rect x="74" y="18" width="8" height="8" fill="black" />

                      <rect x="10" y="66" width="24" height="24" fill="black" />
                      <rect x="14" y="70" width="16" height="16" fill="white" />
                      <rect x="18" y="74" width="8" height="8" fill="black" />

                      {/* Random Grid Data Pixels for Ticket ID */}
                      <rect x="42" y="12" width="6" height="6" fill="black" />
                      <rect x="52" y="18" width="6" height="6" fill="black" />
                      <rect x="42" y="32" width="8" height="8" fill="black" />
                      <rect x="54" y="44" width="8" height="8" fill="black" />
                      <rect x="22" y="44" width="10" height="8" fill="black" />
                      <rect x="68" y="44" width="6" height="12" fill="black" />
                      <rect x="44" y="64" width="8" height="8" fill="black" />
                      <rect x="70" y="70" width="14" height="6" fill="black" />
                      <rect x="56" y="80" width="8" height="8" fill="black" />
                      <rect x="36" y="76" width="6" height="12" fill="black" />
                      <rect x="80" y="58" width="8" height="8" fill="black" />
                      <rect x="12" y="52" width="8" height="6" fill="black" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">
                      Scan to track on Customer Mobile
                    </div>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                      No app download required. Opens instant live web queue card with real-time push alerts.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'sms' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-black/5 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        SMS Delivery Preview
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {ticket.userPhone}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-blue-500 text-white text-xs leading-relaxed shadow-xs">
                      Hello {ticket.userName}! Your ticket #{ticket.ticketNumber} for{' '}
                      {businessConfig.name} is confirmed. Est. wait: ~{ticket.estimatedWaitMinutes}m (Position #{ticket.positionInQueue || 1}). Track live: {shareableUrl}
                    </div>

                    <button
                      onClick={handleSendSMS}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {smsSent ? (
                        <>
                          <Check className="w-4 h-4" /> SMS Dispatched Successfully!
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4" /> Send Instant SMS Notification
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Link Copied!' : 'Copy Live Link'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Ticket
                  </button>

                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-black shadow-xs transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
