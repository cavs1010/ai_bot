/**
 * Pure mathematical client-side utility for US Exchange (NYSE/NASDAQ) Market Clock & Holidays
 * Zero network overhead, zero API dependencies.
 */

export interface MarketStatusInfo {
  isOpen: boolean;
  statusText: 'Market Live' | 'Market Closed';
  targetAction: 'Opens' | 'Closes';
  targetDate: Date; // UTC Date object representing target moment
  formattedLocalTime: string; // e.g. "Wed, 11:30 PM AEST"
  formattedETTime: string; // e.g. "Wed, 9:30 AM ET"
  relativeTimeText: string; // e.g. "in 8h 15m"
  formattedNewYorkTime: string; // e.g. "New York (ET): Wed, Aug 19, 09:30 AM EDT"
  localTimezoneShort: string; // e.g. "AEST"
  isLocalTimeDifferent: boolean; // true if user timezone differs from ET
}

/**
 * Calculates Western Easter Sunday for a given year using Meeus/Jones/Butcher algorithm
 */
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Returns the N-th occurrence of a weekday in a given month/year (1-indexed month)
 * weekday: 0 = Sun, 1 = Mon, ..., 6 = Sat
 * n: 1 to 5 (or -1 for last occurrence in month)
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  if (n === -1) {
    // Last occurrence
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let d = lastDayOfMonth; d >= 1; d--) {
      const dayOfWeek = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
      if (dayOfWeek === weekday) return d;
    }
    return lastDayOfMonth;
  }

  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const dateObj = new Date(Date.UTC(year, month - 1, d));
    if (dateObj.getUTCMonth() !== month - 1) break;
    if (dateObj.getUTCDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  return 1;
}

/**
 * Adjusts a fixed-date holiday for weekend observance:
 * Saturday -> Friday before (or Thursday if Friday is already a holiday)
 * Sunday -> Monday after
 */
function getObservedHoliday(year: number, month: number, day: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay();
  if (dayOfWeek === 6) {
    // Saturday -> Friday before
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    return { month: prev.getUTCMonth() + 1, day: prev.getUTCDate() };
  } else if (dayOfWeek === 0) {
    // Sunday -> Monday after
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return { month: next.getUTCMonth() + 1, day: next.getUTCDate() };
  }
  return { month, day };
}

/**
 * Checks if a given YYYY-MM-DD in New York date components is a NYSE/NASDAQ holiday
 */
export function isUSMarketHoliday(year: number, month: number, day: number): boolean {
  // 1. New Year's Day (Jan 1, observed)
  const nyd = getObservedHoliday(year, 1, 1);
  if (nyd.month === month && nyd.day === day) return true;
  // If Jan 1 was a Saturday and observed on Dec 31 of previous year
  if (month === 12 && day === 31) {
    const nextNyd = getObservedHoliday(year + 1, 1, 1);
    if (nextNyd.month === 12 && nextNyd.day === 31) return true;
  }

  // 2. Martin Luther King, Jr. Day (3rd Monday in January)
  const mlkDay = getNthWeekdayOfMonth(year, 1, 1, 3);
  if (month === 1 && day === mlkDay) return true;

  // 3. Washington's Birthday / Presidents' Day (3rd Monday in February)
  const presDay = getNthWeekdayOfMonth(year, 2, 1, 3);
  if (month === 2 && day === presDay) return true;

  // 4. Good Friday (2 days before Easter Sunday)
  const easter = getEasterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  const goodFriday = new Date(easterDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  if (month === goodFriday.getUTCMonth() + 1 && day === goodFriday.getUTCDate()) return true;

  // 5. Memorial Day (Last Monday in May)
  const memDay = getNthWeekdayOfMonth(year, 5, 1, -1);
  if (month === 5 && day === memDay) return true;

  // 6. Juneteenth National Independence Day (June 19, observed)
  const june19 = getObservedHoliday(year, 6, 19);
  if (june19.month === month && june19.day === day) return true;

  // 7. Independence Day (July 4, observed)
  const july4 = getObservedHoliday(year, 7, 4);
  if (july4.month === month && july4.day === day) return true;

  // 8. Labor Day (1st Monday in September)
  const laborDay = getNthWeekdayOfMonth(year, 9, 1, 1);
  if (month === 9 && day === laborDay) return true;

  // 9. Thanksgiving Day (4th Thursday in November)
  const thanksgiving = getNthWeekdayOfMonth(year, 11, 4, 4);
  if (month === 11 && day === thanksgiving) return true;

  // 10. Christmas Day (Dec 25, observed)
  const xmas = getObservedHoliday(year, 12, 25);
  if (xmas.month === month && xmas.day === day) return true;

  return false;
}

/**
 * Gets parts of a Date represented in America/New_York timezone
 */
export function getNewYorkDateTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short'
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // Intl sometimes returns 24:00
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);
  const weekdayShort = map.weekday; // "Mon", "Tue", etc.

  // Determine weekday index (0=Sun, 1=Mon, ..., 6=Sat)
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[weekdayShort] ?? new Date(year, month - 1, day).getDay();

  return { year, month, day, hour, minute, second, weekday, weekdayShort };
}

/**
 * Creates a UTC Date corresponding to a specific local New York (ET) Year, Month, Day, Hour, Minute.
 * Uses binary search / offset deduction to correctly handle Daylight Saving Time (EDT vs EST).
 */
export function createDateFromNewYorkTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  // Approximate UTC time assuming standard EST (-5h) or EDT (-4h)
  // Let's create an initial guess at UTC:
  const guessUtc = Date.UTC(year, month - 1, day, hour + 4, minute, 0);
  const targetDate = new Date(guessUtc);

  // Measure what New York time this guess actually translates to:
  const actualNy = getNewYorkDateTimeParts(targetDate);
  const actualMinutes = actualNy.hour * 60 + actualNy.minute;
  const targetMinutes = hour * 60 + minute;
  
  // Calculate day difference if any
  const actualDays = Date.UTC(actualNy.year, actualNy.month - 1, actualNy.day) / (24 * 60 * 60 * 1000);
  const targetDays = Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000);
  const diffMinutes = (targetDays - actualDays) * 24 * 60 + (targetMinutes - actualMinutes);

  return new Date(targetDate.getTime() + diffMinutes * 60 * 1000);
}

/**
 * Checks if a given date components in ET is a regular market trading day
 */
export function isTradingDay(year: number, month: number, day: number, weekday: number): boolean {
  if (weekday === 0 || weekday === 6) return false; // Weekend
  if (isUSMarketHoliday(year, month, day)) return false; // US Holiday
  return true;
}

/**
 * Returns formatted relative duration (e.g. "in 8h 15m" or "in 45m" or "in 2d 4h")
 */
export function formatRelativeDuration(msDifference: number): string {
  if (msDifference <= 0) return 'now';

  const totalMinutes = Math.floor(msDifference / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `in ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes}m`;
}

/**
 * Detects local timezone abbreviation (e.g. AEST, AEDT, AWST, ACST, EST, PST, etc.)
 */
export function getLocalTimezoneShort(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(new Date());
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : '';
  } catch {
    return '';
  }
}

/**
 * Main Pure Mathematical Calculation for US Market Status
 * @param now Reference timestamp (defaults to current time)
 */
export function calculateMarketStatus(now: Date = new Date()): MarketStatusInfo {
  const nyParts = getNewYorkDateTimeParts(now);
  const currentMinutesInNy = nyParts.hour * 60 + nyParts.minute + nyParts.second / 60;

  const MARKET_OPEN_MINUTES = 9 * 60 + 30; // 09:30 ET (570)
  const MARKET_CLOSE_MINUTES = 16 * 60;    // 16:00 ET (960)

  const isTodayTradingDay = isTradingDay(nyParts.year, nyParts.month, nyParts.day, nyParts.weekday);

  let isOpen = false;
  let targetAction: 'Opens' | 'Closes' = 'Opens';
  let targetDate: Date;

  if (isTodayTradingDay && currentMinutesInNy >= MARKET_OPEN_MINUTES && currentMinutesInNy < MARKET_CLOSE_MINUTES) {
    // Market is currently LIVE
    isOpen = true;
    targetAction = 'Closes';
    targetDate = createDateFromNewYorkTime(nyParts.year, nyParts.month, nyParts.day, 16, 0);
  } else {
    // Market is CLOSED
    isOpen = false;
    targetAction = 'Opens';

    if (isTodayTradingDay && currentMinutesInNy < MARKET_OPEN_MINUTES) {
      // Opens later today at 09:30 AM ET
      targetDate = createDateFromNewYorkTime(nyParts.year, nyParts.month, nyParts.day, 9, 30);
    } else {
      // Find next open market day
      let checkDate = new Date(Date.UTC(nyParts.year, nyParts.month - 1, nyParts.day + 1));
      let found = false;

      // Look ahead up to 14 days
      for (let i = 0; i < 14; i++) {
        const checkYear = checkDate.getUTCFullYear();
        const checkMonth = checkDate.getUTCMonth() + 1;
        const checkDay = checkDate.getUTCDate();
        const checkWeekday = checkDate.getUTCDay();

        if (isTradingDay(checkYear, checkMonth, checkDay, checkWeekday)) {
          targetDate = createDateFromNewYorkTime(checkYear, checkMonth, checkDay, 9, 30);
          found = true;
          break;
        }
        checkDate = new Date(checkDate.getTime() + 24 * 60 * 60 * 1000);
      }

      if (!found) {
        // Fallback safety
        targetDate = createDateFromNewYorkTime(nyParts.year, nyParts.month, nyParts.day + 1, 9, 30);
      }
    }
  }

  // Format Local Time (e.g. "Wed, 11:30 PM" or "Wed, 11:30 PM AEST")
  const localFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const formattedLocalTime = localFormatter.format(targetDate);

  // Format ET Short Time (e.g. "Wed 9:30 AM ET" or "Today 9:30 AM ET")
  const nyShortFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const formattedETTime = `${nyShortFormatter.format(targetDate)} ET`;

  // Format New York Time Tooltip (e.g. "Tue, Aug 18, 09:30 AM EDT")
  const nyTooltipFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
  const formattedNewYorkTime = `New York (ET): ${nyTooltipFormatter.format(targetDate)}`;

  const diffMs = targetDate.getTime() - now.getTime();
  const relativeTimeText = formatRelativeDuration(diffMs);
  const localTimezoneShort = getLocalTimezoneShort();

  // Determine if local timezone is different from New York ET
  const localTzResolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isLocalTimeDifferent = localTzResolved !== 'America/New_York' && formattedETTime !== `${formattedLocalTime} ET`;

  return {
    isOpen,
    statusText: isOpen ? 'Market Live' : 'Market Closed',
    targetAction,
    targetDate,
    formattedLocalTime,
    formattedETTime,
    relativeTimeText,
    formattedNewYorkTime,
    localTimezoneShort,
    isLocalTimeDifferent
  };
}
