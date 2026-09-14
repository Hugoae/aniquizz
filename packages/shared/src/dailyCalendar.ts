import { DAILY_TIMEZONE } from './dailyConstants';

const pad2 = (value: number): string => String(value).padStart(2, '0');

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedParts = (date: Date, timeZone: string): ZonedParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  let hour = read('hour');
  if (hour === 24) hour = 0;
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour,
    minute: read('minute'),
    second: read('second'),
  };
};

const tzOffsetMs = (date: Date, timeZone: string): number => {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
};

/** Civil YYYY-MM-DD in Europe/Paris (DST-aware). */
export function dailyCalendarDate(now: Date, timeZone = DAILY_TIMEZONE): string {
  const parts = zonedParts(now, timeZone);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** UTC instant of a wall-clock time in the given zone. */
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone = DAILY_TIMEZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = utcGuess - tzOffsetMs(new Date(utcGuess), timeZone);
  instant = utcGuess - tzOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** Add whole civil days to a YYYY-MM-DD calendar date. */
export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  const next = new Date(utc);
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

/** Next Paris midnight after `now` (the moment today's challenge stops being "today"). */
export function dailyResetsAt(now: Date, timeZone = DAILY_TIMEZONE): Date {
  const today = dailyCalendarDate(now, timeZone);
  const next = addCalendarDays(today, 1);
  const [year, month, day] = next.split('-').map(Number);
  return zonedWallTimeToUtc(year, month, day, 0, 0, 0, timeZone);
}
