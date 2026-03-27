import { useMemo, useState } from "react";
import { C } from "../theme/colors";
import StockList from "./StockList";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

type Props = {
  stocks: Stock[];
  onSelect: (stock: Stock) => void;
};

function MarketScreen({ stocks, onSelect }: Props) {
  const [query, setQuery] = useState("");

  const filteredStocks = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return stocks;

    return stocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q)
    );
  }, [stocks, query]);

  const gainers = stocks.filter((stock) => stock.changePercent > 0).length;
  const losers = stocks.filter((stock) => stock.changePercent < 0).length;
  const active = stocks.length;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            marginBottom: "8px",
            color: C.text,
            fontSize: "32px",
            fontWeight: 600,
          }}
        >
          Market
        </h1>
        <p style={{ margin: 0, color: C.sub, fontSize: "14px" }}>
          Ghana Stock Exchange
        </p>
      </div>

      <div
        style={{
          marginBottom: "20px",
          padding: "14px 16px",
          borderRadius: "14px",
          border: `1px solid ${C.border}`,
          background: C.card,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "16px", color: C.sub }}>⌕</span>
        <input
          type="text"
          placeholder="Search stocks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: "14px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <MarketStat label="Gainers" value={gainers.toString()} color={C.green} />
        <MarketStat label="Losers" value={losers.toString()} color={C.red} />
        <MarketStat label="Active" value={active.toString()} color={C.text} />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <h2
          style={{
            margin: 0,
            color: C.text,
            fontSize: "20px",
            fontWeight: 600,
          }}
        >
          {query ? "Search Results" : "All Stocks"}
        </h2>
      </div>

      {filteredStocks.length === 0 ? (
        <div
          style={{
            color: C.sub,
            padding: "16px 0",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          No stocks found.
        </div>
      ) : (
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <StockList stocks={filteredStocks} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

function MarketStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        border: `1px solid ${C.border}`,
        borderRadius: "14px",
        padding: "14px",
        background: C.card,
      }}
    >
      <div
        style={{
          color: C.sub,
          fontSize: "12px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color,
          fontSize: "17px",
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default MarketScreen;