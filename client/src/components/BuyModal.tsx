import { useState } from "react";
import { C } from "../theme/colors";
import type { Position } from "../App";

type Props = {
  stock: {
    symbol: string;
    price: number;
  };
  cash: number;
  setCash: (val: number) => void;
  positions: Record<string, Position>;
  setPositions: (val: Record<string, Position>) => void;
  onClose: () => void;
};

function BuyModal({
  stock,
  cash,
  setCash,
  positions,
  setPositions,
  onClose,
}: Props) {
  const [shares, setShares] = useState(1);

  const safeShares = Math.max(1, Number(shares) || 1);
  const total = safeShares * stock.price;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: C.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>
            Buy {stock.symbol}
          </div>
          <div style={{ color: C.sub, marginTop: 4 }}>
            ₵{stock.price.toFixed(2)} per share
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6, color: C.text }}>Shares</div>
          <input
            type="number"
            value={safeShares}
            min={1}
            onChange={(e) => setShares(Number(e.target.value))}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bg,
              color: C.text,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ color: C.sub }}>Estimated Cost</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>
            ₵{total.toFixed(2)}
          </div>
        </div>

        <button
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: C.green,
            color: "#000",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
          }}
          onClick={() => {
            if (total > cash) {
              alert("Not enough buying power");
              return;
            }

            const current = positions[stock.symbol] || { shares: 0, totalCost: 0 };

            setCash(cash - total);
            setPositions({
              ...positions,
              [stock.symbol]: {
                shares: current.shares + safeShares,
                totalCost: current.totalCost + total,
              },
            });

            onClose();
          }}
        >
          Confirm Buy
        </button>
      </div>
    </div>
  );
}

export default BuyModal;