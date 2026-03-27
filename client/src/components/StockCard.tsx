import { useEffect, useRef, useState } from "react";
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

type StockCardProps = {
  stock: Stock;
  onSelect: (stock: Stock) => void;
};

function StockCard({ stock, onSelect }: StockCardProps) {
  const prevPrice = useRef(stock.price);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    if (stock.price > prevPrice.current) {
      setFlashColor("rgba(0, 255, 80, 0.12)");
    } else if (stock.price < prevPrice.current) {
      setFlashColor("rgba(255, 59, 48, 0.12)");
    }

    prevPrice.current = stock.price;

    const timer = setTimeout(() => {
      setFlashColor(null);
    }, 800);

    return () => clearTimeout(timer);
  }, [stock.price]);

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
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TickerLogo symbol={stock.symbol} />

        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: C.text,
            }}
          >
            {stock.symbol}
          </div>

          <div
            style={{
              fontSize: 13,
              color: C.sub,
              marginTop: 4,
            }}
          >
            {stock.name}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: C.text,
          }}
        >
          ₵{Number(stock.price).toFixed(2)}
        </div>

        <div
          style={{
            fontSize: 13,
            marginTop: 4,
            color: Number(stock.change) >= 0 ? C.green : C.red,
          }}
        >
          {Number(stock.change) >= 0 ? "+" : ""}
          {Number(stock.changePercent).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default StockCard;