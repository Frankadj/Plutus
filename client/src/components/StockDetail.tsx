import { useEffect, useMemo, useState } from "react";
import { C } from "../theme/colors";
import StockChart from "./StockChart";
import BuyModal from "./BuyModal";
import TickerLogo from "./TickerLogo";
import type { Position } from "../App";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

type HistoryPoint = {
  date: string;
  value: number;
};

type CompanyInfo = {
  description: string;
  sector: string;
  ceo: string;
};

type StockDetailProps = {
  stock: Stock;
  onBack: () => void;
  cash: number;
  setCash: (val: number) => void;
  positions: Record<string, Position>;
  setPositions: (val: Record<string, Position>) => void;
};

const wikiPageMap: Record<string, string> = {
  MTNGH: "MTN_Ghana",
  GOIL: "GOIL",
  GCB: "GCB_Bank",
  EGH: "Ecobank_Ghana",
  TOTAL: "TotalEnergies_Marketing_Ghana",
  CAL: "CAL_Bank",
  SCB: "Standard_Chartered_Ghana",
  SOGEGH: "Société_Générale_Ghana",
  ACCESS: "The_Access_Bank_UK_Limited",
  AADS: "AngloGold_Ashanti",
};

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractInfoboxValue(html: string, labels: string[]) {
  for (const label of labels) {
    const regex = new RegExp(
      `<th[^>]*>\\s*${label}\\s*<\\/th>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>`,
      "i"
    );
    const match = html.match(regex);
    if (match && match[1]) {
      return stripHtml(match[1]);
    }
  }
  return "Not available";
}

function StockDetail({
  stock,
  onBack,
  cash,
  setCash,
  positions,
  setPositions,
}: StockDetailProps) {
  const positive = Number(stock.change) >= 0;
  const [period, setPeriod] = useState("1W");
  const [showBuy, setShowBuy] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [yearHistory, setYearHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    description: "Loading company information...",
    sector: "Loading...",
    ceo: "Loading...",
  });

  const rangeMap: Record<string, string> = {
    "1D": "1W",
    "1W": "1W",
    "3M": "3M",
    YTD: "1Y",
    "1Y": "1Y",
    "5Y": "5Y",
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError("");

        const range = rangeMap[period] || "1W";

        const res = await fetch(
          `http://127.0.0.1:3001/api/stocks/${stock.symbol}/history?range=${range}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Failed to load history");
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid history response");
        }

        const cleanedHistory: HistoryPoint[] = data
          .filter(
            (item) =>
              item &&
              typeof item.date !== "undefined" &&
              typeof item.value !== "undefined"
          )
          .map((item) => ({
            date: String(item.date),
            value: Number(item.value),
          }))
          .filter((item) => !Number.isNaN(item.value));

        setHistory(cleanedHistory);
      } catch (error) {
        setHistoryError("Unable to load chart history right now.");
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    const fetchYearHistory = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:3001/api/stocks/${stock.symbol}/history?range=1Y`,
          { cache: "no-store" }
        );

        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data)) return;

        const cleanedYearHistory: HistoryPoint[] = data
          .filter(
            (item) =>
              item &&
              typeof item.date !== "undefined" &&
              typeof item.value !== "undefined"
          )
          .map((item) => ({
            date: String(item.date),
            value: Number(item.value),
          }))
          .filter((item) => !Number.isNaN(item.value));

        setYearHistory(cleanedYearHistory);
      } catch (error) {
        setYearHistory([]);
      }
    };

    fetchHistory();
    fetchYearHistory();
  }, [stock.symbol, period]);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
      const title = wikiPageMap[stock.symbol] || stock.name.replace(/\s+/g, "_");

      try {
        const summaryRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { cache: "no-store" }
        );

        let description = "Company information not available.";
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          description = summaryData.extract || description;
        }

        const parseRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
            title
          )}&prop=text&format=json&origin=*`,
          { cache: "no-store" }
        );

        let sector = "Not available";
        let ceo = "Not available";

        if (parseRes.ok) {
          const parseData = await parseRes.json();
          const html =
            parseData?.parse?.text?.["*"] ||
            parseData?.parse?.text ||
            "";

          if (html) {
            sector = extractInfoboxValue(html, [
              "Industry",
              "Sector",
              "Products",
            ]);

            ceo = extractInfoboxValue(html, [
              "CEO",
              "Chief executive officer",
              "Key people",
            ]);
          }
        }

        setCompanyInfo({
          description,
          sector,
          ceo,
        });
      } catch (error) {
        setCompanyInfo({
          description: "Company information not available.",
          sector: "Not available",
          ceo: "Not available",
        });
      }
    };

    fetchCompanyInfo();
  }, [stock.symbol, stock.name]);

  const position = positions[stock.symbol] || { shares: 0, totalCost: 0 };
  const ownedShares = position.shares;
  const currentValue = ownedShares * Number(stock.price);
  const avgCost = ownedShares > 0 ? position.totalCost / ownedShares : 0;
  const todaysReturn = ownedShares * Number(stock.change);
  const totalReturn = currentValue - position.totalCost;

  const stats = useMemo(() => {
    const historyValues = history.map((item) => item.value);
    const yearValues = yearHistory.map((item) => item.value);

    const open =
      history.length > 0 ? history[0].value : Number(stock.price);
    const close =
      history.length > 0
        ? history[history.length - 1].value
        : Number(stock.price);
    const high =
      historyValues.length > 0
        ? Math.max(...historyValues)
        : Number(stock.price);

    const high52 =
      yearValues.length > 0
        ? Math.max(...yearValues)
        : Number(stock.price);

    const low52 =
      yearValues.length > 0
        ? Math.min(...yearValues)
        : Number(stock.price);

    return {
      open,
      close,
      high,
      high52,
      low52,
      volume: Number(stock.volume),
    };
  }, [history, yearHistory, stock.price, stock.volume]);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.text,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "18px 20px 16px",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: C.text,
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.text}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6"></path>
          </svg>
        </button>

        <TickerLogo symbol={stock.symbol} size={50} />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            {stock.symbol}
          </div>

          <div
            style={{
              fontSize: 13,
              color: C.sub,
              marginTop: 5,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              lineHeight: 1.2,
            }}
          >
            {stock.name}
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "24px 20px 40px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            marginBottom: 24,
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 600,
              color: C.text,
              lineHeight: 1,
              letterSpacing: "-1px",
            }}
          >
            ₵{Number(stock.price).toFixed(2)}
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 20,
              color: positive ? C.green : C.red,
              fontWeight: 600,
            }}
          >
            {positive ? "+" : ""}
            {Number(stock.change).toFixed(2)} ({positive ? "+" : ""}
            {Number(stock.changePercent).toFixed(2)}%)
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          {historyLoading ? (
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 20,
                background: C.card,
                color: C.sub,
              }}
            >
              Loading chart...
            </div>
          ) : historyError ? (
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 20,
                background: C.card,
                color: C.red,
              }}
            >
              {historyError}
            </div>
          ) : (
            <StockChart history={history} positive={positive} />
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 26,
          }}
        >
          {["1D", "1W", "3M", "YTD", "1Y", "5Y"].map((p) => {
            const active = period === p;

            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: active ? C.green : "transparent",
                  color: active ? "#000" : C.green,
                  border: "none",
                  borderRadius: 18,
                  padding: "8px 0",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div style={{ marginBottom: 10 }}>
          <h3
            style={{
              margin: 0,
              marginBottom: 14,
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Ownership
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {[
              { label: "Shares Owned", value: ownedShares.toString() },
              { label: "Current Value", value: `₵${currentValue.toFixed(2)}` },
              { label: "Avg. Cost", value: `₵${avgCost.toFixed(2)}` },
              {
                label: "Today's Return",
                value: `${todaysReturn >= 0 ? "+" : "-"}₵${Math.abs(todaysReturn).toFixed(2)}`,
                color: todaysReturn >= 0 ? C.green : C.red,
              },
              {
                label: "Total Return",
                value: `${totalReturn >= 0 ? "+" : "-"}₵${Math.abs(totalReturn).toFixed(2)}`,
                color: totalReturn >= 0 ? C.green : C.red,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 18,
                  padding: "18px 16px",
                  background: C.card,
                }}
              >
                <div
                  style={{
                    color: C.sub,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    color: item.color || C.text,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <h3
            style={{
              margin: 0,
              marginBottom: 14,
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
            }}
          >
            Stats
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {[
              { label: "Open", value: `₵${stats.open.toFixed(2)}` },
              { label: "Close", value: `₵${stats.close.toFixed(2)}` },
              { label: "High", value: `₵${stats.high.toFixed(2)}` },
              { label: "Volume", value: stats.volume.toLocaleString() },
              { label: "52 WK High", value: `₵${stats.high52.toFixed(2)}` },
              { label: "52 WK Low", value: `₵${stats.low52.toFixed(2)}` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 18,
                  padding: "18px 16px",
                  background: C.card,
                }}
              >
                <div
                  style={{
                    color: C.sub,
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    color: C.text,
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <h3
            style={{
              margin: 0,
              marginBottom: 14,
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
            }}
          >
            About
          </h3>

          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: "18px 16px",
              background: C.card,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                color: C.text,
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              {companyInfo.description}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: C.sub,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  CEO
                </div>
                <div
                  style={{
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {companyInfo.ceo}
                </div>
              </div>

              <div>
                <div
                  style={{
                    color: C.sub,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Sector
                </div>
                <div
                  style={{
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.4,
                  }}
                >
                  {companyInfo.sector}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <button
            onClick={() => setShowBuy(true)}
            style={{
              background: C.green,
              color: "#000",
              border: "none",
              borderRadius: "18px",
              padding: "16px 16px",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Buy
          </button>

          <button
            style={{
              background: "transparent",
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: "18px",
              padding: "16px 16px",
              fontSize: "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sell
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            color: C.sub,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          Buying power: ₵{cash.toFixed(2)}
        </div>
      </div>

      {showBuy && (
        <BuyModal
          stock={stock}
          cash={cash}
          setCash={setCash}
          positions={positions}
          setPositions={setPositions}
          onClose={() => setShowBuy(false)}
        />
      )}
    </div>
  );
}

export default StockDetail;