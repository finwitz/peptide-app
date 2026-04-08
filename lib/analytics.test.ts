import { calculateAdherence, calculateStreak, calculateWeeklySummary, calculateAverageTiming } from './analytics';
import type { DoseLog } from './database';

function makeLog(hoursAgo: number, doseMcg: number = 250): DoseLog {
  const date = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return {
    id: Math.random(),
    protocol_id: 1,
    dose_mcg: doseMcg,
    injection_site: null,
    notes: null,
    side_effects: null,
    logged_at: date.toISOString(),
    inventory_id: null,
  };
}

describe('calculateAdherence', () => {
  test('100% adherence when all doses taken', () => {
    // Daily for 7 days = 7 expected, 7 given
    const logs = Array.from({ length: 7 }, (_, i) => makeLog(i * 24));
    expect(calculateAdherence(logs, 1, 7)).toBe(100);
  });

  test('50% adherence when half doses taken', () => {
    const logs = Array.from({ length: 5 }, (_, i) => makeLog(i * 24));
    expect(calculateAdherence(logs, 1, 10)).toBe(50);
  });

  test('0% with no logs', () => {
    expect(calculateAdherence([], 1, 30)).toBe(0);
  });

  test('caps at 100%', () => {
    const logs = Array.from({ length: 20 }, (_, i) => makeLog(i * 12));
    expect(calculateAdherence(logs, 1, 10)).toBe(100);
  });

  test('handles weekly frequency', () => {
    // Weekly for 28 days = 4 expected
    const logs = Array.from({ length: 4 }, (_, i) => makeLog(i * 168));
    expect(calculateAdherence(logs, 7, 28)).toBe(100);
  });
});

describe('calculateStreak', () => {
  test('returns 0 for no logs', () => {
    expect(calculateStreak([], 1)).toEqual({ current: 0, longest: 0 });
  });

  test('current streak of consecutive daily doses', () => {
    const logs = [makeLog(2), makeLog(26), makeLog(50)]; // ~1 day apart
    const result = calculateStreak(logs, 1);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  test('broken streak resets current but keeps longest', () => {
    // 3 recent + gap + 2 old
    const logs = [
      makeLog(2), makeLog(26), makeLog(50), // recent cluster
      // gap of 5 days
      makeLog(50 + 120 + 24), makeLog(50 + 120 + 48), // old cluster
    ];
    const result = calculateStreak(logs, 1);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });
});

describe('calculateWeeklySummary', () => {
  test('groups logs by week', () => {
    const logs = [
      makeLog(24), makeLog(48), // this week
      makeLog(24 * 8), // last week
    ];
    const summary = calculateWeeklySummary(logs);
    expect(summary.length).toBeGreaterThanOrEqual(1);
    expect(summary.reduce((s, w) => s + w.count, 0)).toBe(3);
  });

  test('empty logs returns empty summary', () => {
    expect(calculateWeeklySummary([])).toEqual([]);
  });
});

describe('calculateAverageTiming', () => {
  test('returns null for no logs', () => {
    expect(calculateAverageTiming([])).toBeNull();
  });

  test('calculates average time of day', () => {
    // Create logs at specific times
    const log1 = makeLog(0);
    const log2 = makeLog(0);
    const result = calculateAverageTiming([log1, log2]);
    expect(result).not.toBeNull();
    expect(result!.avgHour).toBeGreaterThanOrEqual(0);
    expect(result!.avgHour).toBeLessThan(24);
    expect(result!.avgMinute).toBeGreaterThanOrEqual(0);
    expect(result!.avgMinute).toBeLessThan(60);
  });
});
