import { useState } from "react";
import { C } from "../theme/colors";
import type { PortfolioTransaction, Position } from "../App";

type Props = {
  stock: {
    symbol: string;
    price: number;
  };
  cash: number;
  setCash: (val: number) => void;
  positions: Record<string, Position>;
  setPositions: (val: Record<string, Position>) => void;
  transactions: PortfolioTransaction[];
  setTransactions: (val: PortfolioTransaction[]) => void;
  onClose: () => void;
};

function SellModal({
  stock,
  cash,
  setCash,
  positions,
  setPositions,
  transactions,
  setTransactions,
  onClose,
}: Props) {
  const current = positions[stock.symbol] || { shares: 0, totalCost: 0 };
  const maxShares = current.shares;
  const [shares, setShares] = useState(maxShares > 0 ? 1 : 0);

  const safeShares =
    maxShares > 0
      ? Math.min(maxShares, Math.max(1, Number(shares) || 1))
      : 0;

  const totalProceeds = safeShares * stock.price;

  const handleSell = () => {
    if (maxShares <= 0) {
      alert("You do not own this stock.");
      return;
    }

    if (safeShares > maxShares) {
      alert("You cannot sell more shares than you own.");
      return;
    }

    const avgCostPerShare =
      current.shares > 0 ? current.totalCost / current.shares : 0;

    const remainingShares = current.shares - safeShares;
    const remainingTotalCost = Math.max(
      0,
      current.totalCost - avgCostPerShare * safeShares
    );
    const realizedPnl = totalProceeds - avgCostPerShare * safeShares;

    setCash(cash + totalProceeds);

    if (remainingShares <= 0) {
      const nextPositions = { ...positions };
      delete nextPositions[stock.symbol];
      setPositions(nextPositions);
    } else {
      setPositions({
        ...positions,
        [stock.symbol]: {
          shares: remainingShares,
          totalCost: remainingTotalCost,
        },
      });
    }

    setTransactions([
      ...transactions,
      {
        id: `${stock.symbol}-sell-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        symbol: stock.symbol,
        type: "sell",
        shares: safeShares,
        price: stock.price,
        total: totalProceeds,
        timestamp: Date.now(),
        realizedPnl,
        averageCostPerShare: avgCostPerShare,
        remainingSharesAfter: remainingShares,
      },
    ]);

    onClose();
  };

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
        zIndex: 1200,
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
            Sell {stock.symbol}
          </div>
          <div style={{ color: C.sub, marginTop: 4 }}>
            ₵{stock.price.toFixed(2)} per share
          </div>
          <div style={{ color: C.sub, marginTop: 4 }}>
            You own {maxShares} share{maxShares === 1 ? "" : "s"}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6, color: C.text }}>Shares</div>
          <input
            type="number"
            value={safeShares}
            min={1}
            max={maxShares}
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
          <div style={{ color: C.sub }}>Estimated Proceeds</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>
            ₵{totalProceeds.toFixed(2)}
          </div>
        </div>

        <button
          onClick={handleSell}
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
        >
          Confirm Sell
        </button>
      </div>
    </div>
  );
}

export default SellModal;
