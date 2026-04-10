import type { Stock } from "../App";

export type SparklineEntry = {
  dayKey: string;
  points: number[];
};

export function getAccraMarketState(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
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

  const weekday = values.weekday || "";
  const hour = Number(values.hour || 0);
  const minute = Number(values.minute || 0);
  const totalMinutes = hour * 60 + minute;
  const isBusinessDay = weekday !== "Sat" && weekday !== "Sun";

  return {
    dayKey: `${values.year}-${values.month}-${values.day}`,
    isOpen: isBusinessDay && totalMinutes >= 10 * 60 && totalMinutes < 15 * 60,
  };
}

export function createDayMoveSeries(stock: Stock) {
  const currentPrice = Number(stock.price);
  const previousClose = currentPrice - Number(stock.change || 0);
  const safeCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : 0;
  const safePreviousClose =
    Number.isFinite(previousClose) && previousClose > 0
      ? previousClose
      : safeCurrentPrice;

  return [safePreviousClose, safeCurrentPrice];
}

export function buildSparklineEntry(
  stock: Stock,
  previousEntry: SparklineEntry | null,
  dayKey: string,
  isMarketOpen: boolean
): SparklineEntry | null {
  const symbol = stock.symbol || stock.ticker || stock.code || "";

  if (!symbol) {
    return null;
  }

  const currentPrice = Number(stock.price);
  if (!Number.isFinite(currentPrice)) {
    return null;
  }

  const dayMoveSeries = createDayMoveSeries(stock);

  if (!isMarketOpen) {
    return {
      dayKey,
      points: dayMoveSeries,
    };
  }

  const previousClose = dayMoveSeries[0];
  let points =
    previousEntry?.dayKey === dayKey ? [...previousEntry.points] : [previousClose];

  if (
    !Number.isFinite(points[0]) ||
    Math.abs(points[0] - previousClose) > 0.0001
  ) {
    points = [previousClose];
  }

  const lastPoint = points[points.length - 1];

  if (!Number.isFinite(lastPoint) || Math.abs(lastPoint - currentPrice) > 0.0001) {
    points.push(currentPrice);
  } else if (points.length === 1) {
    points.push(currentPrice);
  }

  return {
    dayKey,
    points: points.slice(-24),
  };
}
