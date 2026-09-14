import type {
  DailyLeaderboardResponse,
  DailyRevealDto,
  DailyResultDto,
  DailySafeRoundDto,
  DailyTodayResponse,
} from '@aniquizz/shared';
import { dailyCalendarDate } from '@aniquizz/shared';
import { supabase } from './supabase';
import { serverApiBase } from './env';

const API_BASE = serverApiBase();
const TODAY_STORAGE_KEY = 'aniquizz.daily.today';

export class DailyApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DailyApiError';
  }
}

let todayCache: DailyTodayResponse | null = readStoredToday();
let todayInflight: Promise<DailyTodayResponse> | null = null;

function stripLegacyPlayPayload(data: DailyTodayResponse): DailyTodayResponse {
  const rest = { ...data } as DailyTodayResponse & { attempt?: unknown };
  delete rest.attempt;
  return { ...rest, openAttemptId: rest.openAttemptId ?? null };
}

function readStoredToday(): DailyTodayResponse | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(TODAY_STORAGE_KEY);
    if (!raw) return null;
    const data = stripLegacyPlayPayload(JSON.parse(raw) as DailyTodayResponse);
    if (data.challengeDate !== dailyCalendarDate(new Date())) {
      sessionStorage.removeItem(TODAY_STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function persistToday(data: DailyTodayResponse | null): void {
  todayCache = data ? stripLegacyPlayPayload(data) : null;
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (!todayCache) sessionStorage.removeItem(TODAY_STORAGE_KEY);
    else sessionStorage.setItem(TODAY_STORAGE_KEY, JSON.stringify(todayCache));
  } catch {
    /* private mode / quota */
  }
}

function cacheIsFresh(data: DailyTodayResponse | null): data is DailyTodayResponse {
  return Boolean(data && data.challengeDate === dailyCalendarDate(new Date()));
}

export function invalidateDailyToday(): void {
  persistToday(null);
  todayInflight = null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep HTTP fallback */
    }
    throw new DailyApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

const loadToday = (refresh = false): Promise<DailyTodayResponse> => {
  if (!refresh && cacheIsFresh(todayCache)) return Promise.resolve(todayCache);
  if (!cacheIsFresh(todayCache)) persistToday(null);
  if (todayInflight) return todayInflight;
  todayInflight = request<DailyTodayResponse>('/daily/today')
    .then((data) => {
      persistToday(data);
      return data;
    })
    .finally(() => {
      todayInflight = null;
    });
  return todayInflight;
};

export const dailyApi = {
  peekToday: (): DailyTodayResponse | null => (cacheIsFresh(todayCache) ? todayCache : null),
  today: (opts?: { refresh?: boolean }) => loadToday(opts?.refresh === true),
  start: () => {
    invalidateDailyToday();
    return request<{ attempt: DailySafeRoundDto | null; result: DailyResultDto | null; status: string }>(
      '/daily/attempt',
      { method: 'POST' },
    );
  },
  answer: (attemptId: string, selected: string | null) =>
    request<{ reveal: DailyRevealDto | null; result: DailyResultDto | null; finished: boolean }>(
      `/daily/attempt/${attemptId}/answer`,
      { method: 'POST', body: JSON.stringify({ selected }) },
    ),
  next: (attemptId: string) =>
    request<{ attempt: DailySafeRoundDto | null; result: DailyResultDto | null; status: string }>(
      `/daily/attempt/${attemptId}/next`,
      { method: 'POST' },
    ),
  forfeit: (attemptId: string) => {
    invalidateDailyToday();
    return request<{ result: DailyResultDto }>(`/daily/attempt/${attemptId}/forfeit`, { method: 'POST' });
  },
  /** Best-effort abandon on tab close — keepalive so the request survives unload. */
  forfeitKeepalive: (attemptId: string) => {
    invalidateDailyToday();
    void supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      void fetch(`${API_BASE}/daily/attempt/${attemptId}/forfeit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
      });
    });
  },
  leaderboard: () => request<DailyLeaderboardResponse>('/daily/leaderboard'),
};
