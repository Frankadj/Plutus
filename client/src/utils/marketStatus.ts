type MarketStatus = {
  isOpen: boolean;
  shortText: string;
  countdownText: string;
};

const ACCRA_TIMEZONE = "Africa/Accra";
const OPEN_HOUR = 10;
const CLOSE_HOUR = 15;

// Add Ghana market holidays here in YYYY-MM-DD format.
// Update this list whenever needed.
const HOLIDAYS = new Set([
  "2026-01-01",
  "2026-03-06",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-07-01",
  "2026-09-21",
  "2026-12-25",
  "2026-12-26",
]);

type AccraParts = {
  weekday: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayKey: string;
};

function getAccraParts(date = new Date()): AccraParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TIMEZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>;

  return {
    weekday: values.weekday || "",
    year: Number(values.year || 0),
    month: Number(values.month || 0),
    day: Number(values.day || 0),
    hour: Number(values.hour || 0),
    minute: Number(values.minute || 0),
    dayKey: `${values.year || "0000"}-${values.month || "00"}-${values.day || "00"}`,
  };
}

function buildAccraUtcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

function isWeekendByWeekday(weekday: string) {
  return weekday === "Sat" || weekday === "Sun";
}

function isHolidayByKey(dayKey: string) {
  return HOLIDAYS.has(dayKey);
}

function isTradingDay(parts: AccraParts) {
  return !isWeekendByWeekday(parts.weekday) && !isHolidayByKey(parts.dayKey);
}

function isMarketOpenByParts(parts: AccraParts) {
  if (!isTradingDay(parts)) {
    return false;
  }

  const totalMinutes = parts.hour * 60 + parts.minute;
  return totalMinutes >= OPEN_HOUR * 60 && totalMinutes < CLOSE_HOUR * 60;
}

function getNextOpenDate(now = new Date()) {
  const nowParts = getAccraParts(now);
  let cursor = buildAccraUtcDate(
    nowParts.year,
    nowParts.month,
    nowParts.day,
    nowParts.hour,
    nowParts.minute
  );

  while (true) {
    const parts = getAccraParts(cursor);
    const totalMinutes = parts.hour * 60 + parts.minute;

    if (isTradingDay(parts) && totalMinutes < OPEN_HOUR * 60) {
      return buildAccraUtcDate(parts.year, parts.month, parts.day, OPEN_HOUR, 0);
    }

    if (isMarketOpenByParts(parts)) {
      return buildAccraUtcDate(parts.year, parts.month, parts.day, parts.hour, parts.minute);
    }

    const nextDay = buildAccraUtcDate(parts.year, parts.month, parts.day, OPEN_HOUR, 0);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    cursor = nextDay;
  }
}

function formatCountdown(target: Date, now: Date) {
  const diffMs = target.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Opens in ${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `Opens in ${hours}h ${minutes}m`;
  }

  return `Opens in ${minutes}m`;
}

function formatCloseCountdown(target: Date, now: Date) {
  const diffMs = target.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `Closes in ${hours}h ${minutes}m`;
  }

  return `Closes in ${minutes}m`;
}

export function getPreviousTradingDate(date = new Date()) {
  const parts = getAccraParts(date);
  const previous = buildAccraUtcDate(parts.year, parts.month, parts.day, 0, 0);
  previous.setUTCDate(previous.getUTCDate() - 1);

  while (true) {
    const previousParts = getAccraParts(previous);
    if (isTradingDay(previousParts)) {
      previous.setUTCHours(0, 0, 0, 0);
      return previous;
    }

    previous.setUTCDate(previous.getUTCDate() - 1);
  }
}

export function getMarketStatus(date = new Date()): MarketStatus {
  const parts = getAccraParts(date);
  const isOpen = isMarketOpenByParts(parts);

  if (isOpen) {
    const marketClose = buildAccraUtcDate(
      parts.year,
      parts.month,
      parts.day,
      CLOSE_HOUR,
      0
    );

    return {
      isOpen: true,
      shortText: "Market Open",
      countdownText: formatCloseCountdown(marketClose, date),
    };
  }

  const nextOpen = getNextOpenDate(date);
  return {
    isOpen: false,
    shortText: "Market Closed",
    countdownText: formatCountdown(nextOpen, date),
  };
}

export function isMarketOpenNow() {
  return getMarketStatus().isOpen;
}
