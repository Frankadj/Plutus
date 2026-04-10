import { useEffect, useMemo, useState } from "react";
import type { Stock } from "../App";
import { C } from "../theme/colors";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { createDayMoveSeries } from "../utils/sparkline";
import {
  formatStockChangePercent,
  getStockMovementTone,
} from "../utils/stockMovement";
import { useMiniHistoryMap } from "../hooks/useMiniHistoryMap";
import PopularListsSection from "./PopularListsSection";
import {
  DEFAULT_MARKET_CATEGORY,
  getPopularMarketLists,
  matchesMarketCategory,
  type MarketCategoryKey,
} from "../utils/marketCategories";
import MiniSparkline from "./MiniSparkline";
import TickerLogo from "./TickerLogo";

type Props = {
  stocks: Stock[];
  apiBase: string;
  onOpenHeatmap: () => void;
  onSelect: (stock: Stock) => void;
};

function MarketScreen({ stocks, apiBase, onOpenHeatmap, onSelect }: Props) {
  const isCompactLayout = useIsCompactLayout();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<MarketCategoryKey>(
    DEFAULT_MARKET_CATEGORY
  );

  const popularLists = useMemo(() => getPopularMarketLists(stocks), [stocks]);

  const getResolvedSymbol = (stock: Stock) =>
    String(stock.symbol || stock.ticker || stock.code || "")
      .toUpperCase()
      .trim();

  useEffect(() => {
    const hasActiveCategory = popularLists.some(
      (item) => item.key === activeCategory && item.key !== "heatmap"
    );

    if (!hasActiveCategory) {
      setActiveCategory(DEFAULT_MARKET_CATEGORY);
    }
  }, [activeCategory, popularLists]);

  const handleSelectPopularList = (key: MarketCategoryKey) => {
    if (key === "heatmap") {
      onOpenHeatmap();
      return;
    }

    setActiveCategory(key);
  };

  const filteredStocks = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = stocks.filter((stock) => {
      const symbol = getResolvedSymbol(stock);
      const matchesSearch =
        !q ||
        symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q);

      if (!matchesSearch) {
        return false;
      }

      return matchesMarketCategory(stock, activeCategory);
    });

    if (activeCategory === "gainers") {
      return [...base].sort(
        (a, b) => Number(b.changePercent) - Number(a.changePercent)
      );
    }

    if (activeCategory === "losers") {
      return [...base].sort(
        (a, b) => Number(a.changePercent) - Number(b.changePercent)
      );
    }

    return [...base].sort((a, b) => {
      const aSymbol = getResolvedSymbol(a);
      const bSymbol = getResolvedSymbol(b);

      return aSymbol.localeCompare(bSymbol);
    });
  }, [stocks, search, activeCategory]);

  const weeklyMiniCharts = useMiniHistoryMap({
    apiBase,
    stocks: filteredStocks,
    range: "1W",
  });

  return (
    <div>
      <h1
        style={{
          marginTop: 0,
          marginBottom: 20,
          color: C.text,
          fontSize: isCompactLayout ? 26 : 28,
          fontWeight: 700,
        }}
      >
        Market
      </h1>

      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stocks"
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: C.card,
            color: C.text,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: isCompactLayout ? "13px 14px" : "14px 16px",
            fontSize: 16,
            outline: "none",
          }}
        />
      </div>

      <PopularListsSection
        items={popularLists}
        selectedKey={activeCategory}
        onSelect={handleSelectPopularList}
      />

      {filteredStocks.length === 0 ? (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 16,
            color: C.sub,
          }}
        >
          No stocks found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredStocks.map((stock, index) => {
            const symbol = getResolvedSymbol(stock);
            const tone = getStockMovementTone(stock);
            const changeColor =
              tone === "positive"
                ? C.green
                : tone === "negative"
                  ? C.red
                  : C.sub;
            const sparklineValues =
              weeklyMiniCharts[symbol]?.length >= 2
                ? weeklyMiniCharts[symbol]
                : createDayMoveSeries(stock);

            return (
              <button
                key={symbol || stock.name}
                onClick={() => onSelect(stock)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    index < filteredStocks.length - 1
                      ? `1px solid ${C.border}`
                      : "none",
                  borderRadius: 0,
                  padding: "18px 0",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: isCompactLayout ? 10 : 16,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isCompactLayout ? 10 : 12,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <TickerLogo symbol={symbol} size={isCompactLayout ? 36 : 42} />

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: C.text,
                          fontWeight: 700,
                          fontSize: isCompactLayout ? 16 : 17,
                          marginBottom: 4,
                        }}
                      >
                        {symbol || "N/A"}
                      </div>

                      <div
                        style={{
                          color: C.sub,
                          fontSize: isCompactLayout ? 12 : 13,
                          lineHeight: 1.3,
                        }}
                      >
                        {stock.name}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: isCompactLayout ? 10 : 16,
                      flexShrink: 0,
                    }}
                  >
                    <MiniSparkline
                      values={sparklineValues}
                      tone={tone}
                      width={isCompactLayout ? 68 : 84}
                      height={isCompactLayout ? 30 : 36}
                    />

                    <div
                      style={{
                        textAlign: "right",
                        minWidth: isCompactLayout ? 68 : 86,
                      }}
                    >
                      <div
                        style={{
                          color: C.text,
                          fontWeight: 700,
                          fontSize: isCompactLayout ? 15 : 17,
                          marginBottom: 4,
                        }}
                      >
                        ₵{Number(stock.price).toFixed(2)}
                      </div>

                      <div
                        style={{
                          color: changeColor,
                          fontSize: isCompactLayout ? 13 : 14,
                          fontWeight: 700,
                        }}
                      >
                        {formatStockChangePercent(stock)}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MarketScreen;
