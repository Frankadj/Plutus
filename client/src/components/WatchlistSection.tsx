import { C } from "../theme/colors";
import TickerLogo from "./TickerLogo";

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

function WatchlistSection({ stocks, onSelect }: Props) {
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
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, color: C.text }}>Watchlist</h3>

        <button
          style={{
            background: "none",
            border: "none",
            color: C.green,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          + Add
        </button>
      </div>

      {stocks.length === 0 ? (
        <div style={{ color: C.sub }}>No stocks in watchlist</div>
      ) : (
        stocks.map((stock, index) => (
          <div
            key={stock.symbol}
            onClick={() => onSelect(stock)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom:
                index < stocks.length - 1 ? `1px solid ${C.border}` : "none",
              gap: 12,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <TickerLogo symbol={stock.symbol} />

              <div>
                <div style={{ color: C.text, fontWeight: 600 }}>
                  {stock.symbol}
                </div>
                <div style={{ color: C.sub, fontSize: 13 }}>
                  {stock.name}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.text }}>
                ₵{Number(stock.price).toFixed(2)}
              </div>
              <div
                style={{
                  color: Number(stock.changePercent) >= 0 ? C.green : C.red,
                  fontSize: 13,
                }}
              >
                {Number(stock.changePercent) >= 0 ? "+" : ""}
                {Number(stock.changePercent).toFixed(2)}%
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default WatchlistSection;