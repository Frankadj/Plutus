import { C } from "./theme/colors";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import StockList from "./components/StockList";
import StockDetail from "./components/StockDetail";
import PortfolioCard from "./components/PortfolioCard";
import BuyingPowerCard from "./components/BuyingPowerCard";
import WatchlistSection from "./components/WatchlistSection";
import HomeHeader from "./components/HomeHeader";
import BottomNav from "./components/BottomNav";
import NewsSection from "./components/NewsSection";
import NewsScreen from "./components/NewsScreen";
import ProfileScreen from "./components/ProfileScreen";
import MarketScreen from "./components/MarketScreen";
import PortfolioBreakdownScreen from "./components/PortfolioBreakdownScreen";
import IndexDetailScreen from "./components/IndexDetailScreen";
import MarketHeatmapScreen from "./components/MarketHeatmapScreen";
import AppLoadingSkeleton from "./components/AppLoadingSkeleton";
import AlertToastStack, {
  type AlertToastItem,
} from "./components/AlertToastStack";
import { getApiBase } from "./lib/api";
import {
  getKwayisiLiveUrl,
  shouldUseDirectKwayisiBrowserData,
} from "./lib/kwayisi";
import {
  deriveStockChangePercent,
  resolveStockDisplayName,
  resolveStockSymbolFromIdentity,
} from "./lib/stockMetadata";
import {
  markPriceAlertTriggered,
  readEnabledPriceAlerts,
} from "./lib/priceAlerts";
import {
  applyThemeMode,
  persistThemeMode,
  readStoredThemeMode,
  type ThemeMode,
} from "./lib/theme";
import useIsCompactLayout from "./hooks/useIsCompactLayout";

export type Stock = {
  symbol?: string;
  ticker?: string;
  code?: string;
  name: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

export type Position = {
  shares: number;
  totalCost: number;
};

export type PortfolioTransaction = {
  id: string;
  symbol: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  total: number;
  timestamp: number;
  realizedPnl?: number;
  averageCostPerShare?: number;
  remainingSharesAfter?: number;
};

export type IndexSummary = {
  code: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  ytdChange?: number;
  ytdChangePercent?: number;
  lastDate?: string;
};

type NewsItem = {
  id: string | number;
  headline: string;
  source: string;
  time: string;
  url?: string;
  image?: string;
};

const CASH_STORAGE_KEY = "plutus_cash";
const POSITIONS_STORAGE_KEY = "plutus_positions";
const TRANSACTIONS_STORAGE_KEY = "plutus_transactions";
const WATCHLIST_STORAGE_KEY = "plutus_watchlist";
const STOCK_ACTIVE_REFRESH_MS = 15000;
const INDEX_ACTIVE_REFRESH_MS = 60 * 1000;
const NEWS_ACTIVE_REFRESH_MS = 120 * 1000;
const NEWS_BACKGROUND_REFRESH_MS = 15 * 60 * 1000;
const INITIAL_NEWS_FETCH_DELAY_MS = 350;
const NEWS_COLD_START_RETRY_MS = 3000;
const ALERT_TOAST_DURATION_MS = 6500;
const MAX_ALERT_TOASTS = 4;

function resolveStockSymbol(stock: Partial<Stock>) {
  return resolveStockSymbolFromIdentity(stock);
}

function normalizeStock(stock: Stock): Stock {
  const resolvedSymbol = resolveStockSymbol(stock);
  const price = Number(stock.price ?? 0);
  const change = Number(stock.change ?? 0);
  const displayName = resolveStockDisplayName(stock, resolvedSymbol);
  const changePercent = deriveStockChangePercent(
    price,
    change,
    stock.changePercent
  );

  return {
    symbol: resolvedSymbol,
    ticker: stock.ticker || resolvedSymbol,
    code: stock.code || resolvedSymbol,
    name: displayName,
    companyName: displayName,
    sector: stock.sector || "",
    industry: stock.industry || "",
    website: stock.website || "",
    logoUrl: stock.logoUrl || "",
    price,
    change,
    changePercent,
    volume: Number(stock.volume ?? 0),
  };
}

function formatAlertPrice(value: number) {
  return `₵${Number(value || 0).toFixed(2)}`;
}

function App() {
  const apiBase = getApiBase();
  const isCompactLayout = useIsCompactLayout();
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const previousStocksBySymbolRef = useRef<Map<string, Stock>>(new Map());
  const alertToastTimersRef = useRef<Record<string, number>>({});
  const pendingScrollActionRef = useRef<
    | { type: "reset" }
    | { type: "restore"; key: string }
    | null
  >(null);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string | null>(
    null
  );
  const [selectedStockSnapshot, setSelectedStockSnapshot] =
    useState<Stock | null>(null);
  const [selectedStockReturnKey, setSelectedStockReturnKey] =
    useState<string>("home");
  const [indices, setIndices] = useState<IndexSummary[]>([]);
  const [selectedIndexCode, setSelectedIndexCode] = useState<string | null>(null);
  const [selectedIndexSnapshot, setSelectedIndexSnapshot] =
    useState<IndexSummary | null>(null);
  const [showNewsScreen, setShowNewsScreen] = useState(false);
  const [showBreakdownScreen, setShowBreakdownScreen] = useState(false);
  const [showHeatmapScreen, setShowHeatmapScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "market" | "profile">("home");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stocksError, setStocksError] = useState("");
  const [indicesError, setIndicesError] = useState("");
  const [newsError, setNewsError] = useState("");
  const [newsLoading, setNewsLoading] = useState(true);
  const [alertToasts, setAlertToasts] = useState<AlertToastItem[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readStoredThemeMode()
  );
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(() => {
    try {
      const savedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (!savedWatchlist) return [];
      const parsed = JSON.parse(savedWatchlist);
      return Array.isArray(parsed)
        ? parsed
            .map((value) => String(value || "").toUpperCase().trim())
            .filter(Boolean)
        : [];
    } catch {
      return [];
    }
  });

  const [cash, setCash] = useState<number>(() => {
    try {
      const savedCash = localStorage.getItem(CASH_STORAGE_KEY);
      if (!savedCash) return 10000;
      const parsed = Number(savedCash);
      return Number.isFinite(parsed) ? parsed : 10000;
    } catch {
      return 10000;
    }
  });

  const [positions, setPositions] = useState<Record<string, Position>>(() => {
    try {
      const savedPositions = localStorage.getItem(POSITIONS_STORAGE_KEY);
      if (!savedPositions) return {};
      const parsed = JSON.parse(savedPositions);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>(() => {
    try {
      const savedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (!savedTransactions) return [];
      const parsed = JSON.parse(savedTransactions);

      return Array.isArray(parsed)
        ? parsed
            .map<PortfolioTransaction>((item) => ({
              id: String(item?.id || ""),
              symbol: String(item?.symbol || "").toUpperCase().trim(),
              type: item?.type === "sell" ? "sell" : "buy",
              shares: Number(item?.shares || 0),
              price: Number(item?.price || 0),
              total: Number(item?.total || 0),
              timestamp: Number(item?.timestamp || 0),
              realizedPnl: Number(item?.realizedPnl || 0),
              averageCostPerShare: Number(item?.averageCostPerShare || 0),
              remainingSharesAfter: Number(item?.remainingSharesAfter || 0),
            }))
            .filter((item) => item.id && item.symbol && item.shares > 0)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CASH_STORAGE_KEY, String(cash));
    } catch {
      // Ignore local storage write failures.
    }
  }, [cash]);

  useEffect(() => {
    try {
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // Ignore local storage write failures.
    }
  }, [positions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TRANSACTIONS_STORAGE_KEY,
        JSON.stringify(transactions)
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        WATCHLIST_STORAGE_KEY,
        JSON.stringify(watchlistSymbols)
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [watchlistSymbols]);

  useEffect(() => {
    applyThemeMode(themeMode);
    persistThemeMode(themeMode);
  }, [themeMode]);

  const dismissAlertToast = (id: string) => {
    const existingTimer = alertToastTimersRef.current[id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      delete alertToastTimersRef.current[id];
    }

    setAlertToasts((current) => current.filter((item) => item.id !== id));
  };

  const pushAlertToast = (toast: AlertToastItem) => {
    setAlertToasts((current) => [toast, ...current].slice(0, MAX_ALERT_TOASTS));

    const existingTimer = alertToastTimersRef.current[toast.id];
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    alertToastTimersRef.current[toast.id] = window.setTimeout(() => {
      dismissAlertToast(toast.id);
    }, ALERT_TOAST_DURATION_MS);
  };

  const showBrowserPriceAlertNotification = (
    symbol: string,
    title: string,
    message: string
  ) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      return;
    }

    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      typeof document.hasFocus === "function" &&
      document.hasFocus()
    ) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        tag: `price-alert:${symbol}`,
      });

      notification.onclick = () => {
        if (typeof window !== "undefined") {
          window.focus();
        }
        notification.close();
      };
    } catch {
      // Ignore Notification API failures.
    }
  };

  const evaluatePriceAlerts = (nextStocks: Stock[]) => {
    const previousStocksBySymbol = previousStocksBySymbolRef.current;
    const nextStocksBySymbol = new Map(
      nextStocks.map((stock) => [resolveStockSymbol(stock), stock] as const)
    );

    if (previousStocksBySymbol.size === 0) {
      previousStocksBySymbolRef.current = nextStocksBySymbol;
      return;
    }

    const enabledAlerts = readEnabledPriceAlerts();

    for (const alert of enabledAlerts) {
      const symbol = String(alert.symbol || "").toUpperCase().trim();
      const previousStock = previousStocksBySymbol.get(symbol);
      const currentStock = nextStocksBySymbol.get(symbol);
      if (!previousStock || !currentStock) {
        continue;
      }

      const previousPrice = Number(previousStock.price);
      const currentPrice = Number(currentStock.price);
      const targetPrice = Number(alert.targetPrice);

      if (
        !Number.isFinite(previousPrice) ||
        !Number.isFinite(currentPrice) ||
        !Number.isFinite(targetPrice) ||
        targetPrice <= 0
      ) {
        continue;
      }

      const crossed =
        alert.direction === "above"
          ? previousPrice < targetPrice && currentPrice >= targetPrice
          : previousPrice > targetPrice && currentPrice <= targetPrice;

      if (!crossed) {
        continue;
      }

      markPriceAlertTriggered(symbol, {
        triggerPrice: currentPrice,
        triggeredAt: Date.now(),
      });

      const title = `${symbol} price alert`;
      const message = `${symbol} moved ${
        alert.direction === "above" ? "above" : "below"
      } ${formatAlertPrice(targetPrice)}. Current price: ${formatAlertPrice(
        currentPrice
      )}.`;
      const toastId = `${symbol}-${Date.now()}`;

      pushAlertToast({
        id: toastId,
        symbol,
        title,
        message,
      });
      showBrowserPriceAlertNotification(symbol, title, message);
    }

    previousStocksBySymbolRef.current = nextStocksBySymbol;
  };

  useEffect(() => {
    return () => {
      Object.values(alertToastTimersRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      alertToastTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    let newsTimerId: number | null = null;
    let initialNewsTimerId: number | null = null;
    let isNewsFetchInFlight = false;
    let isUnmounted = false;

    const fetchStocks = async () => {
      try {
        const stocksUrl = shouldUseDirectKwayisiBrowserData()
          ? getKwayisiLiveUrl()
          : `${apiBase}/api/stocks`;
        const stocksRes = await fetch(stocksUrl);

        if (!stocksRes.ok) {
          throw new Error("Failed to load stock data");
        }

        const stocksData = await stocksRes.json();

        if (Array.isArray(stocksData)) {
          const nextStocks = stocksData.map(normalizeStock);
          evaluatePriceAlerts(nextStocks);
          setStocks(nextStocks);
          setStocksError("");
        } else {
          throw new Error("Invalid stock data");
        }
      } catch {
        setStocksError("Unable to load live stock data right now.");
      } finally {
        setLoading(false);
      }
    };

    const scheduleNextNewsFetch = () => {
      if (typeof document === "undefined") {
        return;
      }

      if (newsTimerId !== null) {
        window.clearTimeout(newsTimerId);
      }

      const refreshInterval =
        document.visibilityState === "visible"
          ? NEWS_ACTIVE_REFRESH_MS
          : NEWS_BACKGROUND_REFRESH_MS;

      newsTimerId = window.setTimeout(() => {
        void fetchNews(document.visibilityState === "visible");
      }, refreshInterval);
    };

    const scheduleColdStartNewsRetry = () => {
      if (typeof document === "undefined") {
        return;
      }

      if (newsTimerId !== null) {
        window.clearTimeout(newsTimerId);
      }

      newsTimerId = window.setTimeout(() => {
        void fetchNews(false);
      }, NEWS_COLD_START_RETRY_MS);
    };

    const fetchNews = async (forceRefresh = false) => {
      if (isNewsFetchInFlight) {
        return;
      }

      isNewsFetchInFlight = true;
      let shouldScheduleStandardRefresh = true;

      try {
        const refreshQuery = forceRefresh ? "?refresh=1" : "";
        const newsRes = await fetch(`${apiBase}/api/news${refreshQuery}`);

        if (!newsRes.ok) {
          throw new Error("Failed to load news");
        }

        const newsData = await newsRes.json();

        if (Array.isArray(newsData)) {
          setNewsError("");

          if (newsData.length > 0) {
            setNews(newsData);
            setNewsLoading(false);
          } else if (!isUnmounted) {
            setNewsLoading(true);
            shouldScheduleStandardRefresh = false;
            scheduleColdStartNewsRetry();
            return;
          }
        }
      } catch {
        setNewsError("Unable to load news right now.");
        setNewsLoading(false);
      } finally {
        isNewsFetchInFlight = false;
        if (!isUnmounted && shouldScheduleStandardRefresh) {
          scheduleNextNewsFetch();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document === "undefined") {
        return;
      }

      if (newsTimerId !== null) {
        window.clearTimeout(newsTimerId);
        newsTimerId = null;
      }

      void fetchNews(document.visibilityState === "visible");
    };

    fetchStocks();
    initialNewsTimerId = window.setTimeout(() => {
      void fetchNews(false);
    }, INITIAL_NEWS_FETCH_DELAY_MS);

    const stocksInterval = setInterval(fetchStocks, STOCK_ACTIVE_REFRESH_MS);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isUnmounted = true;
      clearInterval(stocksInterval);
      if (initialNewsTimerId !== null) {
        window.clearTimeout(initialNewsTimerId);
      }
      if (newsTimerId !== null) {
        window.clearTimeout(newsTimerId);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [apiBase]);

  useEffect(() => {
    let isUnmounted = false;

    const fetchIndices = async () => {
      try {
        const indicesRes = await fetch(`${apiBase}/api/indices`);

        if (!indicesRes.ok) {
          throw new Error("Failed to load indices");
        }

        const indicesData = await indicesRes.json();

        if (!isUnmounted && Array.isArray(indicesData)) {
          setIndices(indicesData);
          setIndicesError("");
        }
      } catch {
        if (!isUnmounted) {
          setIndicesError("Unable to load market indices right now.");
        }
      }
    };

    void fetchIndices();
    const indicesInterval = window.setInterval(fetchIndices, INDEX_ACTIVE_REFRESH_MS);

    return () => {
      isUnmounted = true;
      window.clearInterval(indicesInterval);
    };
  }, [apiBase]);

  const ownedStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const symbol = resolveStockSymbol(stock);
      return (positions[symbol]?.shares || 0) > 0;
    });
  }, [stocks, positions]);

  const watchlistStocks = useMemo(() => {
    const liveStocksBySymbol = new Map(
      stocks.map((stock) => [resolveStockSymbol(stock), normalizeStock(stock)] as const)
    );

    return watchlistSymbols
      .map((symbol) => liveStocksBySymbol.get(symbol))
      .filter((stock): stock is Stock => Boolean(stock));
  }, [stocks, watchlistSymbols]);

  const selectedStock = useMemo(() => {
    if (!selectedStockSymbol) return null;

    const liveStock = stocks.find((stock) => {
      const symbol = stock.symbol || stock.ticker || stock.code || "";
      return symbol === selectedStockSymbol;
    });

    if (liveStock) {
      return normalizeStock(liveStock);
    }

    return selectedStockSnapshot ? normalizeStock(selectedStockSnapshot) : null;
  }, [selectedStockSnapshot, selectedStockSymbol, stocks]);

  const selectedIndex = useMemo(() => {
    if (!selectedIndexCode) {
      return null;
    }

    const liveIndex = indices.find((item) => item.code === selectedIndexCode);
    return liveIndex || selectedIndexSnapshot;
  }, [indices, selectedIndexCode, selectedIndexSnapshot]);

  const toggleWatchlistSymbol = (symbol: string) => {
    const normalizedSymbol = String(symbol || "").toUpperCase().trim();
    if (!normalizedSymbol) {
      return;
    }

    setWatchlistSymbols((current) =>
      current.includes(normalizedSymbol)
        ? current.filter((item) => item !== normalizedSymbol)
        : [...current, normalizedSymbol]
    );
  };

  const activeScreenKey = selectedStockSymbol
    ? `stock:${selectedStockSymbol}`
    : selectedIndexCode
      ? `index:${selectedIndexCode}`
    : showHeatmapScreen
      ? "heatmap"
    : showNewsScreen
      ? "news"
      : showBreakdownScreen
        ? "breakdown"
      : activeTab;

  const saveScrollPosition = (key: string) => {
    if (typeof window === "undefined") {
      return;
    }

    scrollPositionsRef.current[key] = window.scrollY;
  };

  const queueScrollReset = () => {
    pendingScrollActionRef.current = { type: "reset" };
  };

  const queueScrollRestore = (key: string) => {
    pendingScrollActionRef.current = { type: "restore", key };
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const scrollAction = pendingScrollActionRef.current;

    if (!scrollAction) {
      return;
    }

    const targetTop =
      scrollAction.type === "restore"
        ? scrollPositionsRef.current[scrollAction.key] || 0
        : 0;

    const applyScroll = () => {
      window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = targetTop;
      document.body.scrollTop = targetTop;
    };

    applyScroll();

    const frameId = window.requestAnimationFrame(applyScroll);
    pendingScrollActionRef.current = null;

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeScreenKey]);

  const handleSelectStock = (stock: Stock, returnKey = activeScreenKey) => {
    const normalizedStock = normalizeStock(stock);
    const symbol =
      normalizedStock.symbol || normalizedStock.ticker || normalizedStock.code || "";

    saveScrollPosition(returnKey);
    queueScrollReset();
    setSelectedStockReturnKey(returnKey);
    setSelectedStockSymbol(symbol);
    setSelectedStockSnapshot(normalizedStock);
  };

  const handleBack = () => {
    queueScrollRestore(selectedStockReturnKey || activeTab);
    setSelectedStockSymbol(null);
    setSelectedStockSnapshot(null);
  };

  const handleSelectIndex = (index: IndexSummary) => {
    saveScrollPosition(activeTab);
    queueScrollReset();
    setSelectedIndexCode(index.code);
    setSelectedIndexSnapshot(index);
  };

  const handleCloseIndex = () => {
    queueScrollRestore(activeTab);
    setSelectedIndexCode(null);
    setSelectedIndexSnapshot(null);
  };

  const handleOpenNewsScreen = () => {
    saveScrollPosition(activeTab);
    queueScrollReset();
    setShowNewsScreen(true);
  };

  const handleCloseNewsScreen = () => {
    queueScrollRestore(activeTab);
    setShowNewsScreen(false);
  };

  const handleOpenBreakdownScreen = () => {
    saveScrollPosition(activeTab);
    queueScrollReset();
    setShowBreakdownScreen(true);
  };

  const handleCloseBreakdownScreen = () => {
    queueScrollRestore(activeTab);
    setShowBreakdownScreen(false);
  };

  const handleOpenHeatmapScreen = () => {
    saveScrollPosition(activeTab);
    queueScrollReset();
    setShowHeatmapScreen(true);
  };

  const handleCloseHeatmapScreen = () => {
    queueScrollRestore(activeTab);
    setShowHeatmapScreen(false);
  };

  const handleChangeTab = (tab: "home" | "market" | "profile") => {
    if (tab === activeTab) {
      return;
    }

    saveScrollPosition(activeTab);
    queueScrollReset();
    setActiveTab(tab);
  };

  const alertToastStack = (
    <AlertToastStack items={alertToasts} onDismiss={dismissAlertToast} />
  );

  if (loading) {
    return (
      <>
        <AppLoadingSkeleton />
        {alertToastStack}
      </>
    );
  }

  if (selectedStock) {
    return (
      <>
        <StockDetail
          stock={selectedStock}
          onBack={handleBack}
          cash={cash}
          setCash={setCash}
          positions={positions}
          setPositions={setPositions}
          transactions={transactions}
          setTransactions={setTransactions}
          isInWatchlist={watchlistSymbols.includes(resolveStockSymbol(selectedStock))}
          onToggleWatchlist={toggleWatchlistSymbol}
        />
        {alertToastStack}
      </>
    );
  }

  if (selectedIndex) {
    return (
      <>
        <IndexDetailScreen
          index={selectedIndex}
          apiBase={apiBase}
          onBack={handleCloseIndex}
        />
        {alertToastStack}
      </>
    );
  }

  if (showNewsScreen) {
    return (
      <>
        <NewsScreen items={news} onBack={handleCloseNewsScreen} />
        {alertToastStack}
      </>
    );
  }

  if (showBreakdownScreen) {
    return (
      <>
        <PortfolioBreakdownScreen
          stocks={stocks}
          positions={positions}
          transactions={transactions}
          onBack={handleCloseBreakdownScreen}
        />
        {alertToastStack}
      </>
    );
  }

  if (showHeatmapScreen) {
    return (
      <>
        <MarketHeatmapScreen
          stocks={stocks}
          apiBase={apiBase}
          onBack={handleCloseHeatmapScreen}
          onSelectStock={(stock) => handleSelectStock(stock, "heatmap")}
        />
        {alertToastStack}
      </>
    );
  }

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <>
          <HomeHeader
            unreadCount={3}
            indices={indices}
            indicesError={indicesError}
            onSelectIndex={handleSelectIndex}
          />
          <PortfolioCard
            stocks={stocks}
            positions={positions}
            transactions={transactions}
            apiBase={apiBase}
            onOpenBreakdown={handleOpenBreakdownScreen}
          />
          <BuyingPowerCard cash={cash} />

          <div
            style={{
              marginTop: "24px",
              marginBottom: "12px",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                color: C.text,
                textAlign: "left",
                fontSize: "20px",
                fontWeight: 600,
              }}
            >
              Your Holdings
            </h2>
          </div>

          {stocksError ? (
            <div
              style={{
                color: C.red,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                background: C.card,
                marginBottom: 20,
              }}
            >
              {stocksError}
            </div>
          ) : ownedStocks.length === 0 ? (
            <div
              style={{
                color: C.sub,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                background: C.card,
                marginBottom: 20,
              }}
            >
              No holdings yet
            </div>
          ) : (
            <StockList
              stocks={ownedStocks}
              apiBase={apiBase}
              onSelect={handleSelectStock}
            />
          )}

          <WatchlistSection
            stocks={watchlistStocks}
            apiBase={apiBase}
            onSelect={handleSelectStock}
          />

          {newsError ? (
            <div
              style={{
                color: C.red,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                background: C.card,
                marginTop: 20,
              }}
            >
              {newsError}
            </div>
          ) : (
            <NewsSection
              items={news}
              onSeeMore={handleOpenNewsScreen}
              isLoading={newsLoading}
            />
          )}
        </>
      );
    }

    if (activeTab === "market") {
      if (stocksError) {
        return (
          <div>
            <h1 style={{ marginBottom: "20px", color: C.text }}>Market</h1>
            <div
              style={{
                color: C.red,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                background: C.card,
              }}
            >
              {stocksError}
            </div>
          </div>
        );
      }

      return (
        <MarketScreen
          stocks={stocks}
          apiBase={apiBase}
          onOpenHeatmap={handleOpenHeatmapScreen}
          onSelect={handleSelectStock}
        />
      );
    }

    return (
      <ProfileScreen
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    );
  };

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
          padding: isCompactLayout
            ? "max(14px, env(safe-area-inset-top, 0px)) 14px calc(96px + env(safe-area-inset-bottom, 0px))"
            : "2rem",
          paddingBottom: isCompactLayout
            ? "calc(96px + env(safe-area-inset-bottom, 0px))"
            : "100px",
          boxSizing: "border-box",
          textAlign: "left",
        }}
      >
        {renderContent()}
      </div>

      {alertToastStack}
      <BottomNav activeTab={activeTab} onChangeTab={handleChangeTab} />
    </div>
  );
}

export default App;
