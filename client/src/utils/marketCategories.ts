import type { Stock } from "../App";

export type MarketCategoryKey =
  | "all_equities"
  | "heatmap"
  | "gainers"
  | "losers"
  | "financials"
  | "basic_materials"
  | "consumer_goods"
  | "technology"
  | "industrials"
  | "health_care"
  | "consumer_services"
  | "telecommunications"
  | "oil_and_gas";

export type MarketCategoryDefinition = {
  key: MarketCategoryKey;
  label: string;
  iconText: string;
  accent: string;
};

export type MarketCategorySummary = MarketCategoryDefinition & {
  count: number;
};

type MarketStockLike = Pick<Stock, "name"> &
  Partial<
    Pick<
      Stock,
      "symbol" | "ticker" | "code" | "sector" | "industry" | "changePercent"
    >
  >;

export const DEFAULT_MARKET_CATEGORY: MarketCategoryKey = "all_equities";

export const MARKET_CATEGORY_DEFINITIONS: readonly MarketCategoryDefinition[] = [
  {
    key: "all_equities",
    label: "All Equities",
    iconText: "GH",
    accent: "#7DD3FC",
  },
  {
    key: "heatmap",
    label: "Heatmap",
    iconText: "HM",
    accent: "#F59E0B",
  },
  {
    key: "gainers",
    label: "Gainers",
    iconText: "UP",
    accent: "#22C55E",
  },
  {
    key: "losers",
    label: "Losers",
    iconText: "DN",
    accent: "#EF4444",
  },
  {
    key: "financials",
    label: "Financials",
    iconText: "FN",
    accent: "#22C55E",
  },
  {
    key: "basic_materials",
    label: "Basic Materials",
    iconText: "BM",
    accent: "#EAB308",
  },
  {
    key: "consumer_goods",
    label: "Consumer Goods",
    iconText: "CG",
    accent: "#F97316",
  },
  {
    key: "technology",
    label: "Technology",
    iconText: "TC",
    accent: "#60A5FA",
  },
  {
    key: "industrials",
    label: "Industrials",
    iconText: "ID",
    accent: "#A78BFA",
  },
  {
    key: "health_care",
    label: "Health Care",
    iconText: "HC",
    accent: "#2DD4BF",
  },
  {
    key: "consumer_services",
    label: "Consumer Services",
    iconText: "CS",
    accent: "#C084FC",
  },
  {
    key: "telecommunications",
    label: "Telecommunications",
    iconText: "TM",
    accent: "#38BDF8",
  },
  {
    key: "oil_and_gas",
    label: "Oil & Gas",
    iconText: "OG",
    accent: "#FACC15",
  },
] as const;

const ALWAYS_VISIBLE_KEYS = new Set<MarketCategoryKey>([
  "all_equities",
  "heatmap",
  "gainers",
  "losers",
]);

const SYMBOL_CATEGORY_MAP: Record<string, MarketCategoryKey> = {
  AADS: "basic_materials",
  ACCESS: "financials",
  ADB: "financials",
  AGA: "basic_materials",
  ALLGH: "basic_materials",
  ASG: "basic_materials",
  BOPP: "consumer_goods",
  CAL: "financials",
  CLYD: "technology",
  CMLT: "industrials",
  CPC: "consumer_goods",
  DASPHARMA: "health_care",
  DIGICUT: "consumer_services",
  EGH: "financials",
  EGL: "financials",
  ETI: "financials",
  FAB: "financials",
  FML: "consumer_goods",
  GCB: "financials",
  GGBL: "consumer_goods",
  GLD: "financials",
  GOIL: "oil_and_gas",
  HORDS: "consumer_goods",
  IIL: "health_care",
  MAC: "financials",
  MMH: "consumer_services",
  MTNGH: "telecommunications",
  RBGH: "financials",
  SAMBA: "consumer_goods",
  SCB: "financials",
  SCBPREF: "financials",
  SIC: "financials",
  SOGEGH: "financials",
  TBL: "financials",
  TLW: "oil_and_gas",
  TOTAL: "oil_and_gas",
  UNIL: "consumer_goods",
};

const NORMALIZED_SECTOR_KEY_MAP: Record<string, MarketCategoryKey> = {
  "financials": "financials",
  "basic materials": "basic_materials",
  "consumer goods": "consumer_goods",
  "technology": "technology",
  "industrials": "industrials",
  "health care": "health_care",
  "consumer services": "consumer_services",
  "telecommunications": "telecommunications",
  "oil gas": "oil_and_gas",
};

function normalizeValue(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getResolvedSymbol(stock: MarketStockLike) {
  return String(stock.symbol || stock.ticker || stock.code || "")
    .toUpperCase()
    .trim();
}

export function resolveMarketCategory(
  stock: MarketStockLike
): MarketCategoryKey | null {
  const symbol = getResolvedSymbol(stock);
  if (symbol && SYMBOL_CATEGORY_MAP[symbol]) {
    return SYMBOL_CATEGORY_MAP[symbol];
  }

  const normalizedSector = normalizeValue(stock.sector);
  if (normalizedSector && NORMALIZED_SECTOR_KEY_MAP[normalizedSector]) {
    return NORMALIZED_SECTOR_KEY_MAP[normalizedSector];
  }

  return null;
}

export function getPopularMarketLists(
  stocks: readonly MarketStockLike[]
): MarketCategorySummary[] {
  const counts = new Map<MarketCategoryKey, number>();

  for (const stock of stocks) {
    const category = resolveMarketCategory(stock);
    if (!category) {
      continue;
    }

    counts.set(category, (counts.get(category) || 0) + 1);
  }

  return MARKET_CATEGORY_DEFINITIONS.filter(
    (item) =>
      ALWAYS_VISIBLE_KEYS.has(item.key) || (counts.get(item.key) || 0) > 0
  ).map((item) => ({
    ...item,
    count:
      item.key === DEFAULT_MARKET_CATEGORY
        ? stocks.length
        : item.key === "heatmap"
          ? stocks.length
        : item.key === "gainers"
          ? stocks.filter((stock) => Number(stock.changePercent) > 0).length
          : item.key === "losers"
            ? stocks.filter((stock) => Number(stock.changePercent) < 0).length
            : counts.get(item.key) || 0,
  }));
}

export function matchesMarketCategory(
  stock: MarketStockLike,
  category: MarketCategoryKey
) {
  if (category === DEFAULT_MARKET_CATEGORY) {
    return true;
  }

  if (category === "heatmap") {
    return true;
  }

  if (category === "gainers") {
    return Number(stock.changePercent) > 0;
  }

  if (category === "losers") {
    return Number(stock.changePercent) < 0;
  }

  return resolveMarketCategory(stock) === category;
}
