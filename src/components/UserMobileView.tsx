import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ArrowUp,
  Brain,
  ShieldCheck,
  ChevronDown,
  Smartphone,
  Flame,
  Zap,
  RotateCcw,
  Volume2,
  XCircle,
  Users,
  Info,
  QrCode,
  Share2,
  BellRing,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BusinessConfig, ConsentUpgrade, QueueEntry, TenantId } from '../types';
import { QueueVisualizer } from './QueueVisualizer';
import { getPriorityInfo, formatEstimatedCallTime } from '../utils/priority';
import { audioAnnouncer } from '../utils/audioAnnouncer';

interface UserMobileViewProps {
  businessConfig: BusinessConfig;
  entries: QueueEntry[];
  activeTicket: QueueEntry | null;
  activeConsentOffer: ConsentUpgrade | null;
  onSubmitIntake: (name: string, phone: string, text: string) => Promise<any>;
  onConsentResponse: (upgradeId: string, response: 'accept' | 'decline') => Promise<void>;
  onCancelMyTicket: (ticketId: string) => Promise<void>;
  onOpenTicketPass?: (ticket: QueueEntry) => void;
}

export const UserMobileView: React.FC<UserMobileViewProps> = ({
  businessConfig,
  entries,
  activeTicket,
  activeConsentOffer,
  onSubmitIntake,
  onConsentResponse,
  onCancelMyTicket,
  onOpenTicketPass,
}) => {
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState('Rahul Varma');
  const [userPhone, setUserPhone] = useState('+1 (555) 392-1084');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentTimeLeft, setConsentTimeLeft] = useState(300); // 5 minutes in seconds
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showQueueVisual, setShowQueueVisual] = useState(true);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Hello! Welcome to ${businessConfig.name}. How can we help you today? Type your request naturally in Hindi, English, Spanish, or any language.`,
      time: 'Just now',
    },
  ]);

  // Real-time ticking clock for dynamic time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Open consent modal automatically when offer arrives for this user or active ticket
  useEffect(() => {
    if (activeConsentOffer && activeConsentOffer.status === 'offered') {
      setShowConsentModal(true);
      const diff = Math.max(0, Math.floor((new Date(activeConsentOffer.expiresAt).getTime() - Date.now()) / 1000));
      setConsentTimeLeft(diff > 0 ? diff : 300);
    } else {
      setShowConsentModal(false);
    }
  }, [activeConsentOffer]);

  // Live countdown timer for consent window
  useEffect(() => {
    if (!showConsentModal) return;
    const interval = setInterval(() => {
      setConsentTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowConsentModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showConsentModal]);

  const quickChips = [
    { label: '💳 "Card stuck in ATM machine"', text: 'Mera card ATM machine mein fas gaya aur screen stuck ho gayi hai!', business: 'metro_bank' },
    { label: '🏥 "Severe chest pain & dizzy"', text: 'Severe tightness in my chest and difficulty breathing since 15 mins.', business: 'apex_clinic' },
    { label: '👶 "Baby high fever 103.5°F"', text: 'My 14-month-old infant has 103.5 F fever and continuous vomiting.', business: 'apex_clinic' },
    { label: '💵 "Exchange 4,500 USD to JPY"', text: 'Need fast currency exchange 4,500 USD to JPY for travel.', business: 'metro_bank' },
    { label: '🏛️ "Emergency passport renewal"', text: 'Need urgent same-day passport renewal for flight tonight.', business: 'civic_hub' },
    { label: '❌ "Cancel my queue ticket"', text: 'Please cancel my queue appointment and release slot.', business: 'all' },
  ];

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: textToSend, time }]);
    setInputText('');
    setIsSubmitting(true);

    try {
      const response = await onSubmitIntake(userName, userPhone, textToSend);
      if (response && response.reply_message) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: response.reply_message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptUpgrade = async () => {
    if (!activeConsentOffer) return;
    try {
      await onConsentResponse(activeConsentOffer.id, 'accept');
      setShowConsentModal(false);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });
      audioAnnouncer.playChime();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeclineUpgrade = async () => {
    if (!activeConsentOffer) return;
    try {
      await onConsentResponse(activeConsentOffer.id, 'decline');
      setShowConsentModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSpeakStatus = () => {
    if (!activeTicket) return;
    const msg = `Hello ${activeTicket.userName}. Your ticket ${activeTicket.ticketNumber} is currently at position ${currentPosition}. Estimated wait time is ${activeTicket.estimatedWaitMinutes} minutes.`;
    audioAnnouncer.speakAnnouncement(msg);
  };

  // Find active ticket position in the sorted queue
  const waitingEntries = entries
    .filter((e) => e.status === 'waiting')
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const currentPosition = activeTicket
    ? waitingEntries.findIndex((e) => e.id === activeTicket.id) + 1
    : 0;

  const peopleAhead = Math.max(0, currentPosition - 1);
  const priorityInfo = activeTicket ? getPriorityInfo(activeTicket.priorityScore) : null;
  const dynamicEstCall = activeTicket ? formatEstimatedCallTime(activeTicket.estimatedWaitMinutes) : '';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex justify-center items-center py-2 px-2">
      {/* Liquid Glass iPhone Mockup Frame */}
      <div className="w-full max-w-md bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border-[8px] border-zinc-900/10 dark:border-white/10 overflow-hidden relative flex flex-col h-[780px]">
        {/* Dynamic Island Notch */}
        <div className="w-full pt-3 pb-2 flex justify-center items-center relative z-20">
          <div className="w-28 h-5 bg-black rounded-full flex items-center justify-between px-2.5 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-blue-500/80 animate-pulse" />
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
          </div>
        </div>

        {/* Mobile Header Bar */}
        <div className="px-5 py-2.5 flex items-center justify-between border-b border-black/5 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xl">{businessConfig.icon}</span>
            <div>
              <h2 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                {businessConfig.name}
              </h2>
              <span className="text-[10px] text-zinc-500 block">AI Mobile Live Pass</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Live Synced
            </span>
          </div>
        </div>

        {/* Scrollable Mobile Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          {/* Active Live Ticket Apple Wallet Style Pass */}
          {activeTicket && priorityInfo ? (
            <motion.div
              layout
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`rounded-3xl p-5 backdrop-blur-2xl border text-center transition-all shadow-md relative overflow-hidden ${
                activeTicket.bumpedUp
                  ? 'border-emerald-400 bg-gradient-to-b from-emerald-50/90 to-white/90 dark:from-emerald-950/40 dark:to-zinc-900/90'
                  : activeTicket.priorityScore >= 5
                  ? 'border-red-400/80 bg-gradient-to-b from-red-50/90 to-white/90 dark:from-red-950/40 dark:to-zinc-900/90'
                  : 'border-white/90 bg-gradient-to-b from-blue-50/70 via-white/80 to-white/90 dark:from-zinc-800/80 dark:to-zinc-900/90'
              }`}
            >
              {/* Dynamic Bumped Notice */}
              {activeTicket.bumpedUp && (
                <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-extrabold shadow-sm animate-bounce">
                  <Zap className="w-3.5 h-3.5" />
                  ⚡ Upgraded to Fast-Pass!
                </div>
              )}

              {/* Ticket Identifier */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Live Queue Pass
                </span>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {activeTicket.userName}
                </span>
              </div>

              <div className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white my-1">
                {activeTicket.ticketNumber}
              </div>

              {/* Big Wait Clock */}
              <div className="my-2 py-2 px-3 rounded-2xl bg-white/60 dark:bg-zinc-800/60 border border-white/80 dark:border-white/10 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  ~{activeTicket.estimatedWaitMinutes} mins estimated wait
                </span>
              </div>

              {/* Position & Priority Grid */}
              <div className="grid grid-cols-2 gap-2 text-left pt-2 text-xs border-t border-black/5 dark:border-white/5">
                <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-white/80 dark:border-white/5">
                  <span className="text-[10px] text-zinc-400 block font-medium">Your Position</span>
                  <span className="font-extrabold text-zinc-900 dark:text-white text-sm">
                    #{currentPosition} in line
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    {peopleAhead === 0 ? 'You are next!' : `${peopleAhead} ahead of you`}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-zinc-800/70 border border-white/80 dark:border-white/5">
                  <span className="text-[10px] text-zinc-400 block font-medium">Priority Tier</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${priorityInfo.dotClass}`} />
                    <span className="font-extrabold text-zinc-900 dark:text-white">
                      {priorityInfo.label} (P{activeTicket.priorityScore})
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block truncate">
                    Est. Turn: {dynamicEstCall}
                  </span>
                </div>
              </div>

              {/* AI Reasoning Pill */}
              <div className="mt-2.5 p-2.5 rounded-2xl bg-white/60 dark:bg-zinc-800/60 text-left border border-black/5 dark:border-white/5 text-[11px] text-zinc-700 dark:text-zinc-300">
                <span className="font-bold text-blue-600 dark:text-blue-400 mr-1">AI Triage:</span>
                {activeTicket.aiReasoning}
              </div>

              {/* Ticket Tools: Wallet Pass & Voice Read */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => onOpenTicketPass && onOpenTicketPass(activeTicket)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Wallet Pass & QR</span>
                </button>

                <button
                  onClick={handleSpeakStatus}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 transition active:scale-95 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Read Status</span>
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Compact Live Queue Line Visualizer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Live Queue Line Strip
              </span>
              <button
                onClick={() => setShowQueueVisual(!showQueueVisual)}
                className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                {showQueueVisual ? 'Hide Line' : 'Show Line'}
              </button>
            </div>

            {showQueueVisual && (
              <QueueVisualizer
                businessConfig={businessConfig}
                entries={entries}
                activeTicketId={activeTicket?.id}
                isStaffView={false}
              />
            )}
          </div>

          {/* Quick Demo Prompts */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block px-1">
              Tap a Natural Scenario
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.text)}
                  className="text-left text-xs px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 border border-white/90 dark:border-white/10 text-zinc-700 dark:text-zinc-300 transition active:scale-95 shadow-2xs backdrop-blur-md cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Stream */}
          <div className="space-y-2.5 pt-1">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-sm font-medium'
                      : 'bg-white/90 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs border border-white/80 dark:border-white/5 shadow-2xs backdrop-blur-md font-medium'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-zinc-400 mt-0.5 px-1">{msg.time}</span>
              </motion.div>
            ))}

            {isSubmitting && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 pl-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px]">Evaluating symptoms & dynamic wait...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar at bottom */}
        <div className="p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-white/40 dark:border-white/10">
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800 rounded-full px-3 py-2 border border-white/90 dark:border-white/10 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/40 backdrop-blur-md">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your symptoms or request in any language..."
              className="flex-1 text-xs bg-transparent focus:outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isSubmitting}
              className="w-7 h-7 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-40 transition active:scale-95 shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Action Sheet: Dynamic No-Show Consent Upgrade Modal */}
      <AnimatePresence>
        {showConsentModal && activeConsentOffer && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-black/10 dark:border-white/10 space-y-4 text-center"
            >
              {/* Header Icon */}
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
                <Zap className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ⚡ 5-Minute Opportunity Window
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-2">
                  An Earlier Slot Just Opened!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  A slot became available ahead of you. You can move up {activeConsentOffer.positionsGained} positions in line!
                </p>
              </div>

              {/* Time Comparison Pill */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 block font-medium">Previous Wait</span>
                  <span className="text-sm font-bold text-zinc-400 line-through">
                    {activeConsentOffer.previousWaitMinutes} mins
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                    ⚡ New Faster Wait
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {activeConsentOffer.newEstimatedWaitMinutes} mins
                  </span>
                </div>
              </div>

              {/* Live Expiration Countdown */}
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span>Offer expires in {formatTimer(consentTimeLeft)}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleAcceptUpgrade}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/30 active:scale-95 cursor-pointer"
                >
                  Accept & Move Up in Line
                </button>
                <button
                  onClick={handleDeclineUpgrade}
                  className="w-full py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                >
                  Keep Current Time
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
