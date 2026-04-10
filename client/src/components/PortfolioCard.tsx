import { useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioTransaction, Position, Stock } from "../App";
import { C } from "../theme/colors";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { fmt } from "../utils/format";
import { type ChartPeriod } from "../utils/chartPeriods";
import {
  buildPortfolioValueSeries,
  getPortfolioHistorySymbols,
  hasCompletePortfolioHistory,
} from "../utils/portfolioAnalytics";
import ChartPeriodTabs from "./ChartPeriodTabs";
import ChartLoadingSkeleton from "./ChartLoadingSkeleton";
import ChartRefreshOverlay from "./ChartRefreshOverlay";
import StockChart from "./StockChart";

type HistoryPoint = {
  date: string;
  value: number;
};

type PortfolioCardProps = {
  stocks: Stock[];
  positions: Record<string, Position>;
  transactions: PortfolioTransaction[];
  apiBase: string;
  onOpenBreakdown: () => void;
};

type PortfolioPeriod = ChartPeriod;

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function useAnimatedNumber(target: number, duration = 120) {
  const [displayValue, setDisplayValue] = useState(target);
  const currentValueRef = useRef(target);

  useEffect(() => {
    currentValueRef.current = displayValue;
  }, [displayValue]);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplayValue(target);
      currentValueRef.current = target;
      return;
    }

    const startValue = currentValueRef.current;
    const delta = target - startValue;

    if (Math.abs(delta) < 0.0001) {
      setDisplayValue(target);
      currentValueRef.current = target;
      return;
    }

    let frameId = 0;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const progress = Math.min(1, (timestamp - startTime) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + delta * easedProgress;

      currentValueRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        currentValueRef.current = target;
        setDisplayValue(target);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [duration, target]);

  return displayValue;
}

function PortfolioCard({
  stocks,
  positions,
  transactions,
  apiBase,
  onOpenBreakdown,
}: PortfolioCardProps) {
  const isCompactLayout = useIsCompactLayout();
  const [period, setPeriod] = useState<PortfolioPeriod>("1W");
  const [historyBySymbol, setHistoryBySymbol] = useState<
    Record<string, HistoryPoint[]>
  >({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [hoveredHistoryPoint, setHoveredHistoryPoint] =
    useState<HistoryPoint | null>(null);
  const hasLoadedHistoryRef = useRef(false);
  const historyRequestIdRef = useRef(0);
  const latestFetchContextRef = useRef("");

  const stockMap = useMemo(() => {
    const entries = stocks
      .map((stock) => {
        const symbol = (stock.symbol || stock.ticker || stock.code || "")
          .toUpperCase()
          .trim();
        return [symbol, stock] as const;
      })
      .filter(([symbol]) => Boolean(symbol));

    return Object.fromEntries(entries);
  }, [stocks]);

  const positionEntries = useMemo(() => {
    return Object.entries(positions)
      .map(([symbol, position]) => ({
        symbol: symbol.toUpperCase().trim(),
        shares: toNumber(position.shares),
      }))
      .filter((holding) => holding.symbol && holding.shares > 0)
      .sort((left, right) => left.symbol.localeCompare(right.symbol));
  }, [positions]);

  const hasAnyPosition = positionEntries.length > 0;
  const totalHoldingsValue = positionEntries.reduce(
    (sum, entry) => sum + toNumber(stockMap[entry.symbol]?.price) * entry.shares,
    0
  );
  const historySymbols = useMemo(
    () => getPortfolioHistorySymbols(positions, transactions),
    [positions, transactions]
  );
  const historySymbolsKey = historySymbols.join(",");
  const hasRecordedTrades = transactions.length > 0;
  const hasCompleteHistory = useMemo(
    () => hasCompletePortfolioHistory(positions, transactions),
    [positions, transactions]
  );

  const resetPortfolioChartState = (keepLoading = true) => {
    historyRequestIdRef.current += 1;
    hasLoadedHistoryRef.current = false;
    setHistoryBySymbol({});
    setHistoryError("");
    setHistoryLoading(keepLoading);
    setHistoryRefreshing(false);
    setHoveredHistoryPoint(null);
  };

  const handlePeriodChange = (nextPeriod: PortfolioPeriod) => {
    if (nextPeriod === period) {
      return;
    }

    setHoveredHistoryPoint(null);
    setPeriod(nextPeriod);
  };

  useEffect(() => {
    resetPortfolioChartState(
      hasRecordedTrades && hasCompleteHistory && historySymbols.length > 0
    );
  }, [hasCompleteHistory, hasRecordedTrades, historySymbolsKey]);

  const fetchContextKey = `${period}|${historySymbolsKey}|${
    hasCompleteHistory ? "complete" : "incomplete"
  }`;
  latestFetchContextRef.current = fetchContextKey;

  useEffect(() => {
    const fetchContext = `${period}|${historySymbolsKey}|${
      hasCompleteHistory ? "complete" : "incomplete"
    }`;
    const controller = new AbortController();

    const loadHistory = async () => {
      if (latestFetchContextRef.current !== fetchContext) {
        return;
      }

      const requestId = historyRequestIdRef.current + 1;
      historyRequestIdRef.current = requestId;

      if (!hasRecordedTrades || !hasCompleteHistory || historySymbols.length === 0) {
        if (
          requestId === historyRequestIdRef.current &&
          latestFetchContextRef.current === fetchContext
        ) {
          setHistoryBySymbol({});
          setHistoryError(
            !hasRecordedTrades
              ? ""
              : "Portfolio chart becomes available after your trades are fully recorded."
          );
          setHistoryLoading(false);
          setHistoryRefreshing(false);
          hasLoadedHistoryRef.current = false;
        }
        return;
      }

      const hasExistingHistory = hasLoadedHistoryRef.current;
      setHistoryLoading(!hasExistingHistory);
      setHistoryRefreshing(hasExistingHistory);
      setHistoryError("");

      try {
        const results = await Promise.all(
          historySymbols.map(async (symbol) => {
            try {
              const res = await fetch(
                `${apiBase}/api/stocks/${encodeURIComponent(
                  symbol
                )}/history?range=${period}`,
                {
                  signal: controller.signal,
                }
              );

              if (!res.ok) {
                return { symbol, points: [] as HistoryPoint[] };
              }

              const data = await res.json();

              if (!Array.isArray(data)) {
                return { symbol, points: [] as HistoryPoint[] };
              }

              const points = data
                .filter(
                  (item) =>
                    item &&
                    typeof item.date === "string" &&
                    typeof item.value !== "undefined"
                )
                .map((item) => ({
                  date: String(item.date),
                  value: Number(item.value),
                }))
                .filter((item) => item.date && Number.isFinite(item.value))
                .sort((left, right) => left.date.localeCompare(right.date));

              return { symbol, points };
            } catch {
              return { symbol, points: [] as HistoryPoint[] };
            }
          })
        );

        if (
          controller.signal.aborted ||
          latestFetchContextRef.current !== fetchContext ||
          requestId !== historyRequestIdRef.current
        ) {
          return;
        }

        const nextMap: Record<string, HistoryPoint[]> = {};
        let hasAnyRealData = false;

        for (const result of results) {
          nextMap[result.symbol] = result.points;
          if (result.points.length >= 2) {
            hasAnyRealData = true;
          }
        }

        setHistoryBySymbol(nextMap);
        hasLoadedHistoryRef.current = true;

        if (!hasAnyRealData) {
          setHistoryError("No portfolio history in this range yet.");
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== historyRequestIdRef.current ||
          latestFetchContextRef.current !== fetchContext
        ) {
          return;
        }

        console.error("Failed to load portfolio history:", error);
        setHistoryBySymbol({});
        setHistoryError("Unable to load portfolio chart right now.");
        hasLoadedHistoryRef.current = false;
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === historyRequestIdRef.current &&
          latestFetchContextRef.current === fetchContext
        ) {
          setHistoryLoading(false);
          setHistoryRefreshing(false);
        }
      }
    };

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [
    apiBase,
    hasCompleteHistory,
    hasRecordedTrades,
    historySymbols,
    historySymbolsKey,
    period,
  ]);

  useEffect(() => {
    setHoveredHistoryPoint(null);
  }, [period]);

  const portfolioHistory = useMemo(
    () => buildPortfolioValueSeries(stocks, positions, transactions, historyBySymbol),
    [historyBySymbol, positions, stocks, transactions]
  );
  const firstRealPoint =
    portfolioHistory.find((point) => Number(point.value) > 0) ||
    portfolioHistory[0] ||
    null;
  const latestPoint =
    portfolioHistory.length > 0 ? portfolioHistory[portfolioHistory.length - 1] : null;
  const seriesStartValue = firstRealPoint?.value ?? totalHoldingsValue;
  const seriesEndValue = latestPoint?.value ?? totalHoldingsValue;
  const seriesChange = seriesEndValue - seriesStartValue;
  const seriesChangePct =
    seriesStartValue > 0 ? (seriesChange / seriesStartValue) * 100 : 0;
  const chartPositive = seriesChange >= 0;
  const hasPortfolioChart = portfolioHistory.length >= 2;
  const previewPoint = hoveredHistoryPoint || latestPoint;
  const rangeStartPoint = firstRealPoint;
  const displayValueTarget = previewPoint ? previewPoint.value : totalHoldingsValue;
  const displayChangeTarget =
    previewPoint && rangeStartPoint
      ? previewPoint.value - rangeStartPoint.value
      : seriesChange;
  const displayChangePercentTarget =
    previewPoint && rangeStartPoint && rangeStartPoint.value !== 0
      ? (displayChangeTarget / rangeStartPoint.value) * 100
      : seriesChangePct;
  const displayValue = useAnimatedNumber(displayValueTarget);
  const displayChange = useAnimatedNumber(displayChangeTarget);
  const displayChangePercent = useAnimatedNumber(displayChangePercentTarget);
  const displayPositive = displayChange >= 0;
  const emptyStateMessage = !hasRecordedTrades
    ? "Your investing chart will appear after your first recorded trade."
    : !hasCompleteHistory
      ? "Portfolio chart becomes available after your trades are fully recorded."
      : historyError || "No portfolio history in this range yet.";

  return (
    <div
      style={{
        marginTop: 12,
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 20,
        marginBottom: 20,
      }}
    >
      <div style={{ paddingBottom: 8 }}>
        <div
          style={{
            fontSize: isCompactLayout ? 34 : 40,
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
            marginTop: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: isCompactLayout ? 8 : 12,
          }}
        >
          <div
            style={{
              fontSize: isCompactLayout ? 28 : 32,
              fontWeight: 400,
              color: C.text,
              lineHeight: 1,
              textAlign: "left",
            }}
          >
            ₵{fmt(displayValue)}
          </div>

          <button
            type="button"
            onClick={onOpenBreakdown}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: C.green,
              cursor: "pointer",
              fontSize: isCompactLayout ? 14 : 15,
              fontWeight: 700,
              letterSpacing: "0.01em",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            Breakdown
          </button>
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: displayPositive ? C.green : C.red,
            marginTop: 8,
            textAlign: "left",
          }}
        >
          {displayPositive ? "+" : "-"}₵{fmt(Math.abs(displayChange))} (
          {displayPositive ? "+" : "-"}
          {Math.abs(displayChangePercent).toFixed(2)}%)
        </div>
      </div>

      <div
        style={{
          marginLeft: isCompactLayout ? "-4px" : "-8px",
          marginRight: isCompactLayout ? "-4px" : "-8px",
          marginTop: -4,
        }}
      >
        {historyLoading && portfolioHistory.length < 2 ? (
          <ChartLoadingSkeleton />
        ) : hasPortfolioChart ? (
          <div style={{ position: "relative" }}>
            <StockChart
              history={portfolioHistory}
              positive={chartPositive}
              onHoverChange={setHoveredHistoryPoint}
            />
            {historyRefreshing ? <ChartRefreshOverlay /> : null}
          </div>
        ) : (
          <div
            style={{
              height: 214,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.sub,
              background: C.card,
              borderRadius: 18,
              border: `1px solid ${C.border}`,
              textAlign: "center",
              padding: "0 20px",
            }}
          >
            {emptyStateMessage}
          </div>
        )}

        {historyError && hasPortfolioChart && !historyRefreshing ? (
          <div
            style={{
              marginTop: 10,
              color: C.sub,
              fontSize: 13,
              textAlign: "left",
            }}
          >
            {historyError}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartPeriodTabs period={period} onChange={handlePeriodChange} />
      </div>

      {!hasPortfolioChart && !hasRecordedTrades && !hasAnyPosition ? (
        <div
          style={{
            marginTop: 18,
            color: C.sub,
            fontSize: 14,
          }}
        >
          Add holdings to see the investing chart.
        </div>
      ) : null}
    </div>
  );
}

export default PortfolioCard;
