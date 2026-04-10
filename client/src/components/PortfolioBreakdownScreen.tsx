import { useMemo } from "react";
import type { PortfolioTransaction, Position, Stock } from "../App";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { C } from "../theme/colors";
import { fmt } from "../utils/format";
import {
  getPortfolioSummary,
  resolvePortfolioSymbol,
  toNumber,
} from "../utils/portfolioAnalytics";
import TickerLogo from "./TickerLogo";

type Props = {
  stocks: Stock[];
  positions: Record<string, Position>;
  transactions: PortfolioTransaction[];
  onBack: () => void;
};

const BREAKDOWN_COLORS = [
  "#34D399",
  "#22C55E",
  "#84CC16",
  "#14B8A6",
  "#38BDF8",
  "#F59E0B",
  "#FB7185",
];

const transactionDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function getToneColor(value: number) {
  if (value > 0) {
    return C.green;
  }

  if (value < 0) {
    return C.red;
  }

  return C.sub;
}

function formatSignedCurrency(value: number) {
  const absolute = `₵${fmt(Math.abs(value))}`;
  return `${value >= 0 ? "+" : "-"}${absolute}`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`;
}

function MetricCard({
  title,
  value,
  secondary,
  tone = "neutral",
}: {
  title: string;
  value: string;
  secondary?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueColor =
    tone === "positive" ? C.green : tone === "negative" ? C.red : C.text;

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        background: C.card,
        padding: "12px 12px",
      }}
    >
      <div
        style={{
          color: C.sub,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 6,
          color: valueColor,
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {secondary ? (
        <div
          style={{
            marginTop: 5,
            color: C.sub,
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

function PerformerCard({
  title,
  holding,
}: {
  title: string;
  holding: {
    symbol: string;
    name: string;
    sector: string;
    unrealizedPnl: number;
    unrealizedPnlPercent: number;
  };
}) {
  const toneColor = getToneColor(holding.unrealizedPnl);

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        background: C.card,
        padding: "14px 14px",
      }}
    >
      <div
        style={{
          color: C.sub,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TickerLogo symbol={holding.symbol} size={34} />

        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>
            {holding.symbol}
          </div>
          <div
            style={{
              color: C.sub,
              fontSize: 12,
              lineHeight: 1.35,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {holding.name}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          color: toneColor,
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1.1,
        }}
      >
        {formatSignedCurrency(holding.unrealizedPnl)}
      </div>
      <div style={{ marginTop: 5, color: C.sub, fontSize: 12 }}>
        {formatSignedPercent(holding.unrealizedPnlPercent)} • {holding.sector}
      </div>
    </div>
  );
}

function PortfolioBreakdownScreen({
  stocks,
  positions,
  transactions,
  onBack,
}: Props) {
  const isCompactLayout = useIsCompactLayout();
  const summary = useMemo(
    () => getPortfolioSummary(stocks, positions, transactions),
    [positions, stocks, transactions]
  );
  const holdings = summary.holdings;
  const totalShares = holdings.reduce((sum, holding) => sum + holding.shares, 0);
  const portfolioAverageCost = totalShares > 0 ? summary.totalCost / totalShares : 0;

  const allocationSegments = holdings.map((holding, index) => {
    const weight =
      summary.totalValue > 0
        ? (holding.currentValue / summary.totalValue) * 100
        : 0;

    return {
      holding,
      color: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
      weight: Math.max(weight, 0),
    };
  });

  const donutGradient = (() => {
    if (summary.totalValue <= 0 || allocationSegments.length === 0) {
      return C.card;
    }

    let cursor = 0;
    const stops = allocationSegments.map((segment, index) => {
      const start = cursor;
      cursor += segment.weight;
      const end =
        index === allocationSegments.length - 1 ? 100 : Math.min(cursor, 100);

      return `${segment.color} ${start.toFixed(4)}% ${end.toFixed(4)}%`;
    });

    return `conic-gradient(${stops.join(", ")})`;
  })();

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort(
        (left, right) => toNumber(right.timestamp) - toNumber(left.timestamp)
      ),
    [transactions]
  );
  const gainLossHoldings = useMemo(
    () =>
      [...holdings].sort((left, right) => {
        if (right.unrealizedPnl !== left.unrealizedPnl) {
          return right.unrealizedPnl - left.unrealizedPnl;
        }

        return right.currentValue - left.currentValue;
      }),
    [holdings]
  );
  const bestPerformer = gainLossHoldings[0] || null;
  const worstPerformer =
    gainLossHoldings.length > 1 ? gainLossHoldings[gainLossHoldings.length - 1] : null;
  const sectorAllocations = useMemo(() => {
    const sectorMap = new Map<
      string,
      {
        sector: string;
        currentValue: number;
        totalCost: number;
        unrealizedPnl: number;
        holdingsCount: number;
      }
    >();

    for (const holding of holdings) {
      const sector = holding.sector || "Unclassified";
      const current = sectorMap.get(sector) || {
        sector,
        currentValue: 0,
        totalCost: 0,
        unrealizedPnl: 0,
        holdingsCount: 0,
      };

      current.currentValue += holding.currentValue;
      current.totalCost += holding.totalCost;
      current.unrealizedPnl += holding.unrealizedPnl;
      current.holdingsCount += 1;
      sectorMap.set(sector, current);
    }

    return [...sectorMap.values()]
      .map((entry) => ({
        ...entry,
        weight:
          summary.totalValue > 0 ? (entry.currentValue / summary.totalValue) * 100 : 0,
      }))
      .sort((left, right) => right.currentValue - left.currentValue);
  }, [holdings, summary.totalValue]);

  const showEmptyState = holdings.length === 0 && sortedTransactions.length === 0;
  const metricsGrid = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isCompactLayout
          ? "1fr"
          : "repeat(2, minmax(0, 1fr))",
        gap: 10,
        marginBottom: 24,
      }}
    >
      <MetricCard
        title="Cost Basis"
        value={`₵${fmt(summary.totalCost)}`}
        secondary={`Avg cost/share ₵${fmt(portfolioAverageCost)}`}
      />
      <MetricCard
        title="Realized P/L"
        value={formatSignedCurrency(summary.realizedPnl)}
        tone={
          summary.realizedPnl > 0
            ? "positive"
            : summary.realizedPnl < 0
              ? "negative"
              : "neutral"
        }
      />
      <MetricCard
        title="Unrealized P/L"
        value={formatSignedCurrency(summary.unrealizedPnl)}
        secondary={formatSignedPercent(
          summary.totalCost > 0 ? (summary.unrealizedPnl / summary.totalCost) * 100 : 0
        )}
        tone={
          summary.unrealizedPnl > 0
            ? "positive"
            : summary.unrealizedPnl < 0
              ? "negative"
              : "neutral"
        }
      />
      <MetricCard
        title="Total Return"
        value={formatSignedCurrency(summary.totalReturn)}
        secondary={formatSignedPercent(summary.totalReturnPercent)}
        tone={
          summary.totalReturn > 0
            ? "positive"
            : summary.totalReturn < 0
              ? "negative"
              : "neutral"
        }
      />
    </div>
  );

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
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          padding: isCompactLayout ? "14px 14px 36px" : "18px 20px 44px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 36,
            marginBottom: 8,
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
              position: "absolute",
              left: 0,
            }}
            aria-label="Go back"
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: isCompactLayout ? "28px" : "32px",
              fontWeight: 600,
              color: C.text,
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            Portfolio Breakdown
          </h1>
        </div>

        <div
          style={{
            marginBottom: 22,
            color: C.sub,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          Total holdings value: ₵{fmt(summary.totalValue)}
        </div>

        {showEmptyState ? (
          <div style={{ color: C.sub }}>No holdings or transactions available.</div>
        ) : (
          <>
            {holdings.length > 0 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <div
                  style={{
                      width: isCompactLayout ? 184 : 220,
                      height: isCompactLayout ? 184 : 220,
                      borderRadius: "50%",
                      background: donutGradient,
                      border: `1px solid ${C.border}`,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: isCompactLayout ? 32 : 38,
                        borderRadius: "50%",
                        background: C.bg,
                        border: `1px solid ${C.border}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "0 16px",
                      }}
                    >
                      <div
                        style={{
                          color: C.sub,
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: C.text,
                          fontSize: isCompactLayout ? 20 : 24,
                          fontWeight: 700,
                          lineHeight: 1.1,
                        }}
                      >
                        ₵{fmt(summary.totalValue)}
                      </div>
                    </div>
                  </div>
                </div>

                {metricsGrid}

                {bestPerformer ? (
                  <div style={{ marginBottom: 28 }}>
                    <h2
                      style={{
                        margin: "0 0 14px",
                        color: C.text,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      Best & Worst Performers
                    </h2>

                    <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                          worstPerformer && !isCompactLayout
                            ? "repeat(2, minmax(0, 1fr))"
                            : "1fr",
                      gap: 10,
                    }}
                    >
                      <PerformerCard title="Best Performer" holding={bestPerformer} />
                      {worstPerformer ? (
                        <PerformerCard title="Worst Performer" holding={worstPerformer} />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {sectorAllocations.length > 0 ? (
                  <div style={{ marginBottom: 28 }}>
                    <h2
                      style={{
                        margin: "0 0 14px",
                        color: C.text,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      Allocation by Sector
                    </h2>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {sectorAllocations.map((sector, index) => (
                        <div key={sector.sector}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: C.text,
                                  fontSize: 14,
                                  fontWeight: 700,
                                }}
                              >
                                {sector.sector}
                              </div>
                              <div
                                style={{
                                  color: C.sub,
                                  fontSize: 12,
                                  marginTop: 3,
                                }}
                              >
                                {sector.holdingsCount} holding
                                {sector.holdingsCount === 1 ? "" : "s"} •{" "}
                                {formatSignedCurrency(sector.unrealizedPnl)}
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: C.text, fontWeight: 700 }}>
                                ₵{fmt(sector.currentValue)}
                              </div>
                              <div style={{ color: C.sub, fontSize: 12, marginTop: 3 }}>
                                {sector.weight.toFixed(1)}%
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              width: "100%",
                              height: 8,
                              borderRadius: 999,
                              background: C.border,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, Math.max(sector.weight, 4))}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={{ marginBottom: 28 }}>
                  <h2
                    style={{
                      margin: "0 0 14px",
                      color: C.text,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    Gain/Loss by Holding
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {gainLossHoldings.map((holding, index) => {
                      const segmentIndex = allocationSegments.findIndex(
                        (segment) => segment.holding.symbol === holding.symbol
                      );
                      const color =
                        BREAKDOWN_COLORS[
                          segmentIndex >= 0 ? segmentIndex % BREAKDOWN_COLORS.length : 0
                        ];
                      const weight =
                        summary.totalValue > 0
                          ? (holding.currentValue / summary.totalValue) * 100
                          : 0;

                      return (
                      <div
                        key={holding.symbol}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompactLayout ? "1fr" : "1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: "12px 0",
                          borderBottom:
                            index < holdings.length - 1
                              ? `1px solid ${C.border}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            minWidth: 0,
                          }}
                        >
                          <TickerLogo symbol={holding.symbol} size={36} />

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                color: C.text,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background: color,
                                  flexShrink: 0,
                                }}
                              />
                              {holding.symbol}
                            </div>
                            <div
                              style={{
                                color: C.sub,
                                fontSize: 13,
                                lineHeight: 1.3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {holding.name}
                            </div>
                            <div
                              style={{
                                color: C.sub,
                                fontSize: 12,
                                marginTop: 5,
                                lineHeight: 1.35,
                              }}
                            >
                              {holding.sector} • Avg cost ₵{fmt(holding.averageCost)}
                            </div>
                            <div
                              style={{
                                color: C.sub,
                                fontSize: 12,
                                marginTop: 3,
                                lineHeight: 1.35,
                              }}
                            >
                              P/L{" "}
                              <span
                                style={{
                                  color: getToneColor(holding.unrealizedPnl),
                                  fontWeight: 700,
                                }}
                              >
                                {formatSignedCurrency(holding.unrealizedPnl)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: isCompactLayout ? "left" : "right" }}>
                          <div style={{ color: C.text, fontWeight: 700 }}>
                            ₵{fmt(holding.currentValue)}
                          </div>
                          <div
                            style={{
                              color: getToneColor(holding.unrealizedPnl),
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {formatSignedPercent(holding.unrealizedPnlPercent)}
                          </div>
                          <div
                            style={{
                              color: C.sub,
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            {weight.toFixed(1)}% of portfolio
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              </>
            ) : (
              metricsGrid
            )}

            {sortedTransactions.length > 0 ? (
              <div>
                <h2
                  style={{
                    margin: "0 0 14px",
                    color: C.text,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  Transactions
                </h2>

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {sortedTransactions.map((transaction, index) => {
                    const symbol = String(transaction.symbol || "")
                      .toUpperCase()
                      .trim();
                    const stock = stocks.find(
                      (item) => resolvePortfolioSymbol(item) === symbol
                    );
                    const realizedPnl = toNumber(transaction.realizedPnl);
                    const typeLabel = transaction.type === "buy" ? "Buy" : "Sell";
                    const typeColor =
                      transaction.type === "buy" ? C.green : C.red;

                    return (
                      <div
                        key={transaction.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompactLayout ? "1fr" : "1fr auto",
                          gap: 12,
                          alignItems: "center",
                          padding: "14px 0",
                          borderBottom:
                            index < sortedTransactions.length - 1
                              ? `1px solid ${C.border}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            minWidth: 0,
                          }}
                        >
                          <TickerLogo symbol={symbol} size={34} />

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  color: typeColor,
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}
                              >
                                {typeLabel}
                              </span>
                              <span style={{ color: C.text, fontWeight: 700 }}>
                                {symbol}
                              </span>
                            </div>
                            <div
                              style={{
                                color: C.sub,
                                fontSize: 13,
                                marginTop: 4,
                                lineHeight: 1.35,
                              }}
                            >
                              {transaction.shares} share
                              {transaction.shares === 1 ? "" : "s"} at ₵
                              {fmt(transaction.price)}
                              {stock?.name ? ` • ${stock.name}` : ""}
                            </div>
                            <div
                              style={{
                                color: C.sub,
                                fontSize: 12,
                                marginTop: 5,
                                lineHeight: 1.35,
                              }}
                            >
                              {transactionDateFormatter.format(
                                new Date(toNumber(transaction.timestamp))
                              )}
                              {transaction.type === "sell" ? (
                                <>
                                  {" • Realized "}
                                  <span
                                    style={{
                                      color: getToneColor(realizedPnl),
                                      fontWeight: 700,
                                    }}
                                  >
                                    {formatSignedCurrency(realizedPnl)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: isCompactLayout ? "left" : "right" }}>
                          <div style={{ color: C.text, fontWeight: 700 }}>
                            ₵{fmt(transaction.total)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export default PortfolioBreakdownScreen;
