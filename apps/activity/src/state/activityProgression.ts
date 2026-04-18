// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

export interface ActivityBadge {
  id: 'room-warmup' | 'crowd-reader' | 'clean-escape' | 'squad-ride';
  label: string;
  detail: string;
  unlockedAt: number;
}

export interface ActivityProgression {
  currentTitle: string;
  dailyStreak: number;
  weeklyClout: number;
  promptsPlayed: number;
  promptsCleared: number;
  crowdReadsUsed: number;
  lastActiveDay: string | null;
  weekKey: string;
  badges: ActivityBadge[];
}

interface ProgressionRoundResultInput {
  at?: number;
  survived: boolean;
  usedCrowdRead: boolean;
}

interface ProgressionPromptStartInput {
  at?: number;
  participantCount: number;
}

const STORAGE_KEY = 'tiltcheck.activity.progression.v1';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function getDayKey(at: number): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getWeekKey(at: number): string {
  const date = new Date(at);
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (localMidnight.getDay() + 6) % 7;
  localMidnight.setDate(localMidnight.getDate() - mondayOffset);
  return getDayKey(localMidnight.getTime());
}

function getDayDifference(previousDay: string, nextDay: string): number {
  const [previousYear, previousMonth, previousDate] = previousDay.split('-').map(Number);
  const [nextYear, nextMonth, nextDate] = nextDay.split('-').map(Number);
  const previous = new Date(previousYear, previousMonth - 1, previousDate).getTime();
  const next = new Date(nextYear, nextMonth - 1, nextDate).getTime();
  return Math.round((next - previous) / MS_PER_DAY);
}

function getEmptyProgression(at = Date.now()): ActivityProgression {
  return {
    currentTitle: 'Warm Body',
    dailyStreak: 0,
    weeklyClout: 0,
    promptsPlayed: 0,
    promptsCleared: 0,
    crowdReadsUsed: 0,
    lastActiveDay: null,
    weekKey: getWeekKey(at),
    badges: [],
  };
}

function normalizeProgression(base: ActivityProgression, at: number): ActivityProgression {
  const today = getDayKey(at);
  const weekKey = getWeekKey(at);
  let dailyStreak = base.dailyStreak;
  let weeklyClout = base.weeklyClout;

  if (base.weekKey !== weekKey) {
    weeklyClout = 0;
  }

  if (base.lastActiveDay !== today) {
    if (!base.lastActiveDay) {
      dailyStreak = 1;
    } else if (getDayDifference(base.lastActiveDay, today) === 1) {
      dailyStreak += 1;
    } else {
      dailyStreak = 1;
    }
  }

  const normalized: ActivityProgression = {
    ...base,
    dailyStreak,
    weeklyClout,
    lastActiveDay: today,
    weekKey,
  };

  return {
    ...normalized,
    currentTitle: getProgressionTitle(normalized),
  };
}

function unlockBadge(
  progression: ActivityProgression,
  id: ActivityBadge['id'],
  label: string,
  detail: string,
  at: number,
): ActivityProgression {
  if (progression.badges.some((badge) => badge.id === id)) {
    return progression;
  }

  return {
    ...progression,
    badges: [...progression.badges, { id, label, detail, unlockedAt: at }],
  };
}

export function getProgressionTitle(progression: Pick<ActivityProgression, 'dailyStreak' | 'weeklyClout' | 'promptsCleared' | 'badges'>): string {
  if (progression.dailyStreak >= 7 || progression.weeklyClout >= 18) {
    return 'Recap Captain';
  }

  if (progression.weeklyClout >= 10 || progression.promptsCleared >= 5) {
    return 'Room Glue';
  }

  if (progression.weeklyClout >= 6 || progression.promptsCleared >= 3) {
    return 'Tilt Scout';
  }

  if (progression.weeklyClout >= 1) {
    return 'Fresh Spark';
  }

  return 'Warm Body';
}

export function loadActivityProgression(): ActivityProgression {
  if (typeof localStorage === 'undefined') {
    return getEmptyProgression();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getEmptyProgression();
    }

    const parsed = JSON.parse(raw) as Partial<ActivityProgression>;
    const merged: ActivityProgression = {
      ...getEmptyProgression(),
      ...parsed,
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };

    return {
      ...merged,
      currentTitle: getProgressionTitle(merged),
    };
  } catch {
    return getEmptyProgression();
  }
}

export function saveActivityProgression(progression: ActivityProgression): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
  } catch {
    // Ignore local persistence failures. The activity still runs fine without storage.
  }
}

export function recordProgressionPromptStart(
  base: ActivityProgression,
  input: ProgressionPromptStartInput,
): ActivityProgression {
  const at = input.at ?? Date.now();
  let next = normalizeProgression(base, at);

  next = {
    ...next,
    promptsPlayed: next.promptsPlayed + 1,
    weeklyClout: next.weeklyClout + (input.participantCount >= 4 ? 2 : 1),
  };

  next = unlockBadge(next, 'room-warmup', 'Room Warmup', 'You jumped into the party loop and got the room moving.', at);

  if (input.participantCount >= 4) {
    next = unlockBadge(next, 'squad-ride', 'Squad Ride', 'You kept a full room moving instead of lurking in a dead lobby.', at);
  }

  return {
    ...next,
    currentTitle: getProgressionTitle(next),
  };
}

export function recordProgressionRoundResult(
  base: ActivityProgression,
  input: ProgressionRoundResultInput,
): ActivityProgression {
  const at = input.at ?? Date.now();
  let next = normalizeProgression(base, at);

  next = {
    ...next,
    promptsCleared: next.promptsCleared + (input.survived ? 1 : 0),
    crowdReadsUsed: next.crowdReadsUsed + (input.usedCrowdRead ? 1 : 0),
    weeklyClout: next.weeklyClout + (input.survived ? 2 : 1),
  };

  if (input.usedCrowdRead) {
    next = unlockBadge(next, 'crowd-reader', 'Crowd Reader', 'You checked the room read before locking a call.', at);
  }

  if (next.promptsCleared >= 3) {
    next = unlockBadge(next, 'clean-escape', 'Clean Escape', 'You cleared three prompts without the loop folding on you.', at);
  }

  return {
    ...next,
    currentTitle: getProgressionTitle(next),
  };
}

export function recordProgressionRecapVisit(base: ActivityProgression, at = Date.now()): ActivityProgression {
  const next = normalizeProgression(base, at);
  const updated: ActivityProgression = {
    ...next,
    weeklyClout: next.weeklyClout + 1,
  };

  return {
    ...updated,
    currentTitle: getProgressionTitle(updated),
  };
}
