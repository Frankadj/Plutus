import type { Stock } from "../App";

export type StockMovementTone = "positive" | "negative" | "neutral";

export function getStockMovementTone(
  stock: Pick<Stock, "change" | "changePercent">
): StockMovementTone {
  const changePercent = Number(stock.changePercent);
  const change = Number(stock.change);

  if (changePercent > 0 || (changePercent === 0 && change > 0)) {
    return "positive";
  }

  if (changePercent < 0 || (changePercent === 0 && change < 0)) {
    return "negative";
  }

  return "neutral";
}

export function formatStockChangePercent(
  stock: Pick<Stock, "change" | "changePercent">
) {
  const tone = getStockMovementTone(stock);
  const changePercent = Math.abs(Number(stock.changePercent) || 0);
  const prefix = tone === "positive" ? "+" : tone === "negative" ? "-" : "";

  return `${prefix}${changePercent.toFixed(2)}%`;
}
