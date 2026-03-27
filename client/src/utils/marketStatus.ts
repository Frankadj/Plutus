type MarketStatus = {
  isOpen: boolean;
  shortText: string;
  countdownText: string;
};

const OPEN_HOUR = 10;
const CLOSE_HOUR = 15;

// Add Ghana market holidays here in YYYY-MM-DD format.
// Update this list whenever needed.
const HOLIDAYS = [
  "2026-01-01",
  "2026-03-06",
  "2026-04-03",
  "2026-04-06",
  "2026-05-01",
  "2026-07-01",
  "2026-09-21",
  "2026-12-25",
  "2026-12-26",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isHoliday(date: Date) {
  return HOLIDAYS.includes(formatDateKey(date));
}

function getNextOpenDate(now: Date) {
  const next = new Date(now);

  while (true) {
    if (isWeekend(next) || isHoliday(next)) {
      next.setDate(next.getDate() + 1);
      next.setHours(OPEN_HOUR, 0, 0, 0);
      continue;
    }

    const hour = next.getHours();
    const minute = next.getMinutes();

    if (hour < OPEN_HOUR) {
      next.setHours(OPEN_HOUR, 0, 0, 0);
      return next;
    }

    if (hour >= CLOSE_HOUR || (hour === CLOSE_HOUR && minute > 0)) {
      next.setDate(next.getDate() + 1);
      next.setHours(OPEN_HOUR, 0, 0, 0);
      continue;
    }

    return next;
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

export function getMarketStatus(): MarketStatus {
  const now = new Date();

  if (isWeekend(now)) {
    const nextOpen = getNextOpenDate(now);
    return {
      isOpen: false,
      shortText: "Market Closed",
      countdownText: formatCountdown(nextOpen, now),
    };
  }

  if (isHoliday(now)) {
    const nextOpen = getNextOpenDate(now);
    return {
      isOpen: false,
      shortText: "Market Closed",
      countdownText: formatCountdown(nextOpen, now),
    };
  }

  const hour = now.getHours();
  const minute = now.getMinutes();
  const isOpen =
    hour > OPEN_HOUR && hour < CLOSE_HOUR ||
    (hour === OPEN_HOUR && minute >= 0) ||
    (hour === CLOSE_HOUR && minute === 0);

  if (isOpen) {
    return {
      isOpen: true,
      shortText: "Market Open",
      countdownText: "Market Open",
    };
  }

  const nextOpen = getNextOpenDate(now);
  return {
    isOpen: false,
    shortText: "Market Closed",
    countdownText: formatCountdown(nextOpen, now),
  };
}