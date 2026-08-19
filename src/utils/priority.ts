import { PriorityTier } from '../types';

export interface PriorityInfo {
  tier: 'urgent' | 'medium' | 'normal';
  score: number;
  label: string;
  badgeLabel: string;
  colorName: 'red' | 'orange' | 'green';
  bgClass: string;
  bgLightClass: string;
  borderClass: string;
  textClass: string;
  dotClass: string;
  badgeClass: string;
  pillClass: string;
  ringClass: string;
  barColor: string;
}

/**
 * Universal 3-Priority Color Classifier
 * - Priority 5: Red (Urgent)
 * - Priority 3 - 4: Orange (Medium)
 * - Priority 1 - 2: Green (Normal)
 */
export function getPriorityInfo(score: number): PriorityInfo {
  const safeScore = Math.max(1, Math.min(5, Math.round(score || 3)));

  if (safeScore >= 5) {
    return {
      tier: 'urgent',
      score: safeScore,
      label: 'Urgent',
      badgeLabel: 'P5 • Urgent',
      colorName: 'red',
      bgClass: 'bg-red-500',
      bgLightClass: 'bg-red-50 dark:bg-red-950/40',
      borderClass: 'border-red-400/60 dark:border-red-500/40',
      textClass: 'text-red-700 dark:text-red-300',
      dotClass: 'bg-red-500',
      badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
      pillClass: 'bg-red-500 text-white',
      ringClass: 'ring-red-400/30',
      barColor: '#ef4444',
    };
  }

  if (safeScore >= 3) {
    return {
      tier: 'medium',
      score: safeScore,
      label: 'Medium',
      badgeLabel: `P${safeScore} • Medium`,
      colorName: 'orange',
      bgClass: 'bg-orange-500',
      bgLightClass: 'bg-orange-50 dark:bg-orange-950/40',
      borderClass: 'border-orange-400/60 dark:border-orange-500/40',
      textClass: 'text-orange-700 dark:text-orange-300',
      dotClass: 'bg-orange-500',
      badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      pillClass: 'bg-orange-500 text-white',
      ringClass: 'ring-orange-400/30',
      barColor: '#f97316',
    };
  }

  return {
    tier: 'normal',
    score: safeScore,
    label: 'Normal',
    badgeLabel: `P${safeScore} • Normal`,
    colorName: 'green',
    bgClass: 'bg-emerald-500',
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-400/60 dark:border-emerald-500/40',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    pillClass: 'bg-emerald-500 text-white',
    ringClass: 'ring-emerald-400/30',
    barColor: '#10b981',
  };
}

/**
 * Formats a dynamic clock time given remaining wait minutes from now
 */
export function formatEstimatedCallTime(minutesFromNow: number): string {
  const targetDate = new Date(Date.now() + Math.max(1, minutesFromNow) * 60000);
  return targetDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Formats seconds into mm:ss
 */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
