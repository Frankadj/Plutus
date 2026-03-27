import { C } from "./theme/colors";
import { useEffect, useMemo, useState } from "react";
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

export type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

export type Position = {
  shares: number;
  totalCost: number;
};

type NewsItem = {
  id: string | number;
  headline: string;
  source: string;
  time: string;
  url?: string;
  image?: string;
};

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showNewsScreen, setShowNewsScreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "market" | "profile">("home");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stocksError, setStocksError] = useState("");
  const [newsError, setNewsError] = useState("");
  const [cash, setCash] = useState(10000);
  const [positions, setPositions] = useState<Record<string, Position>>({});

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const stocksRes = await fetch("http://127.0.0.1:3001/api/stocks", {
          cache: "no-store",
        });

        if (!stocksRes.ok) {
          throw new Error("Failed to load stock data");
        }

        const stocksData = await stocksRes.json();
        setStocks(stocksData);
        setStocksError("");
      } catch (error) {
        setStocksError("Unable to load live stock data right now.");
      } finally {
        setLoading(false);
      }
    };

    const fetchNews = async () => {
      try {
        const newsRes = await fetch("http://127.0.0.1:3001/api/news", {
          cache: "no-store",
        });

        if (!newsRes.ok) {
          throw new Error("Failed to load news");
        }

        const newsData = await newsRes.json();
        if (Array.isArray(newsData)) {
          setNews(newsData);
          setNewsError("");
        }
      } catch (error) {
        setNewsError("Unable to load news right now.");
      }
    };

    fetchStocks();
    fetchNews();

    const stocksInterval = setInterval(fetchStocks, 10000);
    const newsInterval = setInterval(fetchNews, 30 * 60 * 1000);

    return () => {
      clearInterval(stocksInterval);
      clearInterval(newsInterval);
    };
  }, []);

  const ownedStocks = useMemo(() => {
    return stocks.filter((stock) => (positions[stock.symbol]?.shares || 0) > 0);
  }, [stocks, positions]);

  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
  };

  const handleBack = () => {
    setSelectedStock(null);
  };

  if (loading) {
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
            padding: "2rem",
            boxSizing: "border-box",
            textAlign: "left",
          }}
        >
          <p>Loading stocks...</p>
        </div>
      </div>
    );
  }

  if (selectedStock) {
    return (
      <StockDetail
        stock={selectedStock}
        onBack={handleBack}
        cash={cash}
        setCash={setCash}
        positions={positions}
        setPositions={setPositions}
      />
    );
  }

  if (showNewsScreen) {
    return <NewsScreen items={news} onBack={() => setShowNewsScreen(false)} />;
  }

  const renderContent = () => {
    if (activeTab === "home") {
      return (
        <>
          <HomeHeader unreadCount={3} />
          <PortfolioCard />
          <BuyingPowerCard cash={cash} />

          <h2
            style={{
              marginTop: "24px",
              marginBottom: "12px",
              color: C.text,
              textAlign: "left",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Your Holdings
          </h2>

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
            <StockList stocks={ownedStocks} onSelect={handleSelectStock} />
          )}

          <WatchlistSection stocks={stocks.slice(0, 3)} onSelect={handleSelectStock} />

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
            <NewsSection items={news} onSeeMore={() => setShowNewsScreen(true)} />
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

      return <MarketScreen stocks={stocks} onSelect={handleSelectStock} />;
    }

    return <ProfileScreen />;
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
          padding: "2rem",
          paddingBottom: "100px",
          boxSizing: "border-box",
          textAlign: "left",
        }}
      >
        {renderContent()}
      </div>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}

export default App;