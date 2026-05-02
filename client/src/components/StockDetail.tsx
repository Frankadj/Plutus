import { useEffect, useMemo, useRef, useState } from "react";
import { C } from "../theme/colors";
import StockChart from "./StockChart";
import ChartLoadingSkeleton from "./ChartLoadingSkeleton";
import ChartRefreshOverlay from "./ChartRefreshOverlay";
import BuyModal from "./BuyModal";
import PriceAlertModal from "./PriceAlertModal";
import SellModal from "./SellModal";
import TickerLogo from "./TickerLogo";
import ChartPeriodTabs from "./ChartPeriodTabs";
import CorporateActionsSkeleton from "./CorporateActionsSkeleton";
import type { PortfolioTransaction, Position } from "../App";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { getApiBase } from "../lib/api";
import {
  getKwayisiEquityUrl,
  shouldUseDirectKwayisiBrowserData,
} from "../lib/kwayisi";
import {
  readPriceAlert,
  removePriceAlert,
  savePriceAlert,
  subscribePriceAlerts,
  type PriceAlert,
} from "../lib/priceAlerts";
import {
  readStockPageCache,
  writeStockPageCache,
} from "../lib/stockPageCache";
import {
  getChartPeriodLabel,
  type ChartPeriod,
} from "../utils/chartPeriods";
import {
  MARKET_CATEGORY_DEFINITIONS,
  resolveMarketCategory,
} from "../utils/marketCategories";

type Stock = {
  symbol?: string;
  ticker?: string;
  code?: string;
  name: string;
  companyName?: string;
  sector?: string;
  website?: string;
  logoUrl?: string;
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
  companyName: string;
  sector: string;
};

type StockProfileResponse = {
  companyName?: string;
  description?: string;
  sector?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  capital?: number | null;
  dps?: number | null;
  eps?: number | null;
  shares?: number | null;
  previousClose?: number | null;
  dividendYield?: number | null;
  company?: {
    name?: string;
    address?: string;
    directors?: string[];
    email?: string;
    facsimile?: string;
    sector?: string;
    industry?: string;
    telephone?: string;
    website?: string;
    logoUrl?: string;
  };
};

type KwayisiEquityResponse = {
  capital?: number | string | null;
  dps?: number | string | null;
  eps?: number | string | null;
  shares?: number | string | null;
  company?: {
    name?: string;
    address?: string;
    directors?: string[];
    email?: string;
    facsimile?: string;
    industry?: string;
    sector?: string;
    telephone?: string;
    website?: string;
  };
};

type StockAboutResponse = {
  description?: string;
  source?: string;
  pageTitle?: string;
  pageUrl?: string;
  pending?: boolean;
};

type CorporateActionItem = {
  id: string | number;
  title: string;
  source: string;
  time: string;
  url?: string;
  company?: string;
  publishedAt?: string;
  tags?: string[];
  scope?: "stock" | "market";
};

type StockCorporateActionsResponse = {
  fallbackUsed?: boolean;
  items?: CorporateActionItem[];
  pending?: boolean;
};

type StockDetailProps = {
  stock: Stock;
  onBack: () => void;
  cash: number;
  setCash: (val: number) => void;
  positions: Record<string, Position>;
  setPositions: (val: Record<string, Position>) => void;
  transactions: PortfolioTransaction[];
  setTransactions: (val: PortfolioTransaction[]) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string) => void;
};

type StockPeriod = ChartPeriod;

const STOCK_PROFILE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const STOCK_ABOUT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STOCK_HISTORY_CACHE_TTL_MS = 20 * 60 * 1000;
const STOCK_YEAR_HISTORY_CACHE_TTL_MS = 60 * 60 * 1000;
const STOCK_CORPORATE_ACTIONS_CACHE_TTL_MS = 45 * 60 * 1000;

const MARKET_CATEGORY_LABELS = new Map(
  MARKET_CATEGORY_DEFINITIONS.map((item) => [item.key, item.label] as const)
);

function filterCorporateActionItems(items: CorporateActionItem[]) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => item && item.scope !== "market"
  );
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

function getFallbackSectorLabel(stock: Stock, symbol: string) {
  if (stock.sector) {
    return stock.sector;
  }

  const category = resolveMarketCategory({
    symbol,
    ticker: stock.ticker,
    code: stock.code,
    name: stock.name,
    sector: stock.sector,
  });

  return category ? MARKET_CATEGORY_LABELS.get(category) || "Not available" : "Not available";
}

function createBootstrapCompanyInfo(stock: Stock, symbol: string): CompanyInfo {
  const companyName = stock.companyName || stock.name || symbol || "Not available";
  const sector = getFallbackSectorLabel(stock, symbol);
  const description =
    sector && sector !== "Not available"
      ? `${companyName} is listed on the Ghana Stock Exchange in the ${sector} sector.`
      : `${companyName} is listed on the Ghana Stock Exchange.`;

  return {
    description,
    companyName,
    sector,
  };
}

function createFallbackCompanyInfo(stockName: string, symbol: string): CompanyInfo {
  return {
    description: "Company information not available.",
    companyName: stockName || symbol || "Not available",
    sector: "Not available",
  };
}

function toNullableNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createKwayisiProfileResponse(
  symbol: string,
  stockName: string,
  payload: KwayisiEquityResponse
): StockProfileResponse {
  const company = payload?.company || {};
  const companyName = company.name || stockName || symbol;

  return {
    companyName,
    description: "",
    sector: company.sector || "",
    industry: company.industry || "",
    website: company.website || "",
    logoUrl: "",
    capital: toNullableNumber(payload?.capital),
    dps: toNullableNumber(payload?.dps),
    eps: toNullableNumber(payload?.eps),
    shares: toNullableNumber(payload?.shares),
    company: {
      name: companyName,
      address: company.address || "",
      directors: Array.isArray(company.directors) ? company.directors : [],
      email: company.email || "",
      facsimile: company.facsimile || "",
      industry: company.industry || "",
      sector: company.sector || "",
      telephone: company.telephone || "",
      website: company.website || "",
      logoUrl: "",
    },
  };
}

function createHistoryFallback(stock: Stock, period: StockPeriod): HistoryPoint[] {
  const currentPrice = Number(stock.price);
  const previousClose = currentPrice - Number(stock.change || 0);
  const safeCurrentPrice = Number.isFinite(currentPrice) ? currentPrice : 0;
  const safePreviousClose =
    Number.isFinite(previousClose) && previousClose > 0
      ? previousClose
      : safeCurrentPrice;

  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (period) {
    case "1W":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "1M":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "3M":
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case "6M":
      startDate.setMonth(endDate.getMonth() - 6);
      break;
    case "YTD":
      startDate.setMonth(0, 1);
      break;
    case "1Y":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case "5Y":
      startDate.setFullYear(endDate.getFullYear() - 5);
      break;
    case "ALL":
      startDate.setFullYear(endDate.getFullYear() - 8);
      break;
  }

  return [
    {
      date: startDate.toISOString().slice(0, 10),
      value: safePreviousClose,
    },
    {
      date: endDate.toISOString().slice(0, 10),
      value: safeCurrentPrice,
    },
  ];
}

function formatMoney(value: number | null | undefined) {
  const safeValue = Number(value);
  return Number.isFinite(safeValue) ? `₵${safeValue.toFixed(2)}` : "-";
}

function formatPercent(value: number | null | undefined) {
  const safeValue = Number(value);
  return Number.isFinite(safeValue) ? `${safeValue.toFixed(2)}%` : "-";
}

function formatCompactMoney(value: number | null | undefined) {
  const safeValue = Number(value);
  if (!Number.isFinite(safeValue)) {
    return "-";
  }

  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(safeValue);

  return `₵${compact}`;
}

function StatCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ textAlign: "left" }}>
      <div
        style={{
          fontSize: 12,
          color: C.sub,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.text,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function StockDetail({
  stock,
  onBack,
  cash,
  setCash,
  positions,
  setPositions,
  transactions,
  setTransactions,
  isInWatchlist,
  onToggleWatchlist,
}: StockDetailProps) {
  const apiBase = getApiBase();
  const isCompactLayout = useIsCompactLayout();
  const symbol = stock.symbol || stock.ticker || stock.code || "";
  const bootstrapCompanyInfo = useMemo(
    () => createBootstrapCompanyInfo(stock, symbol),
    [symbol, stock.code, stock.companyName, stock.name, stock.sector, stock.ticker]
  );
  const cachedBootstrapHistory = useMemo(
    () =>
      readStockPageCache<HistoryPoint[]>("history", symbol, "1W") ||
      createHistoryFallback(stock, "1W"),
    [stock.change, stock.price, symbol]
  );
  const cachedBootstrapYearHistory = useMemo(
    () => readStockPageCache<HistoryPoint[]>("history", symbol, "1Y") || [],
    [symbol]
  );
  const cachedBootstrapProfile = useMemo(
    () => readStockPageCache<StockProfileResponse>("profile", symbol),
    [symbol]
  );
  const cachedBootstrapAbout = useMemo(
    () => readStockPageCache<StockAboutResponse>("about", symbol),
    [symbol]
  );
  const cachedBootstrapCorporateActions = useMemo(
    () => readStockPageCache<StockCorporateActionsResponse>("corporate-actions", symbol),
    [symbol]
  );

  const [period, setPeriod] = useState<StockPeriod>("1W");
  const [showBuy, setShowBuy] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [activePriceAlert, setActivePriceAlert] = useState<PriceAlert | null>(() =>
    readPriceAlert(symbol)
  );

  const [history, setHistory] = useState<HistoryPoint[]>(cachedBootstrapHistory);
  const [yearHistory, setYearHistory] = useState<HistoryPoint[]>(
    cachedBootstrapYearHistory
  );
  const [historyLoading, setHistoryLoading] = useState(
    cachedBootstrapHistory.length < 2
  );
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const hasChartHistoryRef = useRef(cachedBootstrapHistory.length >= 2);
  const historyRequestIdRef = useRef(0);
  const latestFetchContextRef = useRef("");
  const [hoveredHistoryPoint, setHoveredHistoryPoint] = useState<HistoryPoint | null>(
    null
  );

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    if (cachedBootstrapAbout?.description) {
      return {
        description: cachedBootstrapAbout.description,
        companyName:
          cachedBootstrapProfile?.companyName ||
          cachedBootstrapProfile?.company?.name ||
          bootstrapCompanyInfo.companyName,
        sector:
          cachedBootstrapProfile?.company?.sector ||
          cachedBootstrapProfile?.sector ||
          bootstrapCompanyInfo.sector,
      };
    }

    if (cachedBootstrapProfile) {
      return {
        description:
          cachedBootstrapProfile.description || bootstrapCompanyInfo.description,
        companyName:
          cachedBootstrapProfile.companyName ||
          cachedBootstrapProfile.company?.name ||
          bootstrapCompanyInfo.companyName,
        sector:
          cachedBootstrapProfile.company?.sector ||
          cachedBootstrapProfile.sector ||
          bootstrapCompanyInfo.sector,
      };
    }

    return bootstrapCompanyInfo;
  });
  const [stockProfile, setStockProfile] = useState<StockProfileResponse | null>(
    cachedBootstrapProfile
  );
  const [corporateActions, setCorporateActions] = useState<CorporateActionItem[]>(
    () => filterCorporateActionItems(cachedBootstrapCorporateActions?.items || [])
  );
  const [corporateActionsLoading, setCorporateActionsLoading] = useState(
    !Array.isArray(cachedBootstrapCorporateActions?.items)
  );
  const [corporateActionsError, setCorporateActionsError] = useState("");

  const fetchContextKey = `${symbol}|${period}`;
  latestFetchContextRef.current = fetchContextKey;

  const resetChartState = () => {
    historyRequestIdRef.current += 1;
    const nextBootstrapHistory =
      readStockPageCache<HistoryPoint[]>("history", symbol, "1W") ||
      createHistoryFallback(stock, "1W");
    hasChartHistoryRef.current = nextBootstrapHistory.length >= 2;
    setHistory(nextBootstrapHistory);
    setHistoryError("");
    setHistoryLoading(nextBootstrapHistory.length < 2);
    setHistoryRefreshing(nextBootstrapHistory.length >= 2);
    setHoveredHistoryPoint(null);
  };

  const handlePeriodChange = (nextPeriod: StockPeriod) => {
    if (nextPeriod === period) {
      return;
    }

    setHoveredHistoryPoint(null);
    setPeriod(nextPeriod);
  };

  useEffect(() => {
    resetChartState();
    setActivePriceAlert(readPriceAlert(symbol));
    setYearHistory(readStockPageCache<HistoryPoint[]>("history", symbol, "1Y") || []);
    setStockProfile(readStockPageCache<StockProfileResponse>("profile", symbol));
    const cachedCorporateActions = readStockPageCache<StockCorporateActionsResponse>(
      "corporate-actions",
      symbol
    );
    setCorporateActions(filterCorporateActionItems(cachedCorporateActions?.items || []));
    setCorporateActionsLoading(!Array.isArray(cachedCorporateActions?.items));
    setCorporateActionsError("");
    const cachedAbout = readStockPageCache<StockAboutResponse>("about", symbol);
    const cachedProfile = readStockPageCache<StockProfileResponse>("profile", symbol);

    if (cachedAbout?.description) {
      setCompanyInfo({
        description: cachedAbout.description,
        companyName:
          cachedProfile?.companyName ||
          cachedProfile?.company?.name ||
          bootstrapCompanyInfo.companyName,
        sector:
          cachedProfile?.company?.sector ||
          cachedProfile?.sector ||
          bootstrapCompanyInfo.sector,
      });
    } else if (cachedProfile) {
      setCompanyInfo({
        description: cachedProfile.description || bootstrapCompanyInfo.description,
        companyName:
          cachedProfile.companyName ||
          cachedProfile.company?.name ||
          bootstrapCompanyInfo.companyName,
        sector:
          cachedProfile.company?.sector ||
          cachedProfile.sector ||
          bootstrapCompanyInfo.sector,
      });
    } else {
      setCompanyInfo(bootstrapCompanyInfo);
    }

    setPeriod("1W");
  }, [
    bootstrapCompanyInfo.companyName,
    bootstrapCompanyInfo.description,
    bootstrapCompanyInfo.sector,
    symbol,
  ]);

  useEffect(() => {
    return subscribePriceAlerts(() => {
      setActivePriceAlert(readPriceAlert(symbol));
    });
  }, [symbol]);

  const bellStroke = activePriceAlert ? C.green : C.text;

  useEffect(() => {
    const fetchContext = `${symbol}|${period}`;
    const controller = new AbortController();
    let retryTimer: number | null = null;

    const fetchHistory = async (attempt = 0) => {
      if (latestFetchContextRef.current !== fetchContext) {
        return;
      }

      const requestId = historyRequestIdRef.current + 1;
      historyRequestIdRef.current = requestId;
      const cachedHistory = readStockPageCache<HistoryPoint[]>(
        "history",
        symbol,
        period
      );
      const bootstrapHistory =
        cachedHistory && cachedHistory.length >= 2
          ? cachedHistory
          : createHistoryFallback(stock, period);
      const hasExistingChart = hasChartHistoryRef.current || bootstrapHistory.length >= 2;

      if (bootstrapHistory.length >= 2) {
        hasChartHistoryRef.current = true;
        setHistory(bootstrapHistory);
      }

      setHistoryLoading(!hasExistingChart);
      setHistoryRefreshing(hasExistingChart);
      setHistoryError("");

      try {
        if (!symbol) {
          setHistory([]);
          setHistoryError("Stock symbol missing.");
          return;
        }

        const url = `${apiBase}/api/stocks/${symbol}/history?range=${period}`;
        const res = await fetch(url, {
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          requestId !== historyRequestIdRef.current ||
          latestFetchContextRef.current !== fetchContext
        ) {
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load history: ${res.status}`);
        }

        const data = await res.json();

        if (
          controller.signal.aborted ||
          requestId !== historyRequestIdRef.current ||
          latestFetchContextRef.current !== fetchContext
        ) {
          return;
        }

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
          .filter((item) => !Number.isNaN(item.value))
          .sort((left, right) => left.date.localeCompare(right.date));

        if (cleanedHistory.length < 2) {
          hasChartHistoryRef.current = false;
          setHistory([]);
          setHistoryError("No historical data available.");
        } else {
          hasChartHistoryRef.current = true;
          setHistory(cleanedHistory);
          writeStockPageCache(
            "history",
            symbol,
            cleanedHistory,
            STOCK_HISTORY_CACHE_TTL_MS,
            period
          );

          if (cleanedHistory.length <= 2 && attempt < 1) {
            retryTimer = window.setTimeout(() => {
              void fetchHistory(attempt + 1);
            }, 1800);
          }
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== historyRequestIdRef.current ||
          latestFetchContextRef.current !== fetchContext
        ) {
          return;
        }

        console.error("Failed to load chart history:", error);
        if (!hasExistingChart) {
          hasChartHistoryRef.current = false;
          setHistory([]);
        }
        setHistoryError(
          hasExistingChart
            ? "Unable to refresh chart right now."
            : "Unable to load chart history right now."
        );
      } finally {
        if (
          requestId === historyRequestIdRef.current &&
          latestFetchContextRef.current === fetchContext
        ) {
          setHistoryLoading(false);
          setHistoryRefreshing(false);
        }
      }
    };

    void fetchHistory();

    return () => {
      controller.abort();
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [apiBase, period, stock.change, stock.price, symbol]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchYearHistory = async () => {
      try {
        if (!symbol) {
          setYearHistory([]);
          return;
        }

        const cachedYearHistory = readStockPageCache<HistoryPoint[]>(
          "history",
          symbol,
          "1Y"
        );
        if (Array.isArray(cachedYearHistory) && cachedYearHistory.length > 0) {
          setYearHistory(cachedYearHistory);
        }

        const res = await fetch(
          `${apiBase}/api/stocks/${symbol}/history?range=1Y`,
          {
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          setYearHistory([]);
          return;
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          setYearHistory([]);
          return;
        }

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
        if (cleanedYearHistory.length > 0) {
          writeStockPageCache(
            "history",
            symbol,
            cleanedYearHistory,
            STOCK_YEAR_HISTORY_CACHE_TTL_MS,
            "1Y"
          );
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setYearHistory([]);
      }
    };

    fetchYearHistory();

    return () => {
      controller.abort();
    };
  }, [apiBase, symbol]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCompanyInfo = async () => {
      if (!symbol) {
        setStockProfile(null);
        setCompanyInfo(createFallbackCompanyInfo(stock.name, symbol));
        return;
      }

      const cachedProfile = readStockPageCache<StockProfileResponse>("profile", symbol);
      const cachedAbout = readStockPageCache<StockAboutResponse>("about", symbol);
      let resolvedCompanyName =
        cachedProfile?.companyName ||
        cachedProfile?.company?.name ||
        bootstrapCompanyInfo.companyName;
      let resolvedSector =
        cachedProfile?.company?.sector ||
        cachedProfile?.sector ||
        bootstrapCompanyInfo.sector;

      if (cachedProfile) {
        setStockProfile(cachedProfile);
      }

      if (cachedAbout?.description) {
        setCompanyInfo({
          description: cachedAbout.description,
          companyName: resolvedCompanyName,
          sector: resolvedSector,
        });
      } else if (cachedProfile) {
        setCompanyInfo({
          description: cachedProfile.description || bootstrapCompanyInfo.description,
          companyName: resolvedCompanyName,
          sector: resolvedSector,
        });
      } else {
        setCompanyInfo(bootstrapCompanyInfo);
      }

      void (async () => {
        try {
          const aboutRes = await fetch(`${apiBase}/api/stocks/${symbol}/about`, {
            signal: controller.signal,
          });

          if (!aboutRes.ok || controller.signal.aborted) {
            return;
          }

          const aboutData: StockAboutResponse = await aboutRes.json();
          if (controller.signal.aborted || !aboutData?.description) {
            return;
          }

          writeStockPageCache("about", symbol, aboutData, STOCK_ABOUT_CACHE_TTL_MS);
          setCompanyInfo((current) => ({
            description: aboutData.description || current.description,
            companyName: current.companyName || resolvedCompanyName,
            sector: current.sector || resolvedSector,
          }));
        } catch {
          // Keep the stock detail description if the about resolver fails.
        }
      })();

      try {
        const stockProfileUrl = shouldUseDirectKwayisiBrowserData()
          ? getKwayisiEquityUrl(symbol)
          : `${apiBase}/api/stocks/${symbol}`;
        const stockRes = await fetch(stockProfileUrl, {
          signal: controller.signal,
        });

        if (!stockRes.ok) {
          throw new Error(`Failed to load stock detail: ${stockRes.status}`);
        }

        const rawData = await stockRes.json();
        const data: StockProfileResponse = shouldUseDirectKwayisiBrowserData()
          ? createKwayisiProfileResponse(
              symbol,
              stock.companyName || stock.name,
              rawData as KwayisiEquityResponse
            )
          : (rawData as StockProfileResponse);
        if (controller.signal.aborted) {
          return;
        }

        const company = data.company || {};
        const description =
          data.description ||
          "Company information not available.";
        resolvedCompanyName =
          data.companyName || company.name || stock.name || symbol;
        resolvedSector =
          company.sector || data.sector || stock.sector || "Not available";

        setStockProfile(data);
        writeStockPageCache("profile", symbol, data, STOCK_PROFILE_CACHE_TTL_MS);
        setCompanyInfo({
          description: cachedAbout?.description || description,
          companyName: resolvedCompanyName,
          sector: resolvedSector,
        });
      } catch {
        if (controller.signal.aborted) {
          return;
        }
        setStockProfile(cachedProfile || null);
        setCompanyInfo(
          cachedAbout?.description
            ? {
                description: cachedAbout.description,
                companyName:
                  cachedProfile?.companyName ||
                  cachedProfile?.company?.name ||
                  bootstrapCompanyInfo.companyName,
                sector:
                  cachedProfile?.company?.sector ||
                  cachedProfile?.sector ||
                  bootstrapCompanyInfo.sector,
              }
            : cachedProfile
              ? {
                  description:
                    cachedProfile.description || bootstrapCompanyInfo.description,
                  companyName:
                    cachedProfile.companyName ||
                    cachedProfile.company?.name ||
                    bootstrapCompanyInfo.companyName,
                  sector:
                    cachedProfile.company?.sector ||
                    cachedProfile.sector ||
                    bootstrapCompanyInfo.sector,
                }
              : bootstrapCompanyInfo
        );
      }
    };

    fetchCompanyInfo();

    return () => {
      controller.abort();
    };
  }, [apiBase, bootstrapCompanyInfo, stock.name, symbol]);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | null = null;
    const hasExistingCorporateActions = corporateActions.length > 0;

    const fetchCorporateActions = async () => {
      if (!symbol) {
        setCorporateActions([]);
        setCorporateActionsLoading(false);
        setCorporateActionsError("Stock symbol missing.");
        return;
      }

      setCorporateActionsLoading((current) => current || !hasExistingCorporateActions);
      setCorporateActionsError("");

      try {
        const res = await fetch(`${apiBase}/api/stocks/${symbol}/corporate-actions`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to load corporate actions: ${res.status}`);
        }

        const data: StockCorporateActionsResponse = await res.json();
        const items = filterCorporateActionItems(data.items || []);

        if (data.pending && items.length === 0) {
          retryTimer = window.setTimeout(() => {
            void fetchCorporateActions();
          }, 2500);
          return;
        }

        setCorporateActions(items);
        writeStockPageCache(
          "corporate-actions",
          symbol,
          {
            items,
            fallbackUsed: false,
          },
          STOCK_CORPORATE_ACTIONS_CACHE_TTL_MS
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to load corporate actions:", error);
        if (!hasExistingCorporateActions) {
          setCorporateActions([]);
        }
        setCorporateActionsError("Unable to load corporate actions right now.");
      } finally {
        if (!controller.signal.aborted) {
          setCorporateActionsLoading(false);
        }
      }
    };

    void fetchCorporateActions();

    return () => {
      controller.abort();
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [apiBase, symbol]);

  const position = positions[symbol] || { shares: 0, totalCost: 0 };
  const ownedShares = position.shares;
  const currentValue = ownedShares * Number(stock.price);
  const avgCost = ownedShares > 0 ? position.totalCost / ownedShares : 0;
  const todaysReturn = ownedShares * Number(stock.change);
  const totalReturn = currentValue - position.totalCost;

  const stats = useMemo(() => {
    const historyValues = history.map((item) => item.value);
    const yearValues = yearHistory.map((item) => item.value);

    const open = history.length > 0 ? history[0].value : Number(stock.price);
    const high =
      historyValues.length > 0 ? Math.max(...historyValues) : Number(stock.price);
    const apiPreviousClose = Number(stockProfile?.previousClose);
    const fallbackPreviousClose = Number(stock.price) - Number(stock.change);
    const previousClose = Number.isFinite(apiPreviousClose) && apiPreviousClose > 0
      ? apiPreviousClose
      : Number.isFinite(fallbackPreviousClose) && fallbackPreviousClose > 0
        ? fallbackPreviousClose
        : Number(stock.price);
    const apiDividendYield = Number(stockProfile?.dividendYield);
    const dividendYield = Number.isFinite(apiDividendYield)
      ? apiDividendYield
      : null;
    const marketCap = Number(stockProfile?.capital);

    const high52 =
      yearValues.length > 0 ? Math.max(...yearValues) : Number(stock.price);
    const low52 =
      yearValues.length > 0 ? Math.min(...yearValues) : Number(stock.price);

    return {
      open,
      high,
      high52,
      low52,
      previousClose,
      marketCap: Number.isFinite(marketCap) ? marketCap : null,
      dividendYield,
      volume: Number(stock.volume),
    };
  }, [
    history,
    yearHistory,
    stock.change,
    stock.price,
    stock.volume,
    stockProfile?.capital,
    stockProfile?.dividendYield,
    stockProfile?.previousClose,
  ]);

  const displayCompanyName =
    stockProfile?.companyName ||
    stockProfile?.company?.name ||
    companyInfo.companyName ||
    stock.companyName ||
    stock.name;
  const displaySector =
    stockProfile?.company?.sector ||
    stockProfile?.sector ||
    companyInfo.sector ||
    stock.sector ||
    bootstrapCompanyInfo.sector;
  const hasHistoryChart = history.length >= 2;
  const latestHistoryPoint = hasHistoryChart ? history[history.length - 1] : null;
  const previewPoint = hoveredHistoryPoint || latestHistoryPoint;
  const rangeStartPoint = hasHistoryChart ? history[0] : null;
  const displayPriceTarget = previewPoint
    ? previewPoint.value
    : Number(stock.price);
  const displayChangeTarget =
    previewPoint && rangeStartPoint
      ? previewPoint.value - rangeStartPoint.value
      : Number(stock.change);
  const displayChangePercentTarget =
    previewPoint && rangeStartPoint && rangeStartPoint.value !== 0
      ? (displayChangeTarget / rangeStartPoint.value) * 100
      : Number(stock.changePercent);
  const displayPrice = useAnimatedNumber(displayPriceTarget);
  const displayChange = useAnimatedNumber(displayChangeTarget);
  const displayChangePercent = useAnimatedNumber(displayChangePercentTarget);
  const displayPositive = displayChange >= 0;
  const selectedPeriodLabel = getChartPeriodLabel(period);
  const chartPositive =
    hasHistoryChart && rangeStartPoint
      ? history[history.length - 1].value >= rangeStartPoint.value
      : Number(stock.change) >= 0;
  const detailGridColumns = "repeat(2, minmax(0, 1fr))";

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
          gap: isCompactLayout ? 10 : 12,
          padding: isCompactLayout ? "14px 14px 12px" : "18px 20px 16px",
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <TickerLogo
          symbol={symbol}
          size={isCompactLayout ? 42 : 50}
          logoUrl={stockProfile?.company?.logoUrl || stockProfile?.logoUrl || stock.logoUrl}
        />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isCompactLayout ? 18 : 20,
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            {symbol || "N/A"}
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
            {displayCompanyName}
          </div>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: isCompactLayout ? 12 : 14,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => onToggleWatchlist(symbol)}
            aria-label={
              isInWatchlist
                ? `Remove ${symbol || displayCompanyName} from watchlist`
                : `Add ${symbol || displayCompanyName} to watchlist`
            }
            style={{
              background: "none",
              border: "none",
              color: isInWatchlist ? C.green : C.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg
              width="29"
              height="29"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isInWatchlist ? C.green : C.text}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isInWatchlist ? (
                <path d="M5 12.5 9.2 16.5 19 7.5" />
              ) : (
                <>
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setShowPriceAlertModal(true)}
            aria-label={`Set price alert for ${symbol || displayCompanyName}`}
            style={{
              background: "none",
              border: "none",
              color: bellStroke,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <svg
              width="31"
              height="31"
              viewBox="0 0 24 24"
              fill="none"
              stroke={bellStroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 17H9c-1.7 0-2.56 0-2.83-.38-.27-.38.03-1.16.62-2.72.29-.77.54-1.64.54-2.9v-.6a4.67 4.67 0 1 1 9.34 0v.6c0 1.26.25 2.13.54 2.9.59 1.56.89 2.34.62 2.72-.27.38-1.13.38-2.83.38Z" />
              <path d="M10.35 20a1.9 1.9 0 0 0 3.3 0" />
              <path d="M5.25 7.8c-.43.37-.73.82-.92 1.36" />
              <path d="M18.75 7.8c.43.37.73.82.92 1.36" />
            </svg>
          </button>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          padding: isCompactLayout ? "18px 14px 136px" : "24px 20px 140px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ marginBottom: 24, textAlign: "left" }}>
          <div
            style={{
              fontSize: isCompactLayout ? 36 : 44,
              fontWeight: 600,
              color: C.text,
              lineHeight: 1,
              letterSpacing: "-1px",
            }}
          >
            ₵{displayPrice.toFixed(2)}
          </div>

          <div
            style={{
              marginTop: 12,
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexWrap: isCompactLayout ? "wrap" : "nowrap",
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  fontSize: isCompactLayout ? 16 : 18,
                  color: displayPositive ? C.green : C.red,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {displayPositive ? "+" : "-"}
                {Math.abs(displayChange).toFixed(2)} ({displayPositive ? "+" : "-"}
                {Math.abs(displayChangePercent).toFixed(2)}%)
              </div>

              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.sub,
                  fontSize: isCompactLayout ? 10 : 11,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {selectedPeriodLabel}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          {historyLoading && !hasHistoryChart ? (
            <ChartLoadingSkeleton />
          ) : hasHistoryChart ? (
            <div style={{ position: "relative" }}>
              <StockChart
                history={history}
                positive={chartPositive}
                onHoverChange={setHoveredHistoryPoint}
              />
              {historyRefreshing ? <ChartRefreshOverlay /> : null}
            </div>
          ) : (
            <div
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 20,
                background: C.card,
                color: C.sub,
              }}
            >
              {historyError || "No historical data available."}
            </div>
          )}

          {hasHistoryChart && historyError && !historyRefreshing ? (
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

        <div style={{ marginBottom: 40 }}>
          <ChartPeriodTabs
            period={period}
            onChange={handlePeriodChange}
          />
        </div>

        {ownedShares > 0 && (
          <>
            <h3
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: 20,
                fontWeight: 700,
                color: C.text,
                textAlign: "left",
              }}
            >
              Ownership
            </h3>

            <div style={{ marginBottom: 56, textAlign: "left" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: detailGridColumns,
                  gap: isCompactLayout ? 16 : 20,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
                    Shares Owned
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                    {ownedShares}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
                    Market Value
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                    {formatMoney(currentValue)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: detailGridColumns,
                  gap: isCompactLayout ? 16 : 20,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
                    Avg. Cost
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                    {formatMoney(avgCost)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
                    Today's Return
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: todaysReturn >= 0 ? C.green : C.red,
                    }}
                  >
                    {todaysReturn >= 0 ? "+" : "-"}
                    {formatMoney(Math.abs(todaysReturn))}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 4 }}>
                  Total Return
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: totalReturn >= 0 ? C.green : C.red,
                  }}
                >
                  {totalReturn >= 0 ? "+" : "-"}
                  {formatMoney(Math.abs(totalReturn))}
                </div>
              </div>
            </div>
          </>
        )}

        <h3
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            textAlign: "left",
          }}
        >
          Stats
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: detailGridColumns,
            justifyItems: "start",
            alignItems: "start",
            gap: isCompactLayout ? "18px 18px" : "24px 40px",
            marginBottom: 56,
            textAlign: "left",
          }}
        >
          <StatCell label="Open" value={formatMoney(stats.open)} />
          <StatCell label="Previous Close" value={formatMoney(stats.previousClose)} />
          <StatCell label="High" value={formatMoney(stats.high)} />
          <StatCell label="Volume" value={stats.volume.toLocaleString()} />
          <StatCell label="Market Cap" value={formatCompactMoney(stats.marketCap)} />
          <StatCell
            label="Dividend Yield"
            value={formatPercent(stats.dividendYield)}
          />
          <StatCell label="52 WK High" value={formatMoney(stats.high52)} />
          <StatCell label="52 WK Low" value={formatMoney(stats.low52)} />
        </div>

        <h3
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            textAlign: "left",
          }}
        >
          About
        </h3>

        <div style={{ marginBottom: 56, textAlign: "left" }}>
          <div
            style={{
              color: C.text,
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            {companyInfo.description}
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 8 }}>
              Company
            </div>
            <div
              style={{
                color: C.text,
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              {displayCompanyName}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ color: C.sub, fontSize: 13, marginBottom: 8 }}>
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
              {displaySector}
            </div>
          </div>
        </div>

        <h3
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            textAlign: "left",
          }}
        >
          Corporate Actions & Events
        </h3>

        <div style={{ marginBottom: 56, textAlign: "left" }}>
          {corporateActionsLoading ? (
            <CorporateActionsSkeleton rows={3} />
          ) : corporateActionsError ? (
            <div style={{ color: C.sub }}>{corporateActionsError}</div>
          ) : corporateActions.length === 0 ? (
            <div style={{ color: C.sub }}>
              No recent corporate actions or events are available for this stock right now.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {corporateActions.map((item, index) => (
                  <a
                    key={item.id}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      padding: "14px 0",
                      borderBottom:
                        index < corporateActions.length - 1
                          ? `1px solid ${C.border}`
                          : "none",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {Array.isArray(item.tags) && item.tags.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        {item.tags.map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            style={{
                              padding: "5px 10px",
                              borderRadius: 999,
                              border: `1px solid ${C.border}`,
                              background: C.card,
                              color: C.sub,
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.03em",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div
                      style={{
                        color: C.text,
                        fontSize: 15,
                        fontWeight: 600,
                        lineHeight: 1.45,
                        marginBottom: 8,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        color: C.sub,
                        fontSize: 12,
                      }}
                    >
                      <span>{item.source}</span>
                      {item.company ? (
                        <>
                          <span>•</span>
                          <span>{item.company}</span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: C.bg,
          padding: isCompactLayout
            ? "12px 14px calc(12px + env(safe-area-inset-bottom, 0px))"
            : "12px 16px",
          borderTop: `1px solid ${C.border}`,
          display: "grid",
          gridTemplateColumns: ownedShares > 0 ? "1fr 1fr" : "1fr",
          gap: 12,
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setShowBuy(true)}
          style={{
            background: C.green,
            color: "#000",
            border: "none",
            borderRadius: "16px",
            padding: "16px",
            fontSize: isCompactLayout ? "17px" : "18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Buy
        </button>

        {ownedShares > 0 && (
          <button
            onClick={() => setShowSell(true)}
            style={{
              background: C.green,
              color: "#000",
              border: "none",
              borderRadius: "16px",
              padding: "16px",
              fontSize: isCompactLayout ? "17px" : "18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Sell
          </button>
        )}
      </div>

      {showBuy && (
        <BuyModal
          stock={{ ...stock, symbol }}
          cash={cash}
          setCash={setCash}
          positions={positions}
          setPositions={setPositions}
          transactions={transactions}
          setTransactions={setTransactions}
          onClose={() => setShowBuy(false)}
        />
      )}

      {showSell && (
        <SellModal
          stock={{ ...stock, symbol }}
          cash={cash}
          setCash={setCash}
          positions={positions}
          setPositions={setPositions}
          transactions={transactions}
          setTransactions={setTransactions}
          onClose={() => setShowSell(false)}
        />
      )}

      {showPriceAlertModal && (
        <PriceAlertModal
          stock={{ symbol, price: Number(stock.price) }}
          existingAlert={activePriceAlert}
          onSave={(nextAlert) => {
            savePriceAlert(nextAlert);
            setActivePriceAlert(nextAlert);
            setShowPriceAlertModal(false);
          }}
          onRemove={() => {
            removePriceAlert(symbol);
            setActivePriceAlert(null);
            setShowPriceAlertModal(false);
          }}
          onClose={() => setShowPriceAlertModal(false)}
        />
      )}
    </div>
  );
}

export default StockDetail;
