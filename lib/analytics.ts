import type { DoseLog } from './database';

export function calculateAdherence(
  logs: DoseLog[],
  frequencyDays: number,
  periodDays: number,
): number {
  if (frequencyDays <= 0 || periodDays <= 0) return 0;
  const expectedDoses = Math.floor(periodDays / frequencyDays);
  if (expectedDoses <= 0) return logs.length > 0 ? 100 : 0;
  return Math.min(100, Math.round((logs.length / expectedDoses) * 100));
}

export function calculateStreak(
  logs: DoseLog[],
  frequencyDays: number,
): { current: number; longest: number } {
  if (logs.length === 0 || frequencyDays <= 0) return { current: 0, longest: 0 };

  const sorted = [...logs].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
  );

  const windowMs = frequencyDays * 24 * 60 * 60 * 1000 * 1.5; // 1.5x grace
  const now = Date.now();
  let current = 0;
  let longest = 0;
  let streak = 0;

  // Check if most recent dose is within the current window
  const lastDoseTime = new Date(sorted[0].logged_at).getTime();
  if (now - lastDoseTime > windowMs) {
    // Streak is broken — walk history for longest only
    current = 0;
  }

  for (let i = 0; i < sorted.length; i++) {
    const thisTime = new Date(sorted[i].logged_at).getTime();
    if (i === 0) {
      streak = 1;
    } else {
      const prevTime = new Date(sorted[i - 1].logged_at).getTime();
      const gap = prevTime - thisTime;
      if (gap <= windowMs) {
        streak++;
      } else {
        if (i <= current || current === 0) {
          // Still counting current streak
        }
        longest = Math.max(longest, streak);
        streak = 1;
      }
    }
  }
  longest = Math.max(longest, streak);

  // Current streak: count from most recent backward while on-time
  if (now - lastDoseTime <= windowMs) {
    current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const gap = new Date(sorted[i - 1].logged_at).getTime() - new Date(sorted[i].logged_at).getTime();
      if (gap <= windowMs) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}

export interface WeeklySummary {
  weekStart: string;
  count: number;
  totalMcg: number;
}

export function calculateWeeklySummary(logs: DoseLog[]): WeeklySummary[] {
  const weeks = new Map<string, { count: number; totalMcg: number }>();

  for (const log of logs) {
    const d = new Date(log.logged_at);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const weekStart = new Date(d.setDate(diff)).toISOString().split('T')[0];

    const existing = weeks.get(weekStart) ?? { count: 0, totalMcg: 0 };
    existing.count++;
    existing.totalMcg += log.dose_mcg;
    weeks.set(weekStart, existing);
  }

  return Array.from(weeks.entries())
    .map(([weekStart, data]) => ({ weekStart, ...data }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function calculateAverageTiming(logs: DoseLog[]): { avgHour: number; avgMinute: number } | null {
  if (logs.length === 0) return null;

  let totalMinutes = 0;
  for (const log of logs) {
    const d = new Date(log.logged_at);
    totalMinutes += d.getHours() * 60 + d.getMinutes();
  }

  const avg = totalMinutes / logs.length;
  return {
    avgHour: Math.floor(avg / 60),
    avgMinute: Math.round(avg % 60),
  };
}
