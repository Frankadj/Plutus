import { useEffect, useMemo, useRef, useState } from "react";
import type { Stock } from "../App";
import { C } from "../theme/colors";
import SkeletonBlock from "./SkeletonBlock";
import {
  MARKET_CATEGORY_DEFINITIONS,
  resolveMarketCategory,
  type MarketCategoryKey,
} from "../utils/marketCategories";
import { squarifyTreemap } from "../utils/treemap";

type HeatmapResponseItem = {
  symbol?: string;
  name?: string;
  companyName?: string;
  sector?: string;
  capital?: number | null;
  price?: number;
  change?: number;
  changePercent?: number;
  volume?: number;
};

type HeatmapTile = {
  symbol: string;
  name: string;
  companyName: string;
  sector: string;
  capital: number | null;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

type Props = {
  stocks: Stock[];
  apiBase: string;
  onBack: () => void;
  onSelectStock: (stock: Stock) => void;
};

type HeatmapViewMode = "all" | "sectors";

const NON_SECTOR_CATEGORY_KEYS = new Set<MarketCategoryKey>([
  "all_equities",
  "heatmap",
  "gainers",
  "losers",
]);

const CATEGORY_ACCENT_BY_KEY = new Map(
  MARKET_CATEGORY_DEFINITIONS.map((item) => [item.key, item.accent] as const)
);

const SECTOR_SORT_ORDER = new Map(
  MARKET_CATEGORY_DEFINITIONS.filter(
    (item) => !NON_SECTOR_CATEGORY_KEYS.has(item.key)
  ).map((item, index) => [normalizeLabel(item.label), index] as const)
);

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getResolvedSymbol(stock: Partial<Stock> & { symbol?: string }) {
  return String(stock.symbol || stock.ticker || stock.code || "")
    .toUpperCase()
    .trim();
}

function normalizeLabel(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatPrice(value: number) {
  return `\u20b5${toNumber(value).toFixed(2)}`;
}

function formatChangePercent(value: number) {
  const safeValue = toNumber(value);
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${safeValue.toFixed(2)}%`;
}

function resolveSectorAccent(sector: string) {
  const normalizedSector = normalizeLabel(sector);

  for (const item of MARKET_CATEGORY_DEFINITIONS) {
    if (NON_SECTOR_CATEGORY_KEYS.has(item.key)) {
      continue;
    }

    if (normalizeLabel(item.label) === normalizedSector) {
      return CATEGORY_ACCENT_BY_KEY.get(item.key) || C.accent;
    }
  }

  return C.accent;
}

function getTileWeight(item: HeatmapTile) {
  const capital = toNumber(item.capital, 0);
  if (capital > 0) {
    return capital;
  }

  const volume = toNumber(item.volume, 0);
  if (volume > 0) {
    return volume;
  }

  return 1;
}

function getFallbackSectorLabel(stock: {
  symbol?: string;
  ticker?: string;
  code?: string;
  name?: string;
  sector?: string;
}) {
  const rawSector = String(stock.sector || "").trim();
  if (rawSector) {
    return rawSector;
  }

  const category = resolveMarketCategory({
    symbol: stock.symbol,
    ticker: stock.ticker,
    code: stock.code,
    name: stock.name || stock.symbol || "",
    sector: stock.sector,
  });

  if (!category) {
    return "Unspecified";
  }

  const definition = MARKET_CATEGORY_DEFINITIONS.find(
    (item) => item.key === category
  );
  return definition?.label || "Unspecified";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mixColor(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  ratio: number
) {
  const t = clamp(ratio, 0, 1);
  const channels = from.map((channel, index) =>
    Math.round(channel + (to[index] - channel) * t)
  );
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function getTileColors(changePercent: number) {
  const safeChangePercent = toNumber(changePercent, 0);
  const magnitude = Math.min(1, Math.abs(safeChangePercent) / 8);
  const neutral = [19, 24, 33] as const;

  if (Math.abs(safeChangePercent) < 0.0001) {
    return {
      background: "rgb(23, 28, 37)",
      border: "rgba(71, 85, 105, 0.55)",
      accent: "#E5E7EB",
      secondary: "#9CA3AF",
    };
  }

  if (safeChangePercent > 0) {
    const lightGreen = [34, 197, 94] as const;
    const deepGreen = [20, 83, 45] as const;
    const background =
      magnitude < 0.5
        ? mixColor(neutral, lightGreen, magnitude / 0.5)
        : mixColor(lightGreen, deepGreen, (magnitude - 0.5) / 0.5);

    return {
      background,
      border: mixColor([134, 239, 172], [21, 128, 61], magnitude),
      accent: "#F0FDF4",
      secondary: "rgba(240, 253, 244, 0.82)",
    };
  }

  const lightRed = [248, 113, 113] as const;
  const deepRed = [127, 29, 29] as const;
  const background =
    magnitude < 0.5
      ? mixColor(neutral, lightRed, magnitude / 0.5)
      : mixColor(lightRed, deepRed, (magnitude - 0.5) / 0.5);

  return {
    background,
    border: mixColor([252, 165, 165], [153, 27, 27], magnitude),
    accent: "#FEF2F2",
    secondary: "rgba(254, 242, 242, 0.82)",
  };
}

function estimateTreemapHeight(width: number, itemCount: number, compact = false) {
  const safeWidth = Math.max(160, width);
  const estimatedRows = compact
    ? Math.max(2, Math.ceil(itemCount / 4))
    : Math.max(2, Math.ceil(itemCount / 5));
  const estimated = Math.max(
    safeWidth * (compact ? 0.52 : 0.4),
    estimatedRows * (compact ? 56 : 70)
  );

  return Math.round(clamp(estimated, compact ? 180 : 220, compact ? 460 : 620));
}

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      setWidth(node.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || 0;
      setWidth(nextWidth);
    });

    observer.observe(node);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

  return { ref, width };
}

function getTileTextMode(width: number, height: number) {
  const area = width * height;
  const minSide = Math.min(width, height);

  if (area >= 18000 && minSide >= 92) {
    return "large";
  }

  if (area >= 9000 && minSide >= 68) {
    return "medium";
  }

  if (area >= 3600 && minSide >= 42) {
    return "small";
  }

  if (area >= 1500 && minSide >= 24) {
    return "ticker";
  }

  if (area >= 700 && minSide >= 16) {
    return "ticker";
  }

  return "none";
}

function TreemapTiles({
  items,
  baseStocksBySymbol,
  onSelectStock,
  compact = false,
}: {
  items: HeatmapTile[];
  baseStocksBySymbol: Map<string, Stock>;
  onSelectStock: (stock: Stock) => void;
  compact?: boolean;
}) {
  const { ref, width } = useMeasuredWidth();
  const height = useMemo(
    () => estimateTreemapHeight(width, items.length, compact),
    [compact, items.length, width]
  );

  const layouts = useMemo(() => {
    if (width <= 0 || items.length === 0) {
      return [];
    }

    const rawWeights = items.map((item) => getTileWeight(item));
    const positiveWeights = rawWeights.filter((value) => value > 0);
    const minPositiveWeight =
      positiveWeights.length > 0 ? Math.min(...positiveWeights) : 1;
    const weightedItems = items.map((item) => ({
      item,
      weight: Math.max(
        Math.log10(getTileWeight(item) + 1),
        Math.log10(minPositiveWeight + 1),
        1
      ),
    }));

    return squarifyTreemap(weightedItems, width, height);
  }, [height, items, width]);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height,
          background: "#0B1017",
          overflow: "hidden",
        }}
      >
        {layouts.map((layout) => {
          const item = layout.item;
          const baseStock = baseStocksBySymbol.get(item.symbol);
          const textMode = getTileTextMode(layout.width, layout.height);
          const colors = getTileColors(item.changePercent);
          const inset = 0.5;
          const buttonWidth = Math.max(0, layout.width - inset);
          const buttonHeight = Math.max(0, layout.height - inset);
          const compactName =
            item.companyName.length > 26
              ? `${item.companyName.slice(0, 26).trim()}...`
              : item.companyName;
          const showTicker = textMode !== "none";
          const showChange =
            textMode === "large" || textMode === "medium" || textMode === "small";
          const showPrice = textMode === "large" || textMode === "medium";
          const showCompanyName = textMode === "large";

          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() =>
                onSelectStock(
                  baseStock || {
                    symbol: item.symbol,
                    name: item.name,
                    companyName: item.companyName,
                    sector: item.sector,
                    price: item.price,
                    change: item.change,
                    changePercent: item.changePercent,
                    volume: item.volume,
                  }
                )
              }
              style={{
                position: "absolute",
                left: layout.x,
                top: layout.y,
                width: buttonWidth,
                height: buttonHeight,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                padding:
                  textMode === "large"
                    ? "9px"
                    : textMode === "medium"
                      ? "7px"
                      : textMode === "small"
                        ? "6px"
                        : "4px",
                color: colors.accent,
                overflow: "hidden",
                cursor: "pointer",
                textAlign: "left",
                transition:
                  "filter 120ms ease, transform 120ms ease, border-color 120ms ease",
                boxShadow: "none",
              }}
            >
              {showTicker ? (
                <div
                  style={{
                    fontSize:
                      textMode === "large"
                        ? 16
                        : textMode === "medium"
                          ? 13
                          : textMode === "small"
                            ? 11
                            : 10,
                    fontWeight: 800,
                    letterSpacing: 0.15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: showCompanyName ? 4 : 0,
                  }}
                >
                  {item.symbol}
                </div>
              ) : null}

              {showCompanyName ? (
                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.2,
                    color: colors.secondary,
                    marginBottom: 6,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {compactName}
                </div>
              ) : null}

              {showPrice ? (
                <div
                  style={{
                    fontSize: textMode === "large" ? 14 : 12,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: showChange ? 3 : 0,
                  }}
                >
                  {formatPrice(item.price)}
                </div>
              ) : null}

              {showChange ? (
                <div
                  style={{
                    fontSize: textMode === "large" ? 12 : 10.5,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {formatChangePercent(item.changePercent)}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectorPanel({
  group,
  baseStocksBySymbol,
  onSelectStock,
  fullWidth = false,
  embedded = false,
  merged = false,
  showDivider = false,
}: {
  group: {
    sector: string;
    items: HeatmapTile[];
    totalWeight: number;
  };
  baseStocksBySymbol: Map<string, Stock>;
  onSelectStock: (stock: Stock) => void;
  fullWidth?: boolean;
  embedded?: boolean;
  merged?: boolean;
  showDivider?: boolean;
}) {
  const accent = resolveSectorAccent(group.sector);

  return (
    <section
      style={{
        borderRadius: 6,
        border: merged
          ? "none"
          : `1px solid ${embedded ? "rgba(71, 85, 105, 0.36)" : C.border}`,
        background: merged ? "transparent" : embedded ? "#0B1017" : "#0D131C",
        padding: merged ? "0 0 12px" : fullWidth ? "10px 10px 12px" : "8px 8px 10px",
        boxShadow: "none",
        borderBottom: merged && showDivider ? `1px solid ${C.border}` : "none",
        marginBottom: merged && showDivider ? 6 : 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: C.text,
            fontSize: fullWidth ? 12 : 11,
            fontWeight: 800,
            letterSpacing: 0.8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {String(group.sector || "UNSPECIFIED").toUpperCase()}
        </div>

        <div
          style={{
            color: accent,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {group.items.length} STOCKS
        </div>
      </div>

      <TreemapTiles
        items={group.items}
        baseStocksBySymbol={baseStocksBySymbol}
        onSelectStock={onSelectStock}
        compact={merged ? false : !fullWidth}
      />
    </section>
  );
}

function MarketHeatmapScreen({
  stocks,
  apiBase,
  onBack,
  onSelectStock,
}: Props) {
  const [remoteItems, setRemoteItems] = useState<HeatmapResponseItem[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(true);
  const [viewMode, setViewMode] = useState<HeatmapViewMode>("all");

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | null = null;

    const loadHeatmap = async (attempt = 0) => {
      try {
        const response = await fetch(`${apiBase}/api/stocks/heatmap`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load heatmap data");
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setRemoteItems(data);

          const capitalCount = data.filter(
            (item) => toNumber(item?.capital, 0) > 0
          ).length;

          if (
            capitalCount < Math.max(6, Math.ceil(data.length * 0.35)) &&
            attempt < 1
          ) {
            retryTimer = window.setTimeout(() => {
              void loadHeatmap(attempt + 1);
            }, 2600);
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Heatmap screen load failed:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingRemote(false);
        }
      }
    };

    void loadHeatmap();

    return () => {
      controller.abort();
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [apiBase]);

  const baseStocksBySymbol = useMemo(() => {
    return new Map(
      stocks
        .map((stock) => {
          const symbol = getResolvedSymbol(stock);
          return symbol ? ([symbol, stock] as const) : null;
        })
        .filter((entry): entry is readonly [string, Stock] => Boolean(entry))
    );
  }, [stocks]);

  const displayItems = useMemo(() => {
    const mergedBySymbol = new Map<string, HeatmapTile>();

    for (const stock of stocks) {
      const symbol = getResolvedSymbol(stock);

      if (!symbol) {
        continue;
      }
      const fallbackSector = getFallbackSectorLabel(stock);

      mergedBySymbol.set(symbol, {
        symbol,
        name: stock.name || symbol,
        companyName: stock.companyName || stock.name || symbol,
        sector: fallbackSector,
        capital: null,
        price: toNumber(stock.price, 0),
        change: toNumber(stock.change, 0),
        changePercent: toNumber(stock.changePercent, 0),
        volume: toNumber(stock.volume, 0),
      });
    }

    for (const item of remoteItems) {
      const symbol = getResolvedSymbol(item);
      if (!symbol) {
        continue;
      }

      const fallback = mergedBySymbol.get(symbol);
      const sector = getFallbackSectorLabel({
        symbol,
        name: item.name || fallback?.name || symbol,
        sector: String(item.sector || "").trim() || fallback?.sector || "",
      });

      mergedBySymbol.set(symbol, {
        symbol,
        name: item.name || fallback?.name || symbol,
        companyName:
          item.companyName ||
          item.name ||
          fallback?.companyName ||
          fallback?.name ||
          symbol,
        sector,
        capital:
          item.capital == null ? fallback?.capital ?? null : toNumber(item.capital, 0),
        price: toNumber(item.price, fallback?.price ?? 0),
        change: toNumber(item.change, fallback?.change ?? 0),
        changePercent: toNumber(
          item.changePercent,
          fallback?.changePercent ?? 0
        ),
        volume: toNumber(item.volume, fallback?.volume ?? 0),
      });
    }

    return Array.from(mergedBySymbol.values()).filter((item) => item.symbol);
  }, [remoteItems, stocks]);

  const groupedSectors = useMemo(() => {
    const groups = new Map<string, HeatmapTile[]>();

    for (const item of displayItems) {
      const sectorLabel = item.sector || "Other Equities";
      const existing = groups.get(sectorLabel) || [];
      existing.push(item);
      groups.set(sectorLabel, existing);
    }

    return Array.from(groups.entries())
      .map(([sector, items]) => {
        const totalWeight = items.reduce(
          (sum, item) => sum + getTileWeight(item),
          0
        );

        return {
          sector,
          items: [...items].sort(
            (left, right) => getTileWeight(right) - getTileWeight(left)
          ),
          totalWeight,
        };
      })
      .sort((left, right) => {
        const leftOrder = SECTOR_SORT_ORDER.get(normalizeLabel(left.sector));
        const rightOrder = SECTOR_SORT_ORDER.get(normalizeLabel(right.sector));

        if (leftOrder != null && rightOrder != null && leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        if (leftOrder != null) {
          return -1;
        }

        if (rightOrder != null) {
          return 1;
        }

        return right.totalWeight - left.totalWeight;
      });
  }, [displayItems]);

  const fullHeatmapItems = useMemo(
    () =>
      [...displayItems].sort((left, right) => {
        const weightDifference = getTileWeight(right) - getTileWeight(left);
        if (Math.abs(weightDifference) > 0.0001) {
          return weightDifference;
        }

        return left.symbol.localeCompare(right.symbol);
      }),
    [displayItems]
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
          padding: "18px 20px 32px",
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
              fontSize: 30,
              fontWeight: 600,
              color: C.text,
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            Market Heatmap
          </h1>
        </div>

        <div
          style={{
            color: C.sub,
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 18,
            textAlign: "left",
          }}
        >
          Tap any tile to open the stock. Tiles are grouped by sector in the
          market map, while color shows the day move and larger tiles represent
          bigger weights in the market.
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: 4,
            marginBottom: 18,
            borderRadius: 999,
            border: `1px solid ${C.border}`,
            background: C.card,
          }}
        >
          {([
            { key: "all", label: "All Stocks" },
            { key: "sectors", label: "By Sector" },
          ] as const).map((option) => {
            const isActive = viewMode === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setViewMode(option.key)}
                style={{
                  border: "none",
                  borderRadius: 999,
                  padding: "9px 14px",
                  background: isActive ? C.green : "transparent",
                  color: isActive ? "#05130A" : C.sub,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 140ms ease, color 140ms ease",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 16,
            color: C.sub,
            fontSize: 12,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.8)",
              }}
            />
            Gainers
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.8)",
              }}
            />
            Losers
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "rgba(148, 163, 184, 0.75)",
              }}
            />
            Unchanged
          </span>
          {isLoadingRemote ? <SkeletonBlock width={152} height={14} radius={999} /> : null}
        </div>

        {viewMode === "all" ? (
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: C.text,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                All Stocks
              </h2>

              <div
                style={{
                  color: C.sub,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {fullHeatmapItems.length} stocks
              </div>
            </div>

            <div
              style={{
                borderRadius: 8,
                border: `1px solid rgba(71, 85, 105, 0.38)`,
                background: "#090D12",
                padding: 10,
                boxShadow: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {groupedSectors.map((group, index) => (
                  <SectorPanel
                    key={group.sector}
                    group={group}
                    baseStocksBySymbol={baseStocksBySymbol}
                    onSelectStock={onSelectStock}
                    merged
                    fullWidth
                    showDivider={index < groupedSectors.length - 1}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {groupedSectors.map((group) => (
              <SectorPanel
                key={group.sector}
                group={group}
                baseStocksBySymbol={baseStocksBySymbol}
                onSelectStock={onSelectStock}
                fullWidth
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketHeatmapScreen;
