import { STORAGE_KEYS } from '../utils/storageUtils';

const STORAGE_KEY = STORAGE_KEYS.STREAK;

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalActiveDays: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentStreak: 0, longestStreak: 0, lastActiveDate: '', totalActiveDays: 0 };
}

export function recordActivity(): StreakData {
  const data = getStreakData();
  const today = todayStr();

  if (data.lastActiveDate === today) return data;

  const isConsecutive = data.lastActiveDate === yesterdayStr();
  const newStreak = isConsecutive ? data.currentStreak + 1 : 1;

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(data.longestStreak, newStreak),
    lastActiveDate: today,
    totalActiveDays: data.totalActiveDays + 1,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
