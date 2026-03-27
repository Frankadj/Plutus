import PortfolioChart from "./PortfolioChart";
import { C } from "../theme/colors";
import { fmt } from "../utils/format";

const mockHistory = [
  { date: "Mon", value: 9800 },
  { date: "Tue", value: 9950 },
  { date: "Wed", value: 10050 },
  { date: "Thu", value: 10020 },
  { date: "Fri", value: 10000 },
];

function PortfolioCard() {
  const portfolioValue = 10000;
  const totalReturn = 0;
  const totalReturnPct = 0;

  return (
    <div
      style={{
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 20,
        marginBottom: 20,
      }}
    >
      <div style={{ paddingBottom: 16 }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 500,
            color: C.text,
            lineHeight: 1,
            textAlign: "left",
          }}
        >
          Investing
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: C.text,
            marginTop: 10,
            lineHeight: 1,
            textAlign: "left",
          }}
        >
          ₵{fmt(portfolioValue)}
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: totalReturn >= 0 ? C.green : C.red,
            marginTop: 8,
            textAlign: "left",
          }}
        >
          {totalReturn >= 0 ? "+" : "-"}₵{fmt(Math.abs(totalReturn))} (
          {totalReturnPct.toFixed(2)}%) Today
        </div>
      </div>

      <div style={{ marginLeft: "-8px", marginRight: "-8px" }}>
        <PortfolioChart history={mockHistory} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 4,
          paddingTop: 16,
          width: "100%",
        }}
      >
        {["1D", "1W", "3M", "YTD", "1Y", "5Y"].map((period, index) => {
          const active = index === 0;

          return (
            <button
              key={period}
              style={{
                background: active ? C.green : "transparent",
                color: active ? "#000" : C.green,
                border: "none",
                borderRadius: 16,
                padding: "6px 0",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                flex: 1,
              }}
            >
              {period}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PortfolioCard;