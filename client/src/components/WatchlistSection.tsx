import type { Stock } from "../App";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { useMiniHistoryMap } from "../hooks/useMiniHistoryMap";
import { C } from "../theme/colors";
import { createDayMoveSeries } from "../utils/sparkline";
import {
  formatStockChangePercent,
  getStockMovementTone,
} from "../utils/stockMovement";
import MiniSparkline from "./MiniSparkline";
import TickerLogo from "./TickerLogo";

type Props = {
  stocks: Stock[];
  apiBase: string;
  onSelect: (stock: Stock) => void;
};

type WatchlistRowProps = {
  stock: Stock;
  onSelect: (stock: Stock) => void;
  showDivider: boolean;
  sparklineValues?: number[];
};

function WatchlistRow({
  stock,
  onSelect,
  showDivider,
  sparklineValues,
}: WatchlistRowProps) {
  const isCompactLayout = useIsCompactLayout();
  const symbol = String(stock.symbol || stock.ticker || stock.code || "")
    .toUpperCase()
    .trim();

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
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: showDivider ? `1px solid ${C.border}` : "none",
        gap: isCompactLayout ? 10 : 12,
        cursor: "pointer",
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
          <div style={{ color: C.text, fontWeight: 600 }}>
            {symbol || "N/A"}
          </div>
          <div style={{ color: C.sub, fontSize: isCompactLayout ? 12 : 13 }}>
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
          <div style={{ color: C.text }}>
            ₵{Number(stock.price).toFixed(2)}
          </div>
          <div
            style={{
              color: changeColor,
              fontSize: isCompactLayout ? 12 : 13,
            }}
          >
            {formatStockChangePercent(stock)}
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchlistSection({ stocks, apiBase, onSelect }: Props) {
  const weeklyMiniCharts = useMiniHistoryMap({
    apiBase,
    stocks,
    range: "1W",
  });

  return (
    <div
      style={{
        padding: "20px 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, color: C.text }}>Watchlist</h3>
      </div>

      {stocks.length === 0 ? (
        <div style={{ color: C.sub }}>No stocks in watchlist</div>
      ) : (
        stocks.map((stock, index) => {
          const symbol = String(stock.symbol || stock.ticker || stock.code || "")
            .toUpperCase()
            .trim();

          return (
            <WatchlistRow
              key={symbol || stock.name}
              stock={stock}
              onSelect={onSelect}
              showDivider={index < stocks.length - 1}
              sparklineValues={weeklyMiniCharts[symbol]}
            />
          );
        })
      )}
    </div>
  );
}

export default WatchlistSection;
