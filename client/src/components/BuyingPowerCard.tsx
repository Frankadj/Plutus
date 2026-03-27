import { C } from "../theme/colors";

type BuyingPowerCardProps = {
  cash: number;
};

function BuyingPowerCard({ cash }: BuyingPowerCardProps) {
  return (
    <div
      style={{
        margin: "16px 0 20px",
        padding: "12px 16px",
        borderRadius: 12,
        background: C.card,
        border: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontSize: 15,
          color: C.text,
          fontWeight: 400,
        }}
      >
        Buying power
      </div>

      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: C.text,
        }}
      >
        ₵{cash.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}

export default BuyingPowerCard;