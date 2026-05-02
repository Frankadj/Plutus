import { useEffect, useRef, useState } from "react";
import type { Stock } from "../App";
import { C } from "../theme/colors";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { createDayMoveSeries } from "../utils/sparkline";
import {
  formatStockChangePercent,
  getStockMovementTone,
} from "../utils/stockMovement";
import MiniSparkline from "./MiniSparkline";
import TickerLogo from "./TickerLogo";

type StockCardProps = {
  stock: Stock;
  onSelect: (stock: Stock) => void;
  sparklineValues?: number[];
};

function StockCard({ stock, onSelect, sparklineValues }: StockCardProps) {
  const isCompactLayout = useIsCompactLayout();
  const symbol = String(stock.symbol || stock.ticker || stock.code || "")
    .toUpperCase()
    .trim();
  const prevPrice = useRef(stock.price);
  const clearFlashTimer = useRef<number | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    const previousPrice = prevPrice.current;
    let nextFlashColor: string | null = null;

    if (stock.price > previousPrice) {
      nextFlashColor = "rgba(0, 255, 80, 0.12)";
    } else if (stock.price < previousPrice) {
      nextFlashColor = "rgba(255, 59, 48, 0.12)";
    }

    prevPrice.current = stock.price;

    if (!nextFlashColor) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setFlashColor(nextFlashColor);

      clearFlashTimer.current = window.setTimeout(() => {
        setFlashColor(null);
        clearFlashTimer.current = null;
      }, 800);
    });

    return () => {
      window.cancelAnimationFrame(frameId);

      if (clearFlashTimer.current !== null) {
        window.clearTimeout(clearFlashTimer.current);
        clearFlashTimer.current = null;
      }
    };
  }, [stock.price]);

  const tone = getStockMovementTone(stock);
  const changeColor =
    tone === "positive" ? C.green : tone === "negative" ? C.red : C.sub;
  const resolvedSparklineValues =
    Array.isArray(sparklineValues) && sparklineValues.length >= 2
      ? sparklineValues
      : createDayMoveSeries(stock);

  return (
    <div
      onClick={() => onSelect(stock)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer",
        gap: 12,
        background: flashColor || "transparent",
        transition: "background 0.25s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isCompactLayout ? 10 : 12,
          minWidth: 0,
          flex: 1,
        }}
      >
        <TickerLogo
          symbol={symbol}
          size={isCompactLayout ? 38 : 42}
          logoUrl={stock.logoUrl}
        />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isCompactLayout ? 15 : 16,
              fontWeight: 600,
              color: C.text,
            }}
          >
            {symbol || "N/A"}
          </div>

          <div
            style={{
              fontSize: isCompactLayout ? 12 : 13,
              color: C.sub,
              marginTop: 4,
              lineHeight: 1.3,
            }}
          >
            {stock.name}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isCompactLayout ? 10 : 14,
          flexShrink: 0,
        }}
      >
        <MiniSparkline
          values={resolvedSparklineValues}
          tone={tone}
          width={isCompactLayout ? 68 : 84}
          height={isCompactLayout ? 30 : 36}
        />

        <div
          style={{
            textAlign: "right",
            minWidth: isCompactLayout ? 68 : 82,
          }}
        >
          <div
            style={{
              fontSize: isCompactLayout ? 15 : 16,
              fontWeight: 600,
              color: C.text,
            }}
          >
            ₵{Number(stock.price).toFixed(2)}
          </div>

          <div
            style={{
              fontSize: isCompactLayout ? 12 : 13,
              marginTop: 4,
              color: changeColor,
            }}
          >
            {formatStockChangePercent(stock)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockCard;
