import { useEffect, useState } from "react";
import { C } from "../theme/colors";
import {
  requestBrowserNotificationPermission,
  type PriceAlert,
  type PriceAlertDirection,
} from "../lib/priceAlerts";

type PriceAlertModalProps = {
  stock: {
    symbol: string;
    price: number;
  };
  existingAlert: PriceAlert | null;
  onSave: (alert: PriceAlert) => void;
  onRemove: () => void;
  onClose: () => void;
};

function PriceAlertModal({
  stock,
  existingAlert,
  onSave,
  onRemove,
  onClose,
}: PriceAlertModalProps) {
  const [direction, setDirection] = useState<PriceAlertDirection>(
    existingAlert?.direction || "above"
  );
  const [targetPrice, setTargetPrice] = useState(
    existingAlert?.targetPrice
      ? existingAlert.targetPrice.toFixed(2)
      : Number(stock.price || 0).toFixed(2)
  );

  useEffect(() => {
    setDirection(existingAlert?.direction || "above");
    setTargetPrice(
      existingAlert?.targetPrice
        ? existingAlert.targetPrice.toFixed(2)
        : Number(stock.price || 0).toFixed(2)
    );
  }, [existingAlert, stock.price]);

  const parsedTargetPrice = Number(targetPrice);
  const hasValidTarget = Number.isFinite(parsedTargetPrice) && parsedTargetPrice > 0;

  const handleSave = () => {
    if (!hasValidTarget) {
      alert("Enter a valid alert price.");
      return;
    }

    onSave({
      symbol: stock.symbol,
      targetPrice: parsedTargetPrice,
      direction,
      enabled: true,
      updatedAt: Date.now(),
    });

    void requestBrowserNotificationPermission();
  };

  const optionButtonStyle = (isActive: boolean) => ({
    flex: 1,
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${isActive ? C.green : C.border}`,
    background: isActive ? "rgba(0, 255, 80, 0.12)" : C.bg,
    color: isActive ? C.green : C.text,
    fontWeight: 700,
    cursor: "pointer",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 1200,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
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
            Price Alert for {stock.symbol}
          </div>
          <div style={{ color: C.sub, marginTop: 4 }}>
            Current price: GHS {Number(stock.price || 0).toFixed(2)}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8, color: C.text }}>Alert me when price is</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => setDirection("above")}
              style={optionButtonStyle(direction === "above")}
            >
              Above
            </button>
            <button
              type="button"
              onClick={() => setDirection("below")}
              style={optionButtonStyle(direction === "below")}
            >
              Below
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 6, color: C.text }}>Target price</div>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
            placeholder="Enter alert price"
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

        <button
          type="button"
          onClick={handleSave}
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
          {existingAlert ? "Update Alert" : "Save Alert"}
        </button>

        {existingAlert ? (
          <button
            type="button"
            onClick={onRemove}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: "transparent",
              color: C.red,
              border: `1px solid ${C.border}`,
              fontWeight: 700,
              cursor: "pointer",
              marginTop: 12,
            }}
          >
            Remove Alert
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default PriceAlertModal;
