const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const dns = require("dns");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const Parser = require("rss-parser");

// Cloud Run can prefer IPv6 answers that stall against some upstream sites.
dns.setDefaultResultOrder("ipv4first");

function readBundledJsonArray(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function readBundledJsonObject(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

const app = express();
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";
const IS_CLOUD_RUN = Boolean(process.env.K_SERVICE);
const CLIENT_DIST_DIR = path.resolve(__dirname, "../client/dist");
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_DIR, "index.html");
const LIVE_STOCKS_SNAPSHOT_PATH = path.resolve(
  __dirname,
  "./data/live-stocks-snapshot.json"
);
const GSE_INDICES_SNAPSHOT_PATH = path.resolve(
  __dirname,
  "./data/gse-indices-snapshot.json"
);
const ANDROID_DEBUG_APK_PATH = path.resolve(
  __dirname,
  "../android/app/build/outputs/apk/debug/app-debug.apk"
);
const DB_MOUNT_DIR =
  process.env.DB_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  __dirname;
const DB_PATH = process.env.DB_PATH || path.join(DB_MOUNT_DIR, "plutus.db");
const KWAYISI_API_BASE = "https://dev.kwayisi.org/apis/gse";
const KWAYISI_GSE_PAGE_URL = "https://afx.kwayisi.org/gse/";
const KWAYISI_CHART_API_BASE = "https://afx.kwayisi.org/chart/gse";
const WIKIPEDIA_API_BASE = "https://en.wikipedia.org";
const GSE_PRESS_RELEASE_ARCHIVE_URL = "https://gse.com.gh/press-release/";
const KWAYISI_CHART_TIMEOUT_MS = 15000;
const GSE_INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
const NEWS_REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 PlutusNews/1.0",
  Accept: "text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
};
const KWAYISI_REQUEST_HEADERS = {
  "User-Agent": "Plutus/1.0 (GSE market data app)",
};
const WIKIPEDIA_REQUEST_HEADERS = {
  "User-Agent":
    "Plutus/1.0 (Wikipedia company summaries for Ghana Stock Exchange app)",
  Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
};
const RSS_SOURCE_TIMEOUT_MS = 5000;
const HTML_SOURCE_TIMEOUT_MS = 4500;
const NEWS_SOURCE_TASK_TIMEOUT_MS = 6500;
const rssParser = new Parser({
  timeout: RSS_SOURCE_TIMEOUT_MS,
  headers: NEWS_REQUEST_HEADERS,
});
const NEWS_CACHE_TTL_MS = 15 * 60 * 1000;
const NEWS_ITEM_RECENCY_MS = 120 * 24 * 60 * 60 * 1000;
const NEWS_SOURCE_LIMIT = 12;
const NEWS_SOURCE_FAILURE_LOG_COOLDOWN_MS = 20 * 60 * 1000;
const NEWS_IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NEWS_IMAGE_RESOLVE_TIMEOUT_MS = 2000;
const NEWS_IMAGE_ENRICH_MAX_ITEMS = 8;
const NEWS_IMAGE_ENRICH_CONCURRENCY = 2;
const STOCK_NEWS_MAX_ITEMS = 6;
const HOME_NEWS_MAX_ITEMS = 12;
const LIVE_STOCKS_CACHE_TTL_MS = 20 * 1000;
const LIVE_STOCKS_RATE_LIMIT_COOLDOWN_MS = 45 * 1000;
const KWAYISI_DEFAULT_TIMEOUT_MS = 12000;
const KWAYISI_RETRY_TIMEOUT_MS = 20000;
const KWAYISI_RATE_LIMIT_COOLDOWN_MS = 30 * 1000;
const KWAYISI_RESOURCE_ERROR_COOLDOWN_MS = 10 * 1000;
const KWAYISI_PROFILE_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const KWAYISI_NOT_FOUND_CACHE_TTL_MS = 60 * 1000;
const STOCK_DETAIL_CACHE_TTL_MS = 20 * 1000;
const COMPANY_WEBSITE_BRANDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const COMPANY_WEBSITE_TIMEOUT_MS = 4500;
const HEATMAP_EQUITY_BATCH_SIZE = 6;
const HISTORY_SCRAPE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const HISTORY_SCRAPE_ERROR_COOLDOWN_MS = 30 * 1000;
const HISTORY_COVERAGE_SYNC_TTL_MS = 12 * 60 * 60 * 1000;
const RECENT_HISTORY_STALE_DAYS = 5;
const WIKIPEDIA_TIMEOUT_MS = 1500;
const WIKIPEDIA_ABOUT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const WIKIPEDIA_SEARCH_RESULT_LIMIT = 5;
const CACHE_WARMUP_DELAY_MS = 1200;
const PROFILE_WARMUP_DELAY_MS = 2600;
const HISTORY_WARMUP_DELAY_MS = 5200;
const GSE_PRESS_RELEASE_WARMUP_DELAY_MS = 9000;
const GSE_PRESS_RELEASE_CACHE_TTL_MS = 45 * 60 * 1000;
const GSE_PRESS_RELEASE_PAGE_TIMEOUT_MS = 25000;
const GSE_PRESS_RELEASE_MAX_PAGES = 2;
const STOCK_CORPORATE_ACTIONS_MAX_ITEMS = 6;
const FINANCE_TOPIC_KEYWORDS = [
  "bank",
  "banking",
  "bills",
  "bog",
  "bond",
  "bourse",
  "business",
  "capital market",
  "cedi",
  "commodity",
  "consumer prices",
  "credit",
  "crude",
  "currency",
  "debt",
  "dividend",
  "economy",
  "earnings",
  "equities",
  "exchange",
  "finance",
  "financial",
  "fiscal",
  "forex",
  "fuel",
  "gold",
  "gse",
  "inflation",
  "insurance",
  "interest rate",
  "investment",
  "investor",
  "ipo",
  "listed",
  "loan",
  "market",
  "mortgage",
  "oil",
  "petroleum",
  "prices",
  "profit",
  "quarter",
  "results",
  "revenue",
  "share",
  "shareholder",
  "stock",
  "tax",
  "telecom",
  "trading",
  "treasury",
];
const PRIMARY_GENERAL_MARKET_KEYWORDS = [
  "bank of ghana",
  "bog",
  "capital market",
  "dividend",
  "earnings",
  "equities",
  "gse",
  "ghana stock exchange",
  "interest rate",
  "listed company",
  "listed companies",
  "profit",
  "quarter-end trading",
  "results",
  "securities",
  "shareholder",
  "shareholders",
  "shares",
  "stock market",
  "trading",
  "treasury bill",
  "treasury bills",
];
const SECONDARY_GENERAL_MARKET_KEYWORDS = [
  "cedi",
  "economy",
  "financial market",
  "inflation",
  "investor",
  "investors",
  "listing",
  "recapitalisation",
];
const CORPORATE_EVENT_TAG_DEFINITIONS = [
  {
    key: "dividend",
    label: "Dividend",
    keywords: [
      "dividend",
      "interim dividend",
      "final dividend",
      "cash dividend",
      "scrip dividend",
    ],
  },
  {
    key: "closure",
    label: "Closure",
    keywords: ["closure of register", "qualifying date", "ex dividend", "ex-dividend"],
  },
  {
    key: "agm",
    label: "AGM",
    keywords: ["annual general meeting", "agm"],
  },
  {
    key: "results",
    label: "Results",
    keywords: [
      "results",
      "earnings",
      "financial statements",
      "annual report",
      "unaudited",
      "audited",
      "condensed results",
      "summary financial statements",
      "summary consolidated",
    ],
  },
  {
    key: "rights",
    label: "Rights Issue",
    keywords: ["rights issue", "rights offer", "renounceable rights"],
  },
  {
    key: "split",
    label: "Split",
    keywords: ["share split", "stock split", "split of shares"],
  },
  {
    key: "board",
    label: "Board",
    keywords: [
      "board of directors",
      "board",
      "director",
      "directors",
      "membership of the board",
    ],
  },
  {
    key: "notice",
    label: "Notice",
    keywords: [
      "notice",
      "extension of time",
      "structural separation",
      "suspension",
      "disclosure",
      "announcement",
    ],
  },
];
const newsCache = {
  fetchedAt: 0,
  items: [],
  pending: null,
};
const newsImageEnrichmentState = {
  pending: null,
};
const newsSourceFailureState = new Map();
const newsImageCache = new Map();
const wikipediaAboutCache = new Map();
const wikipediaAboutPending = new Map();
const companyWebsiteBrandingCache = new Map();
const companyWebsiteBrandingPending = new Map();
const liveStocksCache = {
  fetchedAt: 0,
  items: [],
  pending: null,
  rateLimitedUntil: 0,
};
const BUNDLED_LIVE_STOCKS_SNAPSHOT = readBundledJsonArray(
  LIVE_STOCKS_SNAPSHOT_PATH
);
const BUNDLED_GSE_INDICES_SNAPSHOT = readBundledJsonObject(
  GSE_INDICES_SNAPSHOT_PATH
);
const kwayisiResourceCache = new Map();
const kwayisiResourcePending = new Map();
const kwayisiResourceErrorUntil = new Map();
const kwayisiRateLimitState = {
  until: 0,
  reason: "",
};
const stockDetailCache = new Map();
const stockDetailPending = new Map();
const heatmapMetadataWarmPending = new Set();
const equityProfileWarmPending = new Set();
const historyCoverageWarmPending = new Set();
const historyScrapeCache = new Map();
const historyScrapePending = new Map();
const historyScrapeErrorUntil = new Map();
const historyCoverageSyncAt = new Map();
const gseIndexCache = {
  fetchedAt: 0,
  summaries: [],
  historyByCode: {},
  pending: null,
};
const gsePressReleaseCache = {
  fetchedAt: 0,
  items: [],
  pending: null,
};

app.use(cors());
app.use(express.json());

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    close_price REAL NOT NULL,
    change_value REAL DEFAULT 0,
    change_percent REAL DEFAULT 0,
    volume INTEGER DEFAULT 0,
    source TEXT DEFAULT 'KwayisiChart',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, trade_date, source)
  );
`);

const getLatestHistoryRowsBySymbolStmt = db.prepare(`
  SELECT
    trade_date as date,
    close_price as value,
    change_value as change,
    change_percent as changePercent,
    volume
  FROM stock_history
  WHERE symbol = ?
    AND close_price > 0
  ORDER BY trade_date DESC
  LIMIT 2
`);

const KNOWN_SYMBOLS = [
  "AADS",
  "ACCESS",
  "ADB",
  "AGA",
  "ALLGH",
  "ALW",
  "ASG",
  "BOPP",
  "CAL",
  "CLYD",
  "CMLT",
  "CPC",
  "DASPHARMA",
  "DIGICUT",
  "EGH",
  "EGL",
  "ETI",
  "FAB",
  "FML",
  "GCB",
  "GGBL",
  "GLD",
  "GOIL",
  "GSL",
  "HORDS",
  "IIL",
  "MAC",
  "MBG",
  "MMH",
  "MTNGH",
  "PBC",
  "RBGH",
  "SAMBA",
  "SCB",
  "SCBPREF",
  "SIC",
  "SOGEGH",
  "TBL",
  "TLW",
  "TOTAL",
  "UNIL",
];
const GSE_INDEX_NAME_MAP = {
  "GSE-CI": "GSE Composite Index",
  "GSE-FSI": "GSE Financial Stocks Index",
};
const GSE_INDEX_CODES = Object.keys(GSE_INDEX_NAME_MAP);

const SYMBOL_NAME_MAP = {
  ACCESS: "Access Bank Ghana",
  AADS: "AngloGold Ashanti",
  ADB: "Agricultural Development Bank",
  AGA: "AngloGold Ashanti",
  ALLGH: "Atlantic Lithium",
  ALW: "Aluworks",
  ASG: "Asante Gold",
  BOPP: "Benso Oil Palm Plantation",
  CAL: "CAL Bank",
  CLYD: "Clydestone",
  CMLT: "Camelot Ghana",
  CPC: "Cocoa Processing Company",
  DASPHARMA: "Dannex Ayrton Starwin",
  DIGICUT: "Digicut Production & Advertising",
  EGH: "Ecobank Ghana",
  EGL: "Enterprise Group",
  ETI: "Ecobank Transnational",
  FAB: "First Atlantic Bank",
  FML: "Fan Milk",
  GCB: "GCB Bank",
  GGBL: "Guinness Ghana Breweries",
  GLD: "NewGold ETF",
  GOIL: "GOIL",
  GSL: "Golden Star",
  HORDS: "Hords",
  IIL: "Intravenous Infusions",
  MAC: "Mega African Capital",
  MBG: "Mega African",
  MMH: "Meridian-Marshalls Holdings",
  MTNGH: "MTN Ghana",
  PBC: "Produce Buying Company",
  RBGH: "Republic Bank Ghana",
  SAMBA: "Samba Foods",
  SCB: "Standard Chartered Bank Ghana",
  SCBPREF: "Standard Chartered Bank Preference Shares",
  SIC: "SIC Insurance",
  SOGEGH: "Societe Generale Ghana",
  TBL: "Trust Bank",
  TLW: "Tullow Oil",
  TOTAL: "TotalEnergies Marketing Ghana",
  UNIL: "Unilever Ghana",
  ZEN: "ZEN Petroleum Holdings Plc",
};

const SYMBOL_NEWS_ALIASES = {
  ACCESS: ["Access Bank Ghana", "Access Bank Ghana Plc"],
  AADS: ["AngloGold Ashanti", "AngloGold Ashanti Ghana"],
  ALW: ["Aluworks"],
  BOPP: ["Benso Oil Palm Plantation", "BOPP"],
  CAL: ["CAL Bank", "CalBank", "CalBank Plc"],
  CMLT: ["Camelot Ghana", "Camelot"],
  CPC: ["Cocoa Processing Company"],
  EGH: ["Ecobank Ghana"],
  ETI: ["Ecobank Transnational", "Ecobank Transnational Incorporated"],
  FML: ["Fan Milk", "FanMilk"],
  GCB: ["GCB Bank", "Ghana Commercial Bank"],
  GGBL: ["Guinness Ghana", "Guinness Ghana Breweries"],
  GOIL: ["GOIL", "Ghana Oil Company"],
  GSL: ["Golden Star", "Golden Star Resources"],
  MBG: ["Mega African", "Mega African Capital"],
  MTNGH: ["MTN Ghana", "Scancom", "Scancom PLC"],
  PBC: ["Produce Buying Company", "PBC Limited"],
  RBGH: ["Republic Bank Ghana", "Republic Bank Ghana Limited"],
  SCB: ["Standard Chartered Ghana", "Standard Chartered Bank Ghana"],
  SIC: ["SIC Insurance", "SIC Insurance Company"],
  SOGEGH: [
    "Societe Generale Ghana",
    "Societe Generale Ghana PLC",
    "Societe Generale Ghana Plc",
    "Société Générale Ghana",
  ],
  TOTAL: [
    "TotalEnergies Marketing Ghana",
    "Total Petroleum Ghana",
    "TotalEnergies Ghana",
  ],
  UNIL: ["Unilever Ghana", "Unilever Ghana PLC", "Unilever Ghana Plc"],
};

const WIKIPEDIA_TITLE_OVERRIDES = {
  AADS: "AngloGold_Ashanti",
  ACCESS: "Access_Bank_Ghana_Plc",
  CAL: "CalBank",
  EGH: "Ecobank_Ghana",
  ETI: "Ecobank_Transnational",
  GCB: "GCB_Bank",
  GOIL: "Ghana_Oil_Company",
  RBGH: "Republic_Bank_Ghana_Limited",
  SCB: "Standard_Chartered_Ghana",
  SOGEGH: "Societe_Generale_Ghana",
  TBL: "The_Trust_Bank",
  TOTAL: "Total_Petroleum_Ghana",
};

const WIKIPEDIA_SYMBOL_ALIASES = {
  ALLGH: ["Atlantic Lithium", "Atlantic Lithium Limited"],
  EGH: ["Ecobank Ghana"],
  GOIL: ["GOIL PLC", "Ghana Oil Company"],
  MTNGH: ["MTN Ghana", "Scancom PLC", "Scancom"],
  SCB: ["Standard Chartered Bank Ghana", "Standard Chartered Ghana"],
  TBL: ["The Trust Bank", "Trust Bank"],
  TOTAL: ["TotalEnergies Marketing Ghana", "Total Petroleum Ghana"],
  UNIL: ["Unilever Ghana", "Lever Brothers Ghana"],
};

const STOCK_ABOUT_OVERRIDES = {
  ALLGH:
    "Atlantic Lithium Limited is a lithium-focused exploration and development company advancing its flagship Ewoyaa Project in Ghana, West Africa toward production. The Ewoyaa Project is expected to become Ghana's first lithium mine, and the company also holds lithium tenure across Ghana and Cote d'Ivoire.",
  MTNGH:
    "Scancom PLC, trading as MTN Ghana, is a Ghanaian mobile telecommunications and digital services provider, a subsidiary of MTN Group, and a listed company on the Ghana Stock Exchange.",
  ZEN:
    "ZEN Petroleum is a Ghanaian-owned oil marketing company. It has established itself as a market leader supplying fuel and lubricants to mines in Ghana, with an expanding footprint in the African region and a growing retail network in Ghana.",
};

const STOCK_COMPANY_OVERRIDES = {
  ZEN: {
    companyName: "ZEN Petroleum Holdings Plc",
    sector: "Oil & Gas",
    industry: "Integrated Oil & Gas",
    website: "https://www.zenpetroleum.com/",
    logoUrl:
      "https://cdn.prod.website-files.com/668273fd47a10d4c2307db45/668fe26e90d6d7d46fbc1b74_ZEN-256x256.jpg",
  },
};

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : _;
    })
    .replace(/&amp;/gi, "&")
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&hellip;/gi, "...")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&cent;/gi, "¢")
    .replace(/&euro;/gi, "EUR")
    .replace(/&pound;/gi, "GBP");
}

function stripHtml(value) {
  return normalizeWhitespace(
    decodeHtmlEntities(String(value || "").replace(/<[^>]*>/g, " "))
  );
}

function normalizeMatchPhrase(value) {
  return normalizeWhitespace(
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
  );
}

function normalizeSearchText(value) {
  const normalized = normalizeMatchPhrase(value);
  return normalized ? ` ${normalized} ` : " ";
}

function normalizeWikipediaTitle(value) {
  return String(value || "").replace(/_/g, " ").trim();
}

function getWikipediaSpecificKeywords(value) {
  const genericWords = new Set([
    "and",
    "bank",
    "company",
    "ghana",
    "group",
    "holdings",
    "limited",
    "marketing",
    "of",
    "plc",
    "services",
    "the",
  ]);

  return normalizeMatchPhrase(value)
    .split(" ")
    .filter((word) => word.length > 2 && !genericWords.has(word));
}

function setWikipediaAboutCacheEntry(symbol, value, ttlMs = WIKIPEDIA_ABOUT_CACHE_TTL_MS) {
  const key = String(symbol || "").toUpperCase().trim();
  if (!key || !value) {
    return;
  }

  wikipediaAboutCache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || WIKIPEDIA_ABOUT_CACHE_TTL_MS),
  });
}

function getWikipediaAboutCacheEntry(symbol, options = {}) {
  const { allowExpired = false } = options;
  const key = String(symbol || "").toUpperCase().trim();
  if (!key) {
    return null;
  }

  const entry = wikipediaAboutCache.get(key);
  if (!entry) {
    return null;
  }

  if (allowExpired || entry.expiresAt > Date.now()) {
    return entry.value;
  }

  return null;
}

const NORMALIZED_SYMBOL_NEWS_ALIASES = Object.fromEntries(
  Object.entries(SYMBOL_NEWS_ALIASES).map(([symbol, aliases]) => [
    symbol,
    Array.from(
      new Set(
        [...aliases, SYMBOL_NAME_MAP[symbol] || symbol, symbol]
          .map(normalizeMatchPhrase)
          .filter(Boolean)
      )
    ),
  ])
);

const NORMALIZED_FINANCE_TOPIC_KEYWORDS = FINANCE_TOPIC_KEYWORDS.map(
  normalizeMatchPhrase
).filter(Boolean);
const NORMALIZED_PRIMARY_GENERAL_MARKET_KEYWORDS =
  PRIMARY_GENERAL_MARKET_KEYWORDS.map(normalizeMatchPhrase).filter(Boolean);
const NORMALIZED_SECONDARY_GENERAL_MARKET_KEYWORDS =
  SECONDARY_GENERAL_MARKET_KEYWORDS.map(normalizeMatchPhrase).filter(Boolean);
const NORMALIZED_CORPORATE_EVENT_TAG_DEFINITIONS = CORPORATE_EVENT_TAG_DEFINITIONS.map(
  (definition) => ({
    ...definition,
    keywords: definition.keywords.map(normalizeMatchPhrase).filter(Boolean),
  })
);
const NORMALIZED_CORPORATE_EVENT_KEYWORDS = Array.from(
  new Set(
    NORMALIZED_CORPORATE_EVENT_TAG_DEFINITIONS.flatMap((definition) => definition.keywords)
  )
);

function matchesKeywordList(text, keywords) {
  const normalizedText = normalizeSearchText(text);
  return keywords.some((keyword) => normalizedText.includes(` ${keyword} `));
}

function countKeywordMatches(text, keywords) {
  const normalizedText = normalizeSearchText(text);
  return keywords.reduce(
    (count, keyword) =>
      count + (normalizedText.includes(` ${keyword} `) ? 1 : 0),
    0
  );
}

function buildCorporateEventTags(title = "") {
  const normalizedTitle = normalizeSearchText(title);
  if (normalizedTitle === " ") {
    return ["Notice"];
  }

  const labels = NORMALIZED_CORPORATE_EVENT_TAG_DEFINITIONS.filter((definition) =>
    definition.keywords.some(
      (keyword) => normalizedTitle.includes(` ${keyword} `)
    )
  ).map((definition) => definition.label);

  return labels.length > 0 ? Array.from(new Set(labels)).slice(0, 3) : ["Notice"];
}

function isCorporateEventText(text = "") {
  return matchesKeywordList(text, NORMALIZED_CORPORATE_EVENT_KEYWORDS);
}

function isGeneralCorporateNotice(item) {
  const title = String(item?.title || item?.headline || "");
  const company = String(item?.company || "");
  const combined = `${title} ${company}`;
  const normalizedCompany = normalizeMatchPhrase(company);
  const normalizedCombined = normalizeSearchText(combined);

  return (
    !company ||
    normalizedCompany.includes("ghana stock exchange") ||
    normalizedCombined.includes(" ghana stock exchange ") ||
    normalizedCombined.includes(" gse ")
  );
}

function formatAbsoluteDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function toCorporateEventItem(raw, scope = "stock") {
  const title = normalizeWhitespace(raw?.title || raw?.headline || "");
  const url = typeof raw?.url === "string" ? raw.url : "";
  const company = normalizeWhitespace(raw?.company || "");
  const publishedAt = parseDateValue(raw?.publishedAt);
  const matchedSymbols = Array.isArray(raw?.matchedSymbols)
    ? raw.matchedSymbols.map((symbol) => String(symbol || "").toUpperCase().trim()).filter(Boolean)
    : getMentionedSymbols({
        headline: title,
        summary: company || String(raw?.summary || ""),
      });

  return {
    id:
      raw?.id ||
      `${slugifyNewsKey(url || title || company || "event")}-${slugifyNewsKey(
        publishedAt?.toISOString() || String(raw?.publishedAt || "")
      )}`,
    title,
    url,
    source: normalizeWhitespace(raw?.source || "GSE Press Release"),
    company,
    time: publishedAt ? formatAbsoluteDate(publishedAt) : "Recent",
    publishedAt: publishedAt ? publishedAt.toISOString() : "",
    tags: buildCorporateEventTags(title),
    scope,
    matchedSymbols,
  };
}

function sortCorporateEventsByPublishedDate(items) {
  return [...items].sort((left, right) => {
    const leftDate = parseDateValue(left?.publishedAt);
    const rightDate = parseDateValue(right?.publishedAt);
    return (rightDate?.getTime() || 0) - (leftDate?.getTime() || 0);
  });
}

function slugifyNewsKey(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "item";
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatNewsTime(value) {
  if (!value) {
    return "Recent";
  }

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function toAbsoluteUrl(url, baseUrl) {
  if (!url) return "";

  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return "";
  }
}

function normalizeNewsImageUrl(url) {
  if (!url) {
    return "";
  }

  const trimmed = String(url).trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^http:\/\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^http:\/\//i, "")}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return "";
}

function extractMetaContent(tag) {
  const contentMatch = String(tag).match(/content=["']([^"']+)["']/i);
  return contentMatch ? contentMatch[1] : "";
}

function extractImageFromArticleHtml(html, articleUrl) {
  if (!html) {
    return "";
  }

  const metaTagMatches = [
    ...String(html).matchAll(
      /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*>/gi
    ),
    ...String(html).matchAll(
      /<meta[^>]+content=["'][^"']+["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]*>/gi
    ),
  ];

  for (const match of metaTagMatches) {
    const contentValue = extractMetaContent(match[0]);
    const absoluteUrl = toAbsoluteUrl(contentValue, articleUrl);
    const normalized = normalizeNewsImageUrl(absoluteUrl || contentValue);
    if (normalized) {
      return normalized;
    }
  }

  const firstImageMatch = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!firstImageMatch) {
    return "";
  }

  const absoluteImageUrl = toAbsoluteUrl(firstImageMatch[1], articleUrl);
  return normalizeNewsImageUrl(absoluteImageUrl || firstImageMatch[1]);
}

async function resolveArticleImage(articleUrl) {
  const normalizedArticleUrl = toAbsoluteUrl(articleUrl, articleUrl);
  if (!normalizedArticleUrl) {
    return "";
  }

  const cached = newsImageCache.get(normalizedArticleUrl);
  if (cached && Date.now() - cached.fetchedAt < NEWS_IMAGE_CACHE_TTL_MS) {
    return cached.image || "";
  }

  try {
    const html = await fetchTextWithTimeout(
      normalizedArticleUrl,
      NEWS_IMAGE_RESOLVE_TIMEOUT_MS
    );
    const image = extractImageFromArticleHtml(html, normalizedArticleUrl);
    newsImageCache.set(normalizedArticleUrl, {
      image: image || "",
      fetchedAt: Date.now(),
    });
    return image || "";
  } catch {
    newsImageCache.set(normalizedArticleUrl, {
      image: "",
      fetchedAt: Date.now(),
    });
    return "";
  }
}

function seedNewsImageCache(items) {
  for (const item of Array.isArray(items) ? items : []) {
    const normalizedArticleUrl =
      typeof item?.url === "string" ? toAbsoluteUrl(item.url, item.url) : "";
    const normalizedImage = normalizeNewsImageUrl(item?.image || "");

    if (!normalizedArticleUrl || !normalizedImage) {
      continue;
    }

    newsImageCache.set(normalizedArticleUrl, {
      image: normalizedImage,
      fetchedAt: Date.now(),
    });
  }
}

function hydrateNewsItemsWithCachedImages(items) {
  return (Array.isArray(items) ? items : []).map((item) => {
    if (item?.image) {
      return item;
    }

    const normalizedArticleUrl =
      typeof item?.url === "string" ? toAbsoluteUrl(item.url, item.url) : "";
    const cached =
      normalizedArticleUrl ? newsImageCache.get(normalizedArticleUrl) : null;

    if (!cached?.image) {
      return item;
    }

    return {
      ...item,
      image: cached.image,
    };
  });
}

async function enrichNewsItemsWithImages(items) {
  const enrichedItems = items.map((item) => ({ ...item }));
  const missingImageEntries = enrichedItems
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) => !item.image && typeof item.url === "string" && item.url.length > 0
    )
    .slice(0, NEWS_IMAGE_ENRICH_MAX_ITEMS);

  if (missingImageEntries.length === 0) {
    return enrichedItems;
  }

  let cursor = 0;
  const workerCount = Math.min(
    NEWS_IMAGE_ENRICH_CONCURRENCY,
    missingImageEntries.length
  );

  const worker = async () => {
    while (cursor < missingImageEntries.length) {
      const currentIndex = cursor;
      cursor += 1;
      const entry = missingImageEntries[currentIndex];
      if (!entry) {
        continue;
      }

      const resolvedImage = await resolveArticleImage(entry.item.url);
      if (resolvedImage) {
        enrichedItems[entry.index] = {
          ...enrichedItems[entry.index],
          image: resolvedImage,
        };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return enrichedItems;
}

async function refreshNewsImagesInBackground(items) {
  if (newsImageEnrichmentState.pending) {
    return newsImageEnrichmentState.pending;
  }

  const pending = (async () => {
    try {
      const enrichedItems = await enrichNewsItemsWithImages(items);
      if (Array.isArray(enrichedItems) && enrichedItems.length > 0) {
        seedNewsImageCache(enrichedItems);
        newsCache.items = enrichedItems;
      }

      return enrichedItems;
    } catch (error) {
      console.error(
        "News image enrichment failed:",
        error?.message || error
      );
      return items;
    } finally {
      newsImageEnrichmentState.pending = null;
    }
  })();

  newsImageEnrichmentState.pending = pending;
  return pending;
}

function getFeedMediaUrl(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value?.url === "string") {
    return value.url;
  }

  if (typeof value?.$.url === "string") {
    return value.$.url;
  }

  return "";
}

function extractFeedImage(item) {
  const enclosureImage = getFeedMediaUrl(item?.enclosure);
  if (enclosureImage) {
    return normalizeNewsImageUrl(enclosureImage);
  }

  if (Array.isArray(item?.enclosure)) {
    for (const entry of item.enclosure) {
      const image = getFeedMediaUrl(entry);
      if (image) {
        return normalizeNewsImageUrl(image);
      }
    }
  }

  const mediaFields = [
    item?.["media:content"],
    item?.["media:thumbnail"],
    item?.mediaContent,
    item?.mediaThumbnail,
  ];

  for (const field of mediaFields) {
    if (!field) continue;

    if (Array.isArray(field)) {
      for (const entry of field) {
        const image = getFeedMediaUrl(entry);
        if (image) {
          return normalizeNewsImageUrl(image);
        }
      }
      continue;
    }

    const image = getFeedMediaUrl(field);
    if (image) {
      return normalizeNewsImageUrl(image);
    }
  }

  const html =
    item?.["content:encoded"] || item?.content || item?.contentSnippet || "";
  const srcSetMatch = String(html).match(
    /<img[^>]+srcset=["']([^"']+)["']/i
  );
  if (srcSetMatch) {
    const firstSrcSetEntry = srcSetMatch[1].split(",")[0] || "";
    const firstSrcSetUrl = firstSrcSetEntry.trim().split(/\s+/)[0] || "";
    const normalizedSrcSetUrl = normalizeNewsImageUrl(firstSrcSetUrl);
    if (normalizedSrcSetUrl) {
      return normalizedSrcSetUrl;
    }
  }

  const srcMatch = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return srcMatch ? normalizeNewsImageUrl(srcMatch[1]) : "";
}

function normalizeNewsItem(rawItem) {
  const headline = stripHtml(rawItem.headline);

  if (!headline) {
    return null;
  }

  const publishedDate = parseDateValue(rawItem.publishedAt);
  const sortTimestamp =
    Number.isFinite(rawItem.sortTimestamp) && rawItem.sortTimestamp > 0
      ? rawItem.sortTimestamp
      : publishedDate?.getTime() || 0;

  return {
    id:
      rawItem.id ||
      `${slugifyNewsKey(rawItem.source)}-${slugifyNewsKey(
        rawItem.url || headline
      )}`,
    headline,
    source: rawItem.source || "Unknown",
    time: formatNewsTime(publishedDate),
    url: rawItem.url || "",
    image: normalizeNewsImageUrl(rawItem.image || ""),
    summary: stripHtml(rawItem.summary),
    publishedAt: publishedDate ? publishedDate.toISOString() : null,
    sortTimestamp,
  };
}

function dedupeNewsItems(items) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    if (!item) continue;

    const key = normalizeWhitespace(
      `${item.url || ""}::${item.headline || ""}`
    ).toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function isRecentNewsItem(item) {
  if (!item.publishedAt) {
    return true;
  }

  const publishedDate = parseDateValue(item.publishedAt);
  return Boolean(
    publishedDate && Date.now() - publishedDate.getTime() <= NEWS_ITEM_RECENCY_MS
  );
}

function getMentionedSymbols(item) {
  const searchText = normalizeSearchText(`${item.headline} ${item.summary}`);

  return Object.entries(NORMALIZED_SYMBOL_NEWS_ALIASES)
    .filter(([, aliases]) =>
      aliases.some((alias) => searchText.includes(` ${alias} `))
    )
    .map(([symbol]) => symbol);
}

function isFinanceTopic(item) {
  return matchesKeywordList(
    `${item.headline} ${item.summary}`,
    NORMALIZED_FINANCE_TOPIC_KEYWORDS
  );
}

function isGeneralMarketNews(item) {
  const searchableText = `${item.headline} ${item.summary}`;
  const primaryMatches = countKeywordMatches(
    searchableText,
    NORMALIZED_PRIMARY_GENERAL_MARKET_KEYWORDS
  );
  const secondaryMatches = countKeywordMatches(
    searchableText,
    NORMALIZED_SECONDARY_GENERAL_MARKET_KEYWORDS
  );

  return primaryMatches >= 1 || primaryMatches + secondaryMatches >= 2;
}

async function fetchTextWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: NEWS_REQUEST_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function withPromiseTimeout(promise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function runNewsSourceTask(source, task, timeoutMs = NEWS_SOURCE_TASK_TIMEOUT_MS) {
  try {
    return await withPromiseTimeout(
      task(),
      timeoutMs,
      `Request timed out after ${timeoutMs}ms`
    );
  } catch (error) {
    logNewsSourceFailure(source, error);
    return [];
  }
}

async function fetchJsonWithTimeout(url, options = {}) {
  const {
    timeoutMs = 8000,
    headers = {},
  } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function scrapeGsePressReleaseArchivePage(page, pageNumber = 1) {
  const pageUrl =
    pageNumber > 1
      ? `${GSE_PRESS_RELEASE_ARCHIVE_URL}?_page=${pageNumber}`
      : GSE_PRESS_RELEASE_ARCHIVE_URL;

  await page.goto(pageUrl, {
    waitUntil: "domcontentloaded",
    timeout: GSE_PRESS_RELEASE_PAGE_TIMEOUT_MS,
  });

  let hasCards = false;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.waitForTimeout(4000);
    const cardCount = await page.locator("article.wpgb-card").count();

    if (cardCount > 0) {
      hasCards = true;
      break;
    }
  }

  if (!hasCards) {
    throw new Error(
      `GSE press release archive page ${pageNumber} did not expose cards in time`
    );
  }

  return page.evaluate(() =>
    Array.from(document.querySelectorAll("article.wpgb-card"))
      .map((card) => {
        const titleLink = card.querySelector("h3 a[href*='/pressrelease/']");
        const company =
          card.querySelector(".wpgb-block-term")?.textContent?.trim() || "";
        const publishedAt =
          card.querySelector("time[datetime]")?.getAttribute("datetime") ||
          card.querySelector("time")?.textContent?.trim() ||
          "";

        return {
          title: titleLink?.textContent?.trim() || "",
          url: titleLink?.href || "",
          company,
          publishedAt,
          source: "GSE Press Release",
        };
      })
      .filter((item) => item.title && item.url)
  );
}

async function scrapeGsePressReleaseArchive() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      userAgent: NEWS_REQUEST_HEADERS["User-Agent"],
    });
    const collectedItems = [];
    let successfulPages = 0;

    for (let pageNumber = 1; pageNumber <= GSE_PRESS_RELEASE_MAX_PAGES; pageNumber += 1) {
      try {
        const pageItems = await scrapeGsePressReleaseArchivePage(page, pageNumber);
        collectedItems.push(...pageItems);
        successfulPages += 1;
      } catch (error) {
        if (pageNumber === 1 || successfulPages === 0) {
          throw error;
        }

        console.error(
          `GSE press release page ${pageNumber} scrape failed:`,
          error?.message || error
        );
        break;
      }
    }

    const dedupedItems = [];
    const seen = new Set();

    for (const item of collectedItems) {
      const normalizedItem = toCorporateEventItem(item, "stock");
      const key = `${normalizedItem.url}::${normalizedItem.title}`;

      if (!normalizedItem.title || !normalizedItem.url || seen.has(key)) {
        continue;
      }

      seen.add(key);
      dedupedItems.push(normalizedItem);
    }

    return sortCorporateEventsByPublishedDate(dedupedItems);
  } finally {
    await browser.close();
  }
}

async function refreshGsePressReleaseArchive() {
  if (gsePressReleaseCache.pending) {
    return gsePressReleaseCache.pending;
  }

  gsePressReleaseCache.pending = (async () => {
    try {
      const items = await scrapeGsePressReleaseArchive();
      gsePressReleaseCache.items = items;
      gsePressReleaseCache.fetchedAt = Date.now();
      return items;
    } finally {
      gsePressReleaseCache.pending = null;
    }
  })();

  return gsePressReleaseCache.pending;
}

async function getGsePressReleaseArchive(options = {}) {
  const { allowStale = true, forceRefresh = false } = options;
  const hasCachedItems = gsePressReleaseCache.items.length > 0;
  const isFresh =
    hasCachedItems &&
    Date.now() - gsePressReleaseCache.fetchedAt < GSE_PRESS_RELEASE_CACHE_TTL_MS;

  if (!forceRefresh && isFresh) {
    return gsePressReleaseCache.items;
  }

  if (!forceRefresh && allowStale && hasCachedItems) {
    void refreshGsePressReleaseArchive().catch((error) => {
      console.error(
        "Background GSE press release refresh failed:",
        error?.message || error
      );
    });
    return gsePressReleaseCache.items;
  }

  return refreshGsePressReleaseArchive();
}

function getErrorMessage(error) {
  const message = String(error?.message || error || "Unknown error");
  return normalizeWhitespace(message);
}

function markNewsSourceSuccess(source) {
  const state = newsSourceFailureState.get(source);
  if (!state || !state.isFailing) {
    return;
  }

  const totalFailures = 1 + Number(state.suppressedCount || 0);
  if (totalFailures > 1) {
    console.log(`News source recovered (${source}) after ${totalFailures} failures.`);
  } else {
    console.log(`News source recovered (${source}).`);
  }

  newsSourceFailureState.set(source, {
    lastMessage: "",
    lastLoggedAt: 0,
    suppressedCount: 0,
    isFailing: false,
  });
}

function logNewsSourceFailure(source, error) {
  const now = Date.now();
  const message = getErrorMessage(error);
  const previousState = newsSourceFailureState.get(source) || {
    lastMessage: "",
    lastLoggedAt: 0,
    suppressedCount: 0,
    isFailing: false,
  };
  const sameMessage = previousState.lastMessage === message;
  const withinCooldown =
    now - Number(previousState.lastLoggedAt || 0) <
    NEWS_SOURCE_FAILURE_LOG_COOLDOWN_MS;

  if (sameMessage && withinCooldown) {
    newsSourceFailureState.set(source, {
      ...previousState,
      suppressedCount: Number(previousState.suppressedCount || 0) + 1,
      isFailing: true,
    });
    return;
  }

  if (sameMessage && Number(previousState.suppressedCount || 0) > 0) {
    console.error(
      `News source failed (${source}): ${message} (repeated ${previousState.suppressedCount} times)`
    );
  } else {
    console.error(`News source failed (${source}): ${message}`);
  }

  newsSourceFailureState.set(source, {
    lastMessage: message,
    lastLoggedAt: now,
    suppressedCount: 0,
    isFailing: true,
  });
}

async function fetchRssNewsSource({
  source,
  url,
  limit = NEWS_SOURCE_LIMIT,
  filterItem,
  timeoutMs = RSS_SOURCE_TIMEOUT_MS,
}) {
  try {
    const xml = await fetchTextWithTimeout(url, timeoutMs);
    const feed = await rssParser.parseString(xml);
    const items = Array.isArray(feed.items) ? feed.items : [];
    const normalizedItems = items
      .slice(0, limit * 3)
      .map((item, index) =>
        normalizeNewsItem({
          source,
          headline: item.title,
          summary: item.contentSnippet || item.content || "",
          url: item.link,
          image: extractFeedImage(item),
          publishedAt: item.isoDate || item.pubDate || "",
          sortTimestamp: Date.now() - index * 60 * 1000,
        })
      )
      .filter(Boolean)
      .filter((item) => (typeof filterItem === "function" ? filterItem(item) : true))
      .slice(0, limit);

    markNewsSourceSuccess(source);
    return dedupeNewsItems(normalizedItems);
  } catch (error) {
    logNewsSourceFailure(source, error);
    return [];
  }
}

async function fetchHtmlNewsSource({
  source,
  url,
  limit = NEWS_SOURCE_LIMIT,
  timeoutMs = HTML_SOURCE_TIMEOUT_MS,
  extractItems,
}) {
  try {
    const html = await fetchTextWithTimeout(url, timeoutMs);
    const rawItems = extractItems(html).slice(0, limit);
    const normalizedItems = rawItems
      .map((item, index) =>
        normalizeNewsItem({
          source: item.source || source,
          headline: item.headline,
          summary: item.summary || "",
          url: item.url,
          image: item.image || "",
          publishedAt: item.publishedAt || null,
          sortTimestamp:
            item.sortTimestamp || Date.now() - index * 60 * 1000,
        })
      )
      .filter(Boolean);

    markNewsSourceSuccess(source);
    return dedupeNewsItems(normalizedItems);
  } catch (error) {
    logNewsSourceFailure(source, error);
    return [];
  }
}

function buildMergedNewsItems(sourceItems) {
  const mergedItems = dedupeNewsItems(sourceItems.flat())
    .map((item) => ({
      ...item,
      matchedSymbols: getMentionedSymbols(item),
    }))
    .filter((item) => item.matchedSymbols.length > 0 || item.headline)
    .sort((left, right) => right.sortTimestamp - left.sortTimestamp)
    .slice(0, 200);

  seedNewsImageCache(mergedItems);
  return hydrateNewsItemsWithCachedImages(mergedItems);
}

function extractGraphicBusinessItems(html) {
  const matches = [
    ...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gis),
  ];

  return matches
    .map((match) => ({
      url: toAbsoluteUrl(match[1], "https://www.graphic.com.gh"),
      headline: stripHtml(match[2]),
    }))
    .filter(
      (item) =>
        item.url &&
        item.headline.length >= 20 &&
        item.url.endsWith(".html") &&
        (item.url.includes("/news/") || item.url.includes("/business/")) &&
        !item.headline.toLowerCase().includes("graphic online") &&
        !item.headline.toLowerCase().includes("more stories")
    );
}

function extractGhanaWebBusinessItems(html) {
  const matches = [
    ...html.matchAll(/<a[^>]+href="([^"]+)"[^>]+title="([^"]{16,220})"[^>]*>/gi),
  ];

  return matches
    .map((match) => {
      const url = toAbsoluteUrl(
        match[1],
        "https://www.ghanaweb.com/GhanaHomePage/business/"
      );

      return {
        url,
        headline: stripHtml(match[2]),
      };
    })
    .filter(
      (item) =>
        item.url &&
        item.headline.length >= 20 &&
        item.url.includes("/GhanaHomePage/") &&
        (item.url.includes("/NewsArchive/") || item.url.includes("/business/")) &&
        !item.url.includes("browse.archive") &&
        !item.url.includes("/television/") &&
        !item.url.includes("/radio/") &&
        !item.url.includes("/SportsArchive/")
    );
}

function parsePulsePublishedAt(url) {
  const match = String(url || "").match(/-(\d{12})\d*$/);

  if (!match) {
    return null;
  }

  const [, raw] = match;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const hour = Number(raw.slice(8, 10));
  const minute = Number(raw.slice(10, 12));
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractPulseBusinessItems(html) {
  const matches = [
    ...html.matchAll(
      /<a[^>]+href="(https:\/\/www\.pulse\.com\.gh\/story\/[^"#]+|\/story\/[^"#]+)"[^>]*>(.*?)<\/a>/gis
    ),
  ];

  return matches
    .map((match) => {
      const url = toAbsoluteUrl(match[1], "https://www.pulse.com.gh");

      return {
        url,
        headline: stripHtml(match[2]),
        publishedAt: parsePulsePublishedAt(url),
      };
    })
    .filter(
      (item) =>
        item.url &&
        item.headline.length >= 20 &&
        !item.url.includes("/topic/")
    );
}

async function fetchAllNewsItems(options = {}) {
  const { forceRefresh = false } = options;
  const now = Date.now();
  const hasCachedItems = newsCache.items.length > 0;

  if (
    !forceRefresh &&
    hasCachedItems &&
    now - newsCache.fetchedAt < NEWS_CACHE_TTL_MS
  ) {
    return newsCache.items;
  }

  if (hasCachedItems) {
    void refreshAllNewsItems();
    return newsCache.items;
  }

  return refreshAllNewsItems();
}

async function refreshAllNewsItems() {
  if (newsCache.pending) {
    return newsCache.pending;
  }

  newsCache.pending = (async () => {
    const sourceItems = await Promise.all([
      runNewsSourceTask("MyJoyOnline", () =>
        fetchRssNewsSource({
          source: "MyJoyOnline",
          url: "https://www.myjoyonline.com/feed/",
        })
      ),
      runNewsSourceTask("3News", () =>
        fetchRssNewsSource({
          source: "3News",
          url: "https://3news.com/feed.xml",
        })
      ),
      runNewsSourceTask(
        "NewsGhana",
        () =>
          fetchRssNewsSource({
            source: "NewsGhana",
            url: "https://www.newsghana.com.gh/feed/",
            timeoutMs: 9000,
          }),
        11000
      ),
      runNewsSourceTask("B&FT", () =>
        fetchRssNewsSource({
          source: "B&FT",
          url: "https://thebftonline.com/feed/",
        })
      ),
      runNewsSourceTask("Ghana Business News", () =>
        fetchRssNewsSource({
          source: "Ghana Business News",
          url: "https://www.ghanabusinessnews.com/feed/",
        })
      ),
      runNewsSourceTask("GraphicOnline", () =>
        fetchHtmlNewsSource({
          source: "GraphicOnline",
          url: "https://www.graphic.com.gh",
          extractItems: extractGraphicBusinessItems,
        })
      ),
      runNewsSourceTask("GhanaWeb", () =>
        fetchHtmlNewsSource({
          source: "GhanaWeb",
          url: "https://www.ghanaweb.com/",
          extractItems: extractGhanaWebBusinessItems,
        })
      ),
      runNewsSourceTask("Pulse Ghana", () =>
        fetchHtmlNewsSource({
          source: "Pulse Ghana",
          url: "https://www.pulse.com.gh",
          extractItems: extractPulseBusinessItems,
        })
      ),
    ]);

    const mergedItems = buildMergedNewsItems(sourceItems);

    if (mergedItems.length > 0) {
      newsCache.items = mergedItems;
      newsCache.fetchedAt = Date.now();
      void refreshNewsImagesInBackground(mergedItems);
      return mergedItems;
    }

    return newsCache.items;
  })();

  try {
    return await newsCache.pending;
  } finally {
    newsCache.pending = null;
  }
}

function toClientNewsItem(item, scope = "market") {
  return {
    id: item.id,
    headline: item.headline,
    source: item.source,
    time: item.time,
    url: item.url,
    image: item.image,
    scope,
  };
}

function selectStockNewsItems(symbol, items) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const recentItems = Array.isArray(items) ? items.filter(isRecentNewsItem) : [];
  const stockSpecificItems = recentItems.filter((item) =>
    item.matchedSymbols.includes(upperSymbol)
  );
  const fallbackItems = recentItems.filter(
    (item) => item.matchedSymbols.length === 0 && isGeneralMarketNews(item)
  );

  const selectedItems = [];
  const seen = new Set();

  for (const item of stockSpecificItems) {
    const key = `${item.url}::${item.headline}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selectedItems.push(toClientNewsItem(item, "stock"));

    if (selectedItems.length >= STOCK_NEWS_MAX_ITEMS) {
      break;
    }
  }

  for (const item of fallbackItems) {
    const key = `${item.url}::${item.headline}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selectedItems.push(toClientNewsItem(item, "market"));

    if (selectedItems.length >= STOCK_NEWS_MAX_ITEMS) {
      break;
    }
  }

  return {
    fallbackUsed: selectedItems.some((item) => item.scope === "market"),
    items: selectedItems,
  };
}

async function getStockNews(symbol) {
  const now = Date.now();
  const hasCachedItems = newsCache.items.length > 0;

  if (hasCachedItems) {
    if (now - newsCache.fetchedAt >= NEWS_CACHE_TTL_MS) {
      void refreshAllNewsItems().catch((error) => {
        console.error("Background stock news refresh failed:", error?.message || error);
      });
    }

    return selectStockNewsItems(symbol, newsCache.items);
  }

  void refreshAllNewsItems().catch((error) => {
    console.error("Initial stock news refresh failed:", error?.message || error);
  });

  return {
    fallbackUsed: false,
    items: [],
    pending: true,
  };
}

function selectCorporateArchiveItems(symbol, items) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const specificItems = [];

  for (const item of sortCorporateEventsByPublishedDate(items)) {
    if (Array.isArray(item.matchedSymbols) && item.matchedSymbols.includes(upperSymbol)) {
      specificItems.push({
        ...item,
        scope: "stock",
      });
    }
  }

  const selectedItems = [];
  const seen = new Set();

  for (const entry of specificItems) {
    const key = `${entry.url}::${entry.title}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    selectedItems.push({
      id: entry.id,
      title: entry.title,
      url: entry.url,
      source: entry.source,
      company: entry.company,
      time: entry.time,
      publishedAt: entry.publishedAt,
      tags: entry.tags,
      scope: entry.scope,
    });

    if (selectedItems.length >= STOCK_CORPORATE_ACTIONS_MAX_ITEMS) {
      break;
    }
  }

  return {
    fallbackUsed: false,
    items: selectedItems,
  };
}

async function getStockCorporateActions(symbol) {
  const now = Date.now();
  const hasCachedItems = gsePressReleaseCache.items.length > 0;

  if (hasCachedItems) {
    if (now - gsePressReleaseCache.fetchedAt >= GSE_PRESS_RELEASE_CACHE_TTL_MS) {
      void refreshGsePressReleaseArchive().catch((error) => {
        console.error(
          "Background corporate actions refresh failed:",
          error?.message || error
        );
      });
    }

    return selectCorporateArchiveItems(symbol, gsePressReleaseCache.items);
  }

  void getGsePressReleaseArchive({ allowStale: false }).catch((error) => {
    console.error(
      "Initial corporate actions refresh failed:",
      error?.message || error
    );
  });

  return {
    fallbackUsed: false,
    items: [],
    pending: true,
  };
}

function selectGeneralHomepageNews(items) {
  const candidates = items
    .filter(isRecentNewsItem)
    .filter((item) => item.matchedSymbols.length === 0);

  const selectedItems = [];
  const seen = new Set();
  const sourceCounts = new Map();
  const sourceSoftCap = 3;

  for (const item of candidates) {
    const key = `${item.url}::${item.headline}`;
    if (seen.has(key)) continue;

    const currentSourceCount = sourceCounts.get(item.source) || 0;
    if (currentSourceCount >= sourceSoftCap) {
      continue;
    }

    seen.add(key);
    sourceCounts.set(item.source, currentSourceCount + 1);
    selectedItems.push(item);

    if (selectedItems.length >= HOME_NEWS_MAX_ITEMS) {
      return selectedItems;
    }
  }

  for (const item of candidates) {
    const key = `${item.url}::${item.headline}`;
    if (seen.has(key)) continue;

    seen.add(key);
    selectedItems.push(item);

    if (selectedItems.length >= HOME_NEWS_MAX_ITEMS) {
      return selectedItems;
    }
  }

  return selectedItems;
}

async function getHomepageNews(options = {}) {
  const { forceRefresh = false } = options;
  const now = Date.now();
  const hasCachedItems = newsCache.items.length > 0;

  if (!forceRefresh && !hasCachedItems) {
    void refreshAllNewsItems().catch((error) => {
      console.error("Initial homepage news refresh failed:", error?.message || error);
    });
    return [];
  }

  if (!forceRefresh && hasCachedItems && now - newsCache.fetchedAt >= NEWS_CACHE_TTL_MS) {
    void refreshAllNewsItems().catch((error) => {
      console.error("Background homepage news refresh failed:", error?.message || error);
    });
    return selectGeneralHomepageNews(newsCache.items).map((item) =>
      toClientNewsItem(item, "market")
    );
  }

  const items = await fetchAllNewsItems(options);
  const selectedItems = selectGeneralHomepageNews(items);
  return selectedItems.map((item) => toClientNewsItem(item, "market"));
}

function buildWikipediaAboutCandidates(symbol, companyName = "") {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const titleOverride = normalizeWikipediaTitle(
    WIKIPEDIA_TITLE_OVERRIDES[upperSymbol] || ""
  );

  return Array.from(
    new Set(
      [
        titleOverride,
        ...(WIKIPEDIA_SYMBOL_ALIASES[upperSymbol] || []),
        ...(SYMBOL_NEWS_ALIASES[upperSymbol] || []),
        companyName,
        SYMBOL_NAME_MAP[upperSymbol] || "",
      ]
        .map(normalizeWhitespace)
        .filter(Boolean)
    )
  );
}

function canAttemptWikipediaAboutLookup(symbol, companyName = "") {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const hasCuratedCandidate =
    Boolean(WIKIPEDIA_TITLE_OVERRIDES[upperSymbol]) ||
    (WIKIPEDIA_SYMBOL_ALIASES[upperSymbol] || []).length > 0 ||
    (SYMBOL_NEWS_ALIASES[upperSymbol] || []).length > 0;

  if (hasCuratedCandidate) {
    return true;
  }

  const normalizedCompanyName = normalizeMatchPhrase(companyName);
  const normalizedSymbol = normalizeMatchPhrase(upperSymbol);
  const tokens = normalizedCompanyName.split(" ").filter(Boolean);

  if (!normalizedCompanyName) {
    return false;
  }

  if (tokens.length >= 2) {
    return true;
  }

  if (normalizedCompanyName.includes("ghana")) {
    return true;
  }

  return normalizedCompanyName !== normalizedSymbol && normalizedCompanyName.length > 4;
}

async function fetchWikipediaSummaryByTitle(title) {
  const normalizedTitle = normalizeWikipediaTitle(title);
  if (!normalizedTitle) {
    return null;
  }

  try {
    const data = await fetchJsonWithTimeout(
      `${WIKIPEDIA_API_BASE}/api/rest_v1/page/summary/${encodeURIComponent(
        normalizedTitle.replace(/\s+/g, "_")
      )}`,
      {
        timeoutMs: WIKIPEDIA_TIMEOUT_MS,
        headers: WIKIPEDIA_REQUEST_HEADERS,
      }
    );

    const description = normalizeWhitespace(data?.extract || "");
    if (!description || data?.type === "disambiguation") {
      return null;
    }

    return {
      description,
      pageTitle: normalizeWikipediaTitle(data?.title || normalizedTitle),
      pageUrl: data?.content_urls?.desktop?.page || "",
      source: "wikipedia-summary",
    };
  } catch {
    return null;
  }
}

function isWikipediaSummarySpecificEnough(requestedTitle, summary) {
  const requestedNorm = normalizeMatchPhrase(normalizeWikipediaTitle(requestedTitle));
  const titleNorm = normalizeMatchPhrase(summary?.pageTitle || "");
  const requestedKeywords = getWikipediaSpecificKeywords(requestedTitle);

  if (!requestedNorm || !titleNorm) {
    return false;
  }

  if (requestedNorm === titleNorm) {
    return true;
  }

  if (requestedNorm.includes("ghana") && !titleNorm.includes("ghana")) {
    return false;
  }

  return requestedKeywords.some((word) => titleNorm.includes(word));
}

async function searchWikipedia(query) {
  const normalizedQuery = normalizeWhitespace(query);
  if (!normalizedQuery) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      action: "query",
      list: "search",
      format: "json",
      srlimit: String(WIKIPEDIA_SEARCH_RESULT_LIMIT),
      srsearch: normalizedQuery,
    });

    const data = await fetchJsonWithTimeout(
      `${WIKIPEDIA_API_BASE}/w/api.php?${params.toString()}`,
      {
        timeoutMs: WIKIPEDIA_TIMEOUT_MS,
        headers: WIKIPEDIA_REQUEST_HEADERS,
      }
    );

    return Array.isArray(data?.query?.search) ? data.query.search : [];
  } catch {
    return [];
  }
}

function scoreWikipediaSearchResult(symbol, candidate, result) {
  const candidateNorm = normalizeMatchPhrase(candidate);
  const companyNorm = normalizeMatchPhrase(SYMBOL_NAME_MAP[symbol] || "");
  const titleNorm = normalizeMatchPhrase(result?.title || "");
  const snippet = stripHtml(result?.snippet || "");
  const snippetText = normalizeSearchText(snippet);
  const candidateKeywords = getWikipediaSpecificKeywords(candidate);
  const companyKeywords = getWikipediaSpecificKeywords(
    SYMBOL_NAME_MAP[symbol] || ""
  );
  let score = 0;

  if (!candidateNorm || !titleNorm) {
    return {
      score,
      snippet,
      title: String(result?.title || ""),
    };
  }

  if (titleNorm === candidateNorm) {
    score += 24;
  } else if (titleNorm.includes(candidateNorm) || candidateNorm.includes(titleNorm)) {
    score += 12;
  }

  if (snippetText.includes(` ${candidateNorm} `)) {
    score += 10;
  }

  if (candidateNorm.includes("ghana") && snippetText.includes(" ghana ")) score += 4;
  if (companyNorm && snippetText.includes(` ${companyNorm} `)) score += 6;

  for (const keyword of candidateKeywords) {
    if (titleNorm.includes(keyword)) score += 7;
    if (snippetText.includes(` ${keyword} `)) score += 6;
  }

  for (const keyword of companyKeywords) {
    if (titleNorm.includes(keyword)) score += 5;
    if (snippetText.includes(` ${keyword} `)) score += 4;
  }

  const hasSpecificKeywordMatch = [...candidateKeywords, ...companyKeywords].some(
    (keyword) =>
      titleNorm.includes(keyword) || snippetText.includes(` ${keyword} `)
  );

  if (!hasSpecificKeywordMatch) {
    score -= 12;
  }

  if (/^list of\b/i.test(String(result?.title || ""))) {
    score -= 10;
  }

  if (/^(ghana club 100|ghana stock exchange|telecommunications in ghana)\b/i.test(String(result?.title || ""))) {
    score -= 14;
  }

  if (snippet.length >= 60) {
    score += 2;
  }

  return {
    score,
    snippet,
    title: String(result?.title || ""),
  };
}

function normalizeWikipediaSnippet(value) {
  let text = stripHtml(value);
  if (!text) {
    return "";
  }

  if (/^\d{4},/.test(text)) {
    text = `In ${text}`;
  }

  if (!/[.!?]$/.test(text)) {
    text = `${text}.`;
  }

  return text;
}

function isWikipediaSearchSnippetSpecificEnough(candidate, result) {
  return isWikipediaSummarySpecificEnough(candidate, {
    pageTitle: String(result?.title || ""),
  });
}

async function resolveStockAbout(symbol, options = {}) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  if (!upperSymbol) {
    return {
      description: "Company information not available.",
      source: "fallback",
    };
  }

  const { companyName = "", fallbackDescription = "", website = "" } = options;
  const cached = getWikipediaAboutCacheEntry(upperSymbol);
  if (cached) {
    return cached;
  }

  if (wikipediaAboutPending.has(upperSymbol)) {
    return wikipediaAboutPending.get(upperSymbol);
  }

  const pending = (async () => {
    if (website) {
      const websiteBranding = await resolveCompanyWebsiteBranding(upperSymbol, {
        companyName,
        website,
      });

      if (
        isUsefulCompanyWebsiteDescription(
          websiteBranding.description,
          companyName,
          upperSymbol
        )
      ) {
        const payload = {
          description: websiteBranding.description,
          source: websiteBranding.source,
          pageUrl: websiteBranding.website,
        };
        setWikipediaAboutCacheEntry(upperSymbol, payload);
        return payload;
      }
    }

    if (STOCK_ABOUT_OVERRIDES[upperSymbol]) {
      const payload = {
        description: STOCK_ABOUT_OVERRIDES[upperSymbol],
        source: "alias-fallback",
      };
      setWikipediaAboutCacheEntry(upperSymbol, payload);
      return payload;
    }

    if (!canAttemptWikipediaAboutLookup(upperSymbol, companyName)) {
      const payload = {
        description:
          normalizeWhitespace(fallbackDescription) || "Company information not available.",
        source: fallbackDescription ? "kwayisi-fallback" : "fallback",
      };
      setWikipediaAboutCacheEntry(upperSymbol, payload, 60 * 60 * 1000);
      return payload;
    }

    const candidates = buildWikipediaAboutCandidates(upperSymbol, companyName);

    for (const candidate of candidates.slice(0, 2)) {
      const summary = await fetchWikipediaSummaryByTitle(candidate);
      if (summary && isWikipediaSummarySpecificEnough(candidate, summary)) {
        const payload = {
          description: summary.description,
          source: summary.source,
          pageTitle: summary.pageTitle,
          pageUrl: summary.pageUrl,
        };
        setWikipediaAboutCacheEntry(upperSymbol, payload);
        return payload;
      }
    }

    let bestSnippetMatch = null;

    for (const candidate of candidates.slice(0, 2)) {
      const results = await searchWikipedia(candidate);

      for (const result of results) {
        const scored = scoreWikipediaSearchResult(upperSymbol, candidate, result);

        if (
          !bestSnippetMatch ||
          scored.score > bestSnippetMatch.score
        ) {
          bestSnippetMatch = {
            ...scored,
            candidate,
          };
        }

        if (scored.score >= 18) {
          const summary = await fetchWikipediaSummaryByTitle(scored.title);
          if (summary && isWikipediaSummarySpecificEnough(candidate, summary)) {
            const payload = {
              description: summary.description,
              source: summary.source,
              pageTitle: summary.pageTitle,
              pageUrl: summary.pageUrl,
            };
            setWikipediaAboutCacheEntry(upperSymbol, payload);
            return payload;
          }
        }
      }
    }

    if (
      bestSnippetMatch &&
      bestSnippetMatch.score >= 14 &&
      isWikipediaSearchSnippetSpecificEnough(
        bestSnippetMatch.candidate,
        bestSnippetMatch
      )
    ) {
      const payload = {
        description: normalizeWikipediaSnippet(bestSnippetMatch.snippet),
        source: "wikipedia-search",
        pageTitle: bestSnippetMatch.title,
      };
      setWikipediaAboutCacheEntry(upperSymbol, payload);
      return payload;
    }

    const payload = {
      description:
        normalizeWhitespace(fallbackDescription) || "Company information not available.",
      source: fallbackDescription ? "kwayisi-fallback" : "fallback",
    };
    setWikipediaAboutCacheEntry(upperSymbol, payload, 60 * 60 * 1000);
    return payload;
  })();

  wikipediaAboutPending.set(upperSymbol, pending);

  try {
    return await pending;
  } finally {
    wikipediaAboutPending.delete(upperSymbol);
  }
}

function mapStock(item) {
  const rawSymbol =
    item.ticker ||
    item.symbol ||
    item.equity ||
    item.code ||
    item.name ||
    "";

  const symbol = String(rawSymbol).toUpperCase().trim();
  const price = Number(item.price ?? item.close ?? 0);
  const change = Number(item.change ?? item.change_value ?? 0);
  const rawChangePercent =
    item.changePercent ??
    item.change_percent ??
    item.pct ??
    item.percentChange ??
    item.percentageChange;
  const parsedChangePercent = Number(rawChangePercent);
  const changePercent = Number.isFinite(parsedChangePercent)
    ? parsedChangePercent
    : deriveChangePercent(price, change);
  const companyOverride =
    STOCK_COMPANY_OVERRIDES[String(rawSymbol || "").toUpperCase().trim()] || null;

  return {
    symbol,
    name:
      companyOverride?.companyName ||
      item.company ||
      SYMBOL_NAME_MAP[symbol] ||
      item.name ||
      symbol ||
      "Unknown",
    companyName:
      companyOverride?.companyName ||
      item.company ||
      SYMBOL_NAME_MAP[symbol] ||
      item.name ||
      symbol ||
      "Unknown",
    price,
    change,
    changePercent,
    volume: Number(item.volume ?? item.tradeVolume ?? 0),
    sector: companyOverride?.sector || "",
    industry: companyOverride?.industry || "",
    website: companyOverride?.website || "",
    logoUrl: companyOverride?.logoUrl || "",
  };
}

function normalizeCompanyWebsite(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getCompanyWebsiteBrandingCacheKey(url) {
  const normalizedUrl = normalizeCompanyWebsite(url);
  if (!normalizedUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}`.toLowerCase();
  } catch {
    return normalizedUrl.toLowerCase();
  }
}

function getCompanyWebsiteBrandingCacheEntry(url, options = {}) {
  const { allowExpired = false } = options;
  const key = getCompanyWebsiteBrandingCacheKey(url);
  if (!key) {
    return null;
  }

  const entry = companyWebsiteBrandingCache.get(key);
  if (!entry) {
    return null;
  }

  if (allowExpired || entry.expiresAt > Date.now()) {
    return entry.value;
  }

  return null;
}

function setCompanyWebsiteBrandingCacheEntry(
  url,
  value,
  ttlMs = COMPANY_WEBSITE_BRANDING_CACHE_TTL_MS
) {
  const key = getCompanyWebsiteBrandingCacheKey(url);
  if (!key) {
    return;
  }

  companyWebsiteBrandingCache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || COMPANY_WEBSITE_BRANDING_CACHE_TTL_MS),
  });
}

function getHtmlTagAttribute(tag, attributeName) {
  const match = String(tag || "").match(
    new RegExp(
      `${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i"
    )
  );

  return normalizeWhitespace(
    decodeHtmlEntities(match?.[1] || match?.[2] || match?.[3] || "")
  );
}

function extractMetaTagContent(html, attributeName, attributeValue) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  const expectedValue = String(attributeValue || "").toLowerCase();

  for (const tag of tags) {
    const actualValue = getHtmlTagAttribute(tag, attributeName).toLowerCase();
    if (actualValue !== expectedValue) {
      continue;
    }

    const content = stripHtml(getHtmlTagAttribute(tag, "content"));
    if (content) {
      return content;
    }
  }

  return "";
}

function extractLinkHrefByRel(html, relValues = []) {
  const tags = String(html || "").match(/<link\b[^>]*>/gi) || [];

  for (const expectedRel of relValues) {
    const normalizedRel = String(expectedRel || "").toLowerCase();

    for (const tag of tags) {
      const rel = getHtmlTagAttribute(tag, "rel").toLowerCase();
      const href = getHtmlTagAttribute(tag, "href");

      if (!rel || !href) {
        continue;
      }

      if (rel === normalizedRel || rel.includes(normalizedRel)) {
        return href;
      }
    }
  }

  return "";
}

function buildCompanyWebsiteFaviconUrl(url) {
  const normalizedUrl = normalizeCompanyWebsite(url);
  if (!normalizedUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
      parsedUrl.origin
    )}`;
  } catch {
    return "";
  }
}

function isUsefulCompanyWebsiteDescription(description, companyName = "", symbol = "") {
  const normalizedDescription = normalizeWhitespace(stripHtml(description));
  if (normalizedDescription.length < 24) {
    return false;
  }

  const lowerDescription = normalizedDescription.toLowerCase();
  const blockedPhrases = [
    "coming soon",
    "under construction",
    "enable javascript",
    "javascript is disabled",
    "skip to content",
    "page not found",
    "403 forbidden",
    "404 not found",
  ];

  if (blockedPhrases.some((phrase) => lowerDescription.includes(phrase))) {
    return false;
  }

  const searchableTerms = [companyName, symbol]
    .map((value) => normalizeMatchPhrase(value))
    .filter(Boolean);

  if (
    searchableTerms.length > 0 &&
    searchableTerms.some((term) => normalizeMatchPhrase(normalizedDescription).includes(term))
  ) {
    return true;
  }

  return normalizedDescription.length >= 48;
}

function extractCompanyWebsiteDescription(html, companyName = "", symbol = "") {
  const candidates = [
    extractMetaTagContent(html, "property", "og:description"),
    extractMetaTagContent(html, "name", "description"),
    extractMetaTagContent(html, "name", "twitter:description"),
  ];

  return (
    candidates.find((candidate) =>
      isUsefulCompanyWebsiteDescription(candidate, companyName, symbol)
    ) || ""
  );
}

function extractCompanyWebsiteLogoUrl(html, website) {
  const baseUrl = normalizeCompanyWebsite(website);
  if (!baseUrl) {
    return "";
  }

  const metaCandidates = [
    extractMetaTagContent(html, "property", "og:image"),
    extractMetaTagContent(html, "name", "og:image"),
    extractMetaTagContent(html, "name", "twitter:image"),
  ];

  for (const candidate of metaCandidates) {
    if (candidate) {
      return toAbsoluteUrl(candidate, baseUrl);
    }
  }

  const iconHref = extractLinkHrefByRel(html, [
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
    "shortcut icon",
    "icon",
    "mask-icon",
  ]);

  if (iconHref) {
    return toAbsoluteUrl(iconHref, baseUrl);
  }

  return buildCompanyWebsiteFaviconUrl(baseUrl);
}

async function resolveCompanyWebsiteBranding(symbol, options = {}) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const companyOverride = STOCK_COMPANY_OVERRIDES[upperSymbol] || null;
  const normalizedWebsite = normalizeCompanyWebsite(
    options.website || companyOverride?.website || ""
  );
  const fallbackLogoUrl =
    normalizeWhitespace(companyOverride?.logoUrl) ||
    buildCompanyWebsiteFaviconUrl(normalizedWebsite);
  const fallbackPayload = {
    companyName:
      normalizeWhitespace(companyOverride?.companyName) ||
      normalizeWhitespace(options.companyName) ||
      SYMBOL_NAME_MAP[upperSymbol] ||
      upperSymbol,
    website: normalizedWebsite,
    logoUrl: fallbackLogoUrl,
    description: "",
    source: fallbackLogoUrl ? "company-website-favicon" : "fallback",
  };

  if (!normalizedWebsite) {
    return fallbackPayload;
  }

  const cached = getCompanyWebsiteBrandingCacheEntry(normalizedWebsite);
  if (cached) {
    return {
      ...cached,
      companyName: cached.companyName || fallbackPayload.companyName,
      website: cached.website || normalizedWebsite,
      logoUrl: cached.logoUrl || fallbackLogoUrl,
    };
  }

  const cacheKey = getCompanyWebsiteBrandingCacheKey(normalizedWebsite);
  if (companyWebsiteBrandingPending.has(cacheKey)) {
    return companyWebsiteBrandingPending.get(cacheKey);
  }

  const pending = (async () => {
    try {
      const html = await fetchTextWithTimeout(
        normalizedWebsite,
        COMPANY_WEBSITE_TIMEOUT_MS
      );
      const payload = {
        companyName: fallbackPayload.companyName,
        website: normalizedWebsite,
        logoUrl:
          normalizeWhitespace(companyOverride?.logoUrl) ||
          extractCompanyWebsiteLogoUrl(html, normalizedWebsite) ||
          fallbackLogoUrl,
        description: extractCompanyWebsiteDescription(
          html,
          fallbackPayload.companyName,
          upperSymbol
        ),
        source: "company-website",
      };
      setCompanyWebsiteBrandingCacheEntry(normalizedWebsite, payload);
      return payload;
    } catch {
      setCompanyWebsiteBrandingCacheEntry(
        normalizedWebsite,
        fallbackPayload,
        60 * 60 * 1000
      );
      return fallbackPayload;
    }
  })();

  companyWebsiteBrandingPending.set(cacheKey, pending);

  try {
    return await pending;
  } finally {
    companyWebsiteBrandingPending.delete(cacheKey);
  }
}

function buildStockCompanyMetadata(stock, company = {}) {
  const upperSymbol = String(
    stock?.symbol || stock?.ticker || stock?.code || ""
  )
    .toUpperCase()
    .trim();
  const companyOverride = STOCK_COMPANY_OVERRIDES[upperSymbol] || null;
  const companyName =
    normalizeWhitespace(companyOverride?.companyName) ||
    normalizeWhitespace(company.name) ||
    normalizeWhitespace(stock?.companyName) ||
    normalizeWhitespace(stock?.name) ||
    SYMBOL_NAME_MAP[upperSymbol] ||
    upperSymbol;
  const website = normalizeCompanyWebsite(
    companyOverride?.website || company.website || stock?.website || ""
  );

  return {
    companyName,
    sector: normalizeWhitespace(
      companyOverride?.sector || company.sector || stock?.sector || ""
    ),
    industry: normalizeWhitespace(
      companyOverride?.industry || company.industry || stock?.industry || ""
    ),
    website,
    logoUrl:
      normalizeWhitespace(companyOverride?.logoUrl) ||
      buildCompanyWebsiteFaviconUrl(website),
  };
}

function enrichStockWithCachedCompanyMetadata(stock) {
  const upperSymbol = String(
    stock?.symbol || stock?.ticker || stock?.code || ""
  )
    .toUpperCase()
    .trim();

  if (!upperSymbol) {
    return stock;
  }

  const equityData =
    getKwayisiCachedValue(`/equities/${encodeURIComponent(upperSymbol)}`) ||
    getKwayisiCachedValue(`/equities/${encodeURIComponent(upperSymbol)}`, {
      allowExpired: true,
    }) ||
    null;
  const company = equityData?.company || {};
  const metadata = buildStockCompanyMetadata(stock, company);

  return {
    ...stock,
    name: metadata.companyName || stock.name,
    companyName: metadata.companyName || stock.companyName || stock.name,
    sector: metadata.sector || stock.sector || "",
    industry: metadata.industry || stock.industry || "",
    website: metadata.website || stock.website || "",
    logoUrl: metadata.logoUrl || stock.logoUrl || "",
  };
}

function toNullableNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deriveChangePercent(price, change) {
  const safePrice = Number(price);
  const safeChange = Number(change);

  if (!Number.isFinite(safePrice) || !Number.isFinite(safeChange)) {
    return 0;
  }

  if (Math.abs(safeChange) < 0.0000001) {
    return 0;
  }

  const previousClose = safePrice - safeChange;
  if (!Number.isFinite(previousClose) || Math.abs(previousClose) < 0.0000001) {
    return 0;
  }

  return (safeChange / previousClose) * 100;
}

function derivePreviousClose(price, change) {
  const safePrice = Number(price);
  const safeChange = Number(change);

  if (!Number.isFinite(safePrice)) {
    return null;
  }

  if (!Number.isFinite(safeChange)) {
    return safePrice > 0 ? safePrice : null;
  }

  const previousClose = safePrice - safeChange;
  if (Number.isFinite(previousClose) && previousClose > 0) {
    return previousClose;
  }

  return safePrice > 0 ? safePrice : null;
}

function deriveDividendYield(dps, previousClose, fallbackPrice) {
  const safeDps = Number(dps);
  if (!Number.isFinite(safeDps) || safeDps <= 0) {
    return null;
  }

  const baseCandidates = [previousClose, fallbackPrice];
  for (const candidate of baseCandidates) {
    const safeCandidate = Number(candidate);
    if (Number.isFinite(safeCandidate) && safeCandidate > 0) {
      return (safeDps / safeCandidate) * 100;
    }
  }

  return null;
}

function normalizeKwayisiResource(resource) {
  const normalized = String(resource || "").trim();
  if (!normalized) {
    return "/";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function getKwayisiResourceKey(resource) {
  return normalizeKwayisiResource(resource).toLowerCase();
}

function getKwayisiResourceCacheTtlMs(resource, explicitTtlMs) {
  if (Number.isFinite(explicitTtlMs) && explicitTtlMs > 0) {
    return explicitTtlMs;
  }

  const normalized = normalizeKwayisiResource(resource);
  if (normalized === "/live") {
    return LIVE_STOCKS_CACHE_TTL_MS;
  }

  if (/^\/live\/[a-z0-9._-]+$/i.test(normalized)) {
    return LIVE_STOCKS_CACHE_TTL_MS;
  }

  if (/^\/equities\/[a-z0-9._-]+$/i.test(normalized)) {
    return KWAYISI_PROFILE_CACHE_TTL_MS;
  }

  if (normalized === "/equities") {
    return 15 * 60 * 1000;
  }

  return 60 * 1000;
}

function setKwayisiCachedValue(resource, value, ttlMs) {
  const key = getKwayisiResourceKey(resource);
  const safeTtl = Math.max(1000, Number(ttlMs) || 60 * 1000);
  kwayisiResourceCache.set(key, {
    value,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + safeTtl,
  });
}

function getKwayisiCachedValue(resource, options = {}) {
  const { allowExpired = false } = options;
  const key = getKwayisiResourceKey(resource);
  const entry = kwayisiResourceCache.get(key);
  if (!entry) {
    return undefined;
  }

  if (allowExpired || entry.expiresAt > Date.now()) {
    return entry.value;
  }

  return undefined;
}

function setKwayisiErrorCooldown(resource, cooldownMs = KWAYISI_RESOURCE_ERROR_COOLDOWN_MS) {
  const key = getKwayisiResourceKey(resource);
  kwayisiResourceErrorUntil.set(key, Date.now() + Math.max(1000, cooldownMs));
}

function getKwayisiErrorCooldownUntil(resource) {
  return kwayisiResourceErrorUntil.get(getKwayisiResourceKey(resource)) || 0;
}

function getLocalStockFallback(symbol) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  if (!upperSymbol) {
    return null;
  }

  const latestHistoryRows = getLatestHistoryRowsBySymbolStmt.all(upperSymbol);
  const latestHistory = latestHistoryRows[0] || null;
  const previousHistory = latestHistoryRows[1] || null;

  const fallbackPrice = toFiniteNumber(latestHistory?.value, 0);
  const fallbackVolume = toFiniteNumber(latestHistory?.volume, 0);

  let fallbackChange = toFiniteNumber(latestHistory?.change, 0);
  let fallbackChangePercent = toFiniteNumber(latestHistory?.changePercent, 0);

  if (
    fallbackChange === 0 &&
    latestHistory &&
    previousHistory &&
    Number.isFinite(Number(latestHistory.value)) &&
    Number.isFinite(Number(previousHistory.value))
  ) {
    const latestValue = Number(latestHistory.value);
    const previousValue = Number(previousHistory.value);
    fallbackChange = latestValue - previousValue;

    if (previousValue !== 0) {
      fallbackChangePercent = (fallbackChange / previousValue) * 100;
    }
  }

  if (fallbackPrice <= 0 && !latestHistory) {
    return null;
  }

  return {
    symbol: upperSymbol,
    name: SYMBOL_NAME_MAP[upperSymbol] || upperSymbol,
    price: Math.max(0, fallbackPrice),
    change: fallbackChange,
    changePercent: fallbackChangePercent,
    volume: Math.max(0, fallbackVolume),
  };
}

function getFallbackStockSnapshotBySymbol(symbol) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  if (!upperSymbol) {
    return null;
  }

  return (
    getBestAvailableStocksFallback().find(
      (item) =>
        String(item?.symbol || item?.ticker || item?.code || "")
          .toUpperCase()
          .trim() === upperSymbol
    ) || null
  );
}

function appendLiveSnapshotToHistoryRows(symbol, rows) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const safeRows = Array.isArray(rows) ? rows.slice() : [];

  if (!upperSymbol) {
    return safeRows;
  }

  const cachedLive =
    getKwayisiCachedValue(`/live/${encodeURIComponent(upperSymbol)}`) ||
    getKwayisiCachedValue(`/live/${encodeURIComponent(upperSymbol)}`, {
      allowExpired: true,
    });
  const listLive = Array.isArray(liveStocksCache.items)
    ? liveStocksCache.items.find(
        (item) =>
          String(item.symbol || item.ticker || item.code || "")
            .toUpperCase()
            .trim() === upperSymbol
      )
    : null;
  const localFallback = getLocalStockFallback(upperSymbol);
  const livePrice = toFiniteNumber(
    cachedLive?.price,
    toFiniteNumber(listLive?.price, toFiniteNumber(localFallback?.price, 0))
  );

  if (!(livePrice > 0)) {
    return safeRows;
  }

  const liveChange = toFiniteNumber(
    cachedLive?.change,
    toFiniteNumber(listLive?.change, toFiniteNumber(localFallback?.change, 0))
  );
  const liveChangePercent = toFiniteNumber(
    cachedLive?.changePercent,
    toFiniteNumber(
      listLive?.changePercent,
      toFiniteNumber(
        localFallback?.changePercent,
        deriveChangePercent(livePrice, liveChange)
      )
    )
  );
  const liveVolume = toFiniteNumber(
    cachedLive?.volume,
    toFiniteNumber(listLive?.volume, toFiniteNumber(localFallback?.volume, 0))
  );
  const today = new Date().toISOString().slice(0, 10);
  const lastRow = safeRows[safeRows.length - 1];
  const liveRow = {
    date: today,
    value: livePrice,
    change: liveChange,
    changePercent: liveChangePercent,
    volume: liveVolume,
    source: "KwayisiLive",
  };

  if (!lastRow) {
    return [liveRow];
  }

  if (String(lastRow.date || "") === today) {
    safeRows[safeRows.length - 1] = {
      ...lastRow,
      ...liveRow,
    };
    return safeRows;
  }

  safeRows.push(liveRow);
  return safeRows;
}

function getLocalStocksFallback() {
  return KNOWN_SYMBOLS.map((symbol) => {
    const local = getLocalStockFallback(symbol);
    if (local) {
      return local;
    }

    return {
      symbol,
      name: SYMBOL_NAME_MAP[symbol] || symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
    };
  });
}

function getBundledLiveStocksFallback() {
  if (!Array.isArray(BUNDLED_LIVE_STOCKS_SNAPSHOT)) {
    return [];
  }

  return BUNDLED_LIVE_STOCKS_SNAPSHOT.map((item) =>
    enrichStockWithCachedCompanyMetadata(mapStock(item))
  );
}

function hasPositiveStockSnapshot(items) {
  return Array.isArray(items) && items.some((item) => Number(item?.price) > 0);
}

function getBestAvailableStocksFallback() {
  const bundledFallback = getBundledLiveStocksFallback();
  if (hasPositiveStockSnapshot(bundledFallback)) {
    return bundledFallback;
  }

  const localFallback = getLocalStocksFallback();
  if (hasPositiveStockSnapshot(localFallback)) {
    return localFallback;
  }

  return localFallback;
}

function getStockDetailCacheEntry(symbol) {
  const key = String(symbol || "").toUpperCase().trim();
  if (!key) {
    return null;
  }

  const entry = stockDetailCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

function getStockDetailStaleEntry(symbol) {
  const key = String(symbol || "").toUpperCase().trim();
  if (!key) {
    return null;
  }

  const entry = stockDetailCache.get(key);
  return entry ? entry.value : null;
}

function setStockDetailCacheEntry(symbol, value, ttlMs = STOCK_DETAIL_CACHE_TTL_MS) {
  const key = String(symbol || "").toUpperCase().trim();
  if (!key || !value) {
    return;
  }

  const safeTtl = Math.max(1000, Number(ttlMs) || STOCK_DETAIL_CACHE_TTL_MS);
  stockDetailCache.set(key, {
    value,
    expiresAt: Date.now() + safeTtl,
  });
}

function chunkValues(values, size) {
  const normalizedSize = Math.max(1, Number(size) || 1);
  const chunks = [];

  for (let index = 0; index < values.length; index += normalizedSize) {
    chunks.push(values.slice(index, index + normalizedSize));
  }

  return chunks;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJsonWithTimeout(url, options = {}) {
  const {
    timeoutMs = KWAYISI_DEFAULT_TIMEOUT_MS,
    headers = {},
    maxRedirects = 5,
  } = options;

  return new Promise((resolve, reject) => {
    let redirectCount = 0;

    function doRequest(targetUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(targetUrl);
      } catch (error) {
        reject(error);
        return;
      }

      const transport = parsedUrl.protocol === "https:" ? https : http;
      const request = transport.request(
        parsedUrl,
        {
          method: "GET",
          family: 4,
          headers: {
            Accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "identity",
            ...headers,
          },
        },
        (response) => {
          const statusCode = Number(response.statusCode) || 0;

          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            response.headers.location &&
            redirectCount < maxRedirects
          ) {
            redirectCount++;
            const redirectUrl = new URL(
              response.headers.location,
              targetUrl
            ).href;
            response.resume();
            doRequest(redirectUrl);
            return;
          }

          let body = "";

          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            resolve({
              statusCode,
              body,
            });
          });
        }
      );

      request.on("error", reject);
      request.setTimeout(Math.max(1000, Number(timeoutMs) || KWAYISI_DEFAULT_TIMEOUT_MS), () => {
        request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });
      request.end();
    }

    doRequest(url);
  });
}

function isAbortLikeErrorMessage(value) {
  const message = String(value || "").toLowerCase();
  return (
    message.includes("aborted") ||
    message.includes("aborterror") ||
    message.includes("timeout") ||
    message.includes("timed out")
  );
}

function buildCompanyDescription(symbol, company = {}) {
  const companyName = company.name || SYMBOL_NAME_MAP[symbol] || symbol;
  const sector = company.sector;
  const industry = company.industry;

  if (sector && industry) {
    return `${companyName} is listed on the Ghana Stock Exchange in the ${sector} sector and ${industry} industry.`;
  }

  if (sector) {
    return `${companyName} is listed on the Ghana Stock Exchange in the ${sector} sector.`;
  }

  if (industry) {
    return `${companyName} is listed on the Ghana Stock Exchange in the ${industry} industry.`;
  }

  return `${companyName} is listed on the Ghana Stock Exchange.`;
}

async function fetchKwayisiJson(resource, options = {}) {
  const {
    allowNotFound = false,
    cacheTtlMs,
    timeoutMs = KWAYISI_DEFAULT_TIMEOUT_MS,
    useStaleOnError = true,
    bypassCache = false,
  } = options;
  const normalizedResource = normalizeKwayisiResource(resource);
  const resourceKey = getKwayisiResourceKey(normalizedResource);
  const now = Date.now();
  const freshCachedValue = getKwayisiCachedValue(normalizedResource);
  const staleCachedValue = getKwayisiCachedValue(normalizedResource, {
    allowExpired: true,
  });

  if (!bypassCache && typeof freshCachedValue !== "undefined") {
    return freshCachedValue;
  }

  const globalRateLimitActive = kwayisiRateLimitState.until > now;
  if (globalRateLimitActive) {
    if (useStaleOnError && typeof staleCachedValue !== "undefined") {
      return staleCachedValue;
    }

    throw new Error(
      `Kwayisi upstream temporarily rate-limited until ${new Date(
        kwayisiRateLimitState.until
      ).toISOString()}`
    );
  }

  const resourceErrorUntil = getKwayisiErrorCooldownUntil(normalizedResource);
  if (!bypassCache && resourceErrorUntil > now) {
    if (useStaleOnError && typeof staleCachedValue !== "undefined") {
      return staleCachedValue;
    }

    throw new Error(
      `Kwayisi ${normalizedResource} cooldown active until ${new Date(
        resourceErrorUntil
      ).toISOString()}`
    );
  }

  if (!bypassCache && kwayisiResourcePending.has(resourceKey)) {
    return kwayisiResourcePending.get(resourceKey);
  }

  const requestPromise = (async () => {
    try {
      const response = await requestJsonWithTimeout(
        `${KWAYISI_API_BASE}${normalizedResource}`,
        {
          timeoutMs,
          headers: KWAYISI_REQUEST_HEADERS,
        }
      );

      if (allowNotFound && response.statusCode === 404) {
        setKwayisiCachedValue(
          normalizedResource,
          null,
          Math.min(
            KWAYISI_NOT_FOUND_CACHE_TTL_MS,
            getKwayisiResourceCacheTtlMs(normalizedResource, cacheTtlMs)
          )
        );
        kwayisiResourceErrorUntil.delete(resourceKey);
        return null;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        if (response.statusCode === 429) {
          kwayisiRateLimitState.until =
            Date.now() + KWAYISI_RATE_LIMIT_COOLDOWN_MS;
          kwayisiRateLimitState.reason = `${normalizedResource}:429`;
        }

        throw new Error(`Kwayisi ${normalizedResource} failed: ${response.statusCode}`);
      }

      let data;

      try {
        data = JSON.parse(response.body);
      } catch (parseError) {
        throw new Error(
          `Kwayisi ${normalizedResource} returned invalid JSON: ${
            parseError?.message || parseError
          }`
        );
      }

      setKwayisiCachedValue(
        normalizedResource,
        data,
        getKwayisiResourceCacheTtlMs(normalizedResource, cacheTtlMs)
      );
      kwayisiResourceErrorUntil.delete(resourceKey);
      return data;
    } catch (error) {
      setKwayisiErrorCooldown(normalizedResource);

      const message = String(error?.message || error || "");
      if (message.includes("429")) {
        kwayisiRateLimitState.until = Date.now() + KWAYISI_RATE_LIMIT_COOLDOWN_MS;
        kwayisiRateLimitState.reason = `${normalizedResource}:429`;
      }

      if (useStaleOnError && typeof staleCachedValue !== "undefined") {
        return staleCachedValue;
      }

      if (allowNotFound && message.includes("404")) {
        return null;
      }

      throw error;
    } finally {
      kwayisiResourcePending.delete(resourceKey);
    }
  })();

  kwayisiResourcePending.set(resourceKey, requestPromise);
  return requestPromise;
}

function requestTextWithTimeout(url, options = {}) {
  const {
    timeoutMs = KWAYISI_DEFAULT_TIMEOUT_MS,
    headers = {},
    maxRedirects = 5,
  } = options;

  return new Promise((resolve, reject) => {
    let redirectCount = 0;

    function doRequest(targetUrl) {
      let parsedUrl;

      try {
        parsedUrl = new URL(targetUrl);
      } catch (error) {
        reject(error);
        return;
      }

      const transport = parsedUrl.protocol === "https:" ? https : http;
      const request = transport.request(
        parsedUrl,
        {
          method: "GET",
          family: 4,
          headers: {
            Accept: "text/html,application/javascript,text/plain;q=0.9,*/*;q=0.8",
            "Accept-Encoding": "identity",
            ...headers,
          },
        },
        (response) => {
          const statusCode = Number(response.statusCode) || 0;

          if (
            statusCode >= 300 &&
            statusCode < 400 &&
            response.headers.location &&
            redirectCount < maxRedirects
          ) {
            redirectCount++;
            const redirectUrl = new URL(
              response.headers.location,
              targetUrl
            ).href;
            response.resume();
            doRequest(redirectUrl);
            return;
          }

          let body = "";

          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            resolve({
              statusCode,
              body,
            });
          });
        }
      );

      request.on("error", reject);
      request.setTimeout(Math.max(1000, Number(timeoutMs) || KWAYISI_DEFAULT_TIMEOUT_MS), () => {
        request.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });
      request.end();
    }

    doRequest(url);
  });
}

function insertHistory(row) {
  db.prepare(`
    INSERT OR REPLACE INTO stock_history
    (symbol, trade_date, close_price, change_value, change_percent, volume, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(row.symbol).toUpperCase(),
    row.trade_date,
    Number(row.close_price),
    Number(row.change_value ?? 0),
    Number(row.change_percent ?? 0),
    Number(row.volume ?? 0),
    row.source || "KwayisiChart"
  );
}

function filterRowsByRange(rows, range = "1W") {
  if (!rows.length) return rows;

  const now = new Date();
  let startDate = null;

  if (range === "1W") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (range === "1M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (range === "3M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 3);
  } else if (range === "6M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 6);
  } else if (range === "YTD") {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (range === "1Y") {
    startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (range === "5Y") {
    startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 5);
  }

  if (!startDate) return rows;

  const cutoff = startDate.toISOString().split("T")[0];
  const filteredRows = rows.filter((row) => row.date >= cutoff);

  const rangeTrailingPointCount = {
    "1W": 5,
    "1M": 22,
    "3M": 66,
    "6M": 132,
    "YTD": 260,
    "1Y": 260,
    "5Y": rows.length,
    "ALL": rows.length,
  };
  const trailingPointCount =
    rangeTrailingPointCount[String(range || "1W").toUpperCase()] || 5;

  // Ghana market data can lag a few calendar days, so keep 1W anchored to
  // roughly one trading week instead of collapsing to a single point.
  if (range === "1W" && filteredRows.length < 5 && rows.length >= 2) {
    return rows.slice(-Math.min(rows.length, 5));
  }

  if (filteredRows.length < 2 && rows.length >= 2) {
    return rows.slice(-Math.min(rows.length, trailingPointCount));
  }

  return filteredRows;
}

function normalizeGseIndexCode(value) {
  const normalized = String(value || "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z]/g, "");

  if (normalized === "GSECI" || normalized === "CI") {
    return "GSE-CI";
  }

  if (normalized === "GSEFSI" || normalized === "FSI") {
    return "GSE-FSI";
  }

  return String(value || "").toUpperCase().trim();
}

function deriveGseIndexYtd(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      change: 0,
      changePercent: 0,
    };
  }

  const latest = rows[rows.length - 1];
  const latestYear = String(latest.date || "").slice(0, 4);
  const yearStart = `${latestYear}-01-01`;
  const lastPreviousYearRow = [...rows]
    .reverse()
    .find((row) => String(row.date || "") < yearStart);
  const firstCurrentYearRow =
    rows.find((row) => String(row.date || "") >= yearStart) || rows[0];
  const baseline = lastPreviousYearRow || firstCurrentYearRow || latest;
  const change = Number(latest.value) - Number(baseline.value);
  const changePercent =
    Number(baseline.value) > 0 ? (change / Number(baseline.value)) * 100 : 0;

  return {
    change,
    changePercent,
  };
}

function buildGseIndexSummary(code, rows) {
  const cleanCode = normalizeGseIndexCode(code);
  const cleanRows = Array.isArray(rows) ? rows : [];
  const latest = cleanRows[cleanRows.length - 1] || null;
  const previous =
    cleanRows.length > 1 ? cleanRows[cleanRows.length - 2] : latest;
  const latestValue = Number(latest?.value ?? 0);
  const previousValue = Number(previous?.value ?? latestValue);
  const change = latestValue - previousValue;
  const changePercent =
    previousValue > 0 ? (change / previousValue) * 100 : 0;
  const ytd = deriveGseIndexYtd(cleanRows);

  return {
    code: cleanCode,
    name: GSE_INDEX_NAME_MAP[cleanCode] || cleanCode,
    value: latestValue,
    change,
    changePercent,
    ytdChange: ytd.change,
    ytdChangePercent: ytd.changePercent,
    lastDate: latest?.date || "",
  };
}

function derivePointChangeFromPercent(currentValue, percentChange) {
  const safeCurrentValue = Number(currentValue);
  const safePercentChange = Number(percentChange);

  if (
    !Number.isFinite(safeCurrentValue) ||
    safeCurrentValue <= 0 ||
    !Number.isFinite(safePercentChange)
  ) {
    return 0;
  }

  const baseline = safeCurrentValue / (1 + safePercentChange / 100);
  return safeCurrentValue - baseline;
}

function resolveDirectionalPercent(verb, rawPercent) {
  const safePercent = Math.abs(Number(rawPercent));
  if (!Number.isFinite(safePercent)) {
    return 0;
  }

  const negativeVerbs = ["decreased", "fell", "lost", "pared", "slipped", "dropped"];
  return negativeVerbs.includes(String(verb || "").toLowerCase())
    ? -safePercent
    : safePercent;
}

function parseGseIndexPageSummaries(pageText) {
  const html = String(pageText || "");
  const plainText = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x[0-9a-f]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const summarySectionIndex = plainText.indexOf(
    "Regarding the performance of GSE market indices"
  );
  const summarySection =
    summarySectionIndex >= 0
      ? plainText.slice(summarySectionIndex, summarySectionIndex + 1200)
      : plainText;
  const lastDateMatch = html.match(/<time[^>]*id=u[^>]*datetime=([0-9]{4}-[0-9]{2}-[0-9]{2})T/i);
  const lastDate = String(lastDateMatch?.[1] || "");

  const ciMatch = summarySection.match(
    /GSE Composite Index \(GSE-CI\)\s+(moved up|pared|rose|fell|increased|decreased|gained|lost)\s+([0-9.,]+)\s+\(([-+0-9.]+)%\)\s+points?\s+to\s+(?:close at|reach|settle at)\s+([0-9.,]+).*?year-to-date\s+(gain|loss)\s+of\s+([0-9.]+)%/i
  );
  const fsiMatch = summarySection.match(
    /GSE Financial Stocks Index \(GSE-FSI\)(?:,\s*on the other hand,)?\s+(?:also\s+)?(increased|decreased|rose|fell|gained|lost|moved up|pared|slipped|dropped)\s+(?:by\s+)?([0-9.]+)%\s+to\s+(?:reach\s+|close at\s+|settle at\s+)?([0-9.,]+)\s+points?.*?year-to-date\s+(gain|loss)\s+of\s+([0-9.]+)%/i
  );

  const summaries = {};

  if (ciMatch) {
    const value = Number(String(ciMatch[4] || "").replace(/,/g, ""));
    const change = Number(String(ciMatch[2] || "").replace(/,/g, ""));
    const dailyPercent = Number(ciMatch[3]);
    const ytdPercent = Number(ciMatch[6]) * (String(ciMatch[5]).toLowerCase() === "loss" ? -1 : 1);

    summaries["GSE-CI"] = {
      code: "GSE-CI",
      name: GSE_INDEX_NAME_MAP["GSE-CI"],
      value,
      change: String(ciMatch[1]).toLowerCase() === "pared" || String(ciMatch[1]).toLowerCase() === "fell" || String(ciMatch[1]).toLowerCase() === "decreased" || String(ciMatch[1]).toLowerCase() === "lost"
        ? -Math.abs(change)
        : change,
      changePercent: dailyPercent,
      ytdChange: derivePointChangeFromPercent(value, ytdPercent),
      ytdChangePercent: ytdPercent,
      lastDate,
    };
  }

  if (fsiMatch) {
    const value = Number(String(fsiMatch[3] || "").replace(/,/g, ""));
    const changePercent = resolveDirectionalPercent(fsiMatch[1], fsiMatch[2]);
    const ytdPercent = Number(fsiMatch[5]) * (String(fsiMatch[4]).toLowerCase() === "loss" ? -1 : 1);

    summaries["GSE-FSI"] = {
      code: "GSE-FSI",
      name: GSE_INDEX_NAME_MAP["GSE-FSI"],
      value,
      change: derivePointChangeFromPercent(value, changePercent),
      changePercent,
      ytdChange: derivePointChangeFromPercent(value, ytdPercent),
      ytdChangePercent: ytdPercent,
      lastDate,
    };
  }

  return summaries;
}

function buildSyntheticIndexHistoryRows(summary) {
  const latestValue = Number(summary?.value);
  if (!(latestValue > 0)) {
    return [];
  }

  const latestDateRaw = String(summary?.lastDate || "").trim();
  const latestDate =
    /^\d{4}-\d{2}-\d{2}$/.test(latestDateRaw)
      ? latestDateRaw
      : new Date().toISOString().slice(0, 10);
  const previousValueCandidate = latestValue - Number(summary?.change ?? 0);
  const previousValue =
    Number.isFinite(previousValueCandidate) && previousValueCandidate > 0
      ? previousValueCandidate
      : latestValue;
  const previousDate = new Date(`${latestDate}T00:00:00Z`);

  if (Number.isNaN(previousDate.getTime())) {
    previousDate.setTime(Date.now());
  }

  previousDate.setUTCDate(previousDate.getUTCDate() - 1);

  return [
    {
      date: previousDate.toISOString().slice(0, 10),
      value: previousValue,
      change: 0,
      changePercent: 0,
      volume: 0,
      source: "Fallback",
    },
    {
      date: latestDate,
      value: latestValue,
      change: Number(summary?.change ?? 0),
      changePercent: Number(summary?.changePercent ?? 0),
      volume: 0,
      source: "Fallback",
    },
  ];
}

function getBundledGseIndicesFallback() {
  const rawSummaries = Array.isArray(BUNDLED_GSE_INDICES_SNAPSHOT?.summaries)
    ? BUNDLED_GSE_INDICES_SNAPSHOT.summaries
    : [];

  if (rawSummaries.length === 0) {
    return null;
  }

  const summaries = rawSummaries
    .map((summary) => ({
      code: normalizeGseIndexCode(summary?.code),
      name: String(summary?.name || ""),
      value: Number(summary?.value ?? 0),
      change: Number(summary?.change ?? 0),
      changePercent: Number(summary?.changePercent ?? 0),
      ytdChange: Number(summary?.ytdChange ?? 0),
      ytdChangePercent: Number(summary?.ytdChangePercent ?? 0),
      lastDate: String(summary?.lastDate || ""),
    }))
    .filter((summary) => summary.code && Number.isFinite(summary.value) && summary.value > 0);

  if (summaries.length === 0) {
    return null;
  }

  const historyByCode = {};

  for (const summary of summaries) {
    const rawRows = Array.isArray(BUNDLED_GSE_INDICES_SNAPSHOT?.historyByCode?.[summary.code])
      ? BUNDLED_GSE_INDICES_SNAPSHOT.historyByCode[summary.code]
      : [];
    const normalizedRows = rawRows
      .map((row) => ({
        date: String(row?.date || ""),
        value: Number(row?.value ?? 0),
        change: Number(row?.change ?? 0),
        changePercent: Number(row?.changePercent ?? 0),
        volume: Number(row?.volume ?? 0),
        source: String(row?.source || "KwayisiChart"),
      }))
      .filter((row) => row.date && Number.isFinite(row.value) && row.value > 0);

    historyByCode[summary.code] =
      normalizedRows.length > 0
        ? normalizedRows
        : buildSyntheticIndexHistoryRows(summary);
  }

  return {
    summaries,
    historyByCode,
  };
}

function getRangeCutoffKey(range = "1W") {
  const now = new Date();
  let startDate = null;

  if (range === "1W") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (range === "1M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (range === "3M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 3);
  } else if (range === "6M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 6);
  } else if (range === "YTD") {
    startDate = new Date(now.getFullYear(), 0, 1);
  } else if (range === "1Y") {
    startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 1);
  } else if (range === "5Y") {
    startDate = new Date(now);
    startDate.setFullYear(startDate.getFullYear() - 5);
  }

  if (!startDate) {
    return "";
  }

  return startDate.toISOString().split("T")[0];
}

function shouldBackfillHistoryCoverage(symbol, range, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return true;
  }

  if (range === "ALL") {
    const firstDate = String(rows[0]?.date || "");
    const lastDate = String(rows[rows.length - 1]?.date || "");
    if (firstDate) {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(oneYearAgo.getDate() - 370);
      const oneYearCutoff = oneYearAgo.toISOString().split("T")[0];

      // If "ALL" still starts around last year, force another full scrape attempt.
      if (firstDate > oneYearCutoff) {
        return true;
      }
    }

    if (lastDate) {
      const staleCutoffDate = new Date();
      staleCutoffDate.setDate(staleCutoffDate.getDate() - RECENT_HISTORY_STALE_DAYS);
      const staleCutoff = staleCutoffDate.toISOString().split("T")[0];

      if (lastDate >= staleCutoff) {
        return false;
      }
    }

    const syncKey = `${String(symbol || "").toUpperCase().trim()}::${range}`;
    const lastSyncedAt = historyCoverageSyncAt.get(syncKey) || 0;
    return Date.now() - lastSyncedAt > HISTORY_COVERAGE_SYNC_TTL_MS;
  }

  if (!["1W", "1M", "3M", "6M", "YTD", "1Y", "5Y"].includes(range)) {
    return false;
  }

  const cutoff = getRangeCutoffKey(range);
  if (!cutoff) {
    return false;
  }

  const firstDate = String(rows[0]?.date || "");
  const lastDate = String(rows[rows.length - 1]?.date || "");
  if (!firstDate) {
    return true;
  }

  if (range !== "ALL") {
    const staleCutoffDate = new Date();
    staleCutoffDate.setDate(staleCutoffDate.getDate() - RECENT_HISTORY_STALE_DAYS);
    const staleCutoff = staleCutoffDate.toISOString().split("T")[0];

    if (!lastDate || lastDate < staleCutoff) {
      const syncKey = `${String(symbol || "").toUpperCase().trim()}::${range}`;
      const lastSyncedAt = historyCoverageSyncAt.get(syncKey) || 0;
      return Date.now() - lastSyncedAt > HISTORY_COVERAGE_SYNC_TTL_MS;
    }
  }

  if (firstDate <= cutoff) {
    return false;
  }

  const cutoffDate = new Date(`${cutoff}T00:00:00Z`);
  const firstCoverageDate = new Date(`${firstDate}T00:00:00Z`);
  const graceDays =
    range === "1W" ? 3 : range === "YTD" ? 7 : 7;

  if (
    !Number.isNaN(cutoffDate.getTime()) &&
    !Number.isNaN(firstCoverageDate.getTime())
  ) {
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() + graceDays);

    if (firstCoverageDate <= cutoffDate) {
      return false;
    }
  }

  const syncKey = `${String(symbol || "").toUpperCase().trim()}::${range}`;
  const lastSyncedAt = historyCoverageSyncAt.get(syncKey) || 0;
  return Date.now() - lastSyncedAt > HISTORY_COVERAGE_SYNC_TTL_MS;
}

function markHistoryCoverageSync(symbol, range) {
  const syncKey = `${String(symbol || "").toUpperCase().trim()}::${range}`;
  historyCoverageSyncAt.set(syncKey, Date.now());
}

function getRealHistory(symbol, range = "1W") {
  const rows = db.prepare(`
    SELECT
      trade_date as date,
      close_price as value,
      change_value as change,
      change_percent as changePercent,
      volume,
      source
    FROM stock_history
    WHERE symbol = ?
      AND source = 'KwayisiChart'
      AND close_price > 0
    ORDER BY trade_date ASC
  `).all(String(symbol).toUpperCase());

  return filterRowsByRange(appendLiveSnapshotToHistoryRows(symbol, rows), range);
}

function buildFallbackHistoryRows(symbol, range = "1W") {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  if (!upperSymbol) {
    return [];
  }

  const cachedLive =
    getKwayisiCachedValue(`/live/${encodeURIComponent(upperSymbol)}`) ||
    getKwayisiCachedValue(`/live/${encodeURIComponent(upperSymbol)}`, {
      allowExpired: true,
    });
  const listLive = Array.isArray(liveStocksCache.items)
    ? liveStocksCache.items.find(
        (item) =>
          String(item.symbol || item.ticker || item.code || "")
            .toUpperCase()
            .trim() === upperSymbol
      )
    : null;
  const snapshotFallback = getFallbackStockSnapshotBySymbol(upperSymbol);
  const localFallback = getLocalStockFallback(upperSymbol);
  const price = toFiniteNumber(
    cachedLive?.price,
    toFiniteNumber(
      listLive?.price,
      toFiniteNumber(snapshotFallback?.price, toFiniteNumber(localFallback?.price, 0))
    )
  );
  const change = toFiniteNumber(
    cachedLive?.change,
    toFiniteNumber(
      listLive?.change,
      toFiniteNumber(snapshotFallback?.change, toFiniteNumber(localFallback?.change, 0))
    )
  );
  const volume = toFiniteNumber(
    cachedLive?.volume,
    toFiniteNumber(
      listLive?.volume,
      toFiniteNumber(snapshotFallback?.volume, toFiniteNumber(localFallback?.volume, 0))
    )
  );

  if (!(price > 0)) {
    return [];
  }

  const previousClose = derivePreviousClose(price, change) || price;
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (String(range || "1W").toUpperCase()) {
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
      value: previousClose,
      change: 0,
      changePercent: 0,
      volume,
      source: "Fallback",
    },
    {
      date: endDate.toISOString().slice(0, 10),
      value: price,
      change,
      changePercent: deriveChangePercent(price, change),
      volume,
      source: "Fallback",
    },
  ];
}

async function scrapeKwayisiChartData(symbol, range = "ALL") {
  const normalizedSymbol = String(symbol || "").toUpperCase().trim();
  const url = `${KWAYISI_CHART_API_BASE}/${encodeURIComponent(
    normalizedSymbol.toLowerCase()
  )}`;
  const response = await requestTextWithTimeout(url, {
    timeoutMs: Math.max(KWAYISI_CHART_TIMEOUT_MS, KWAYISI_RETRY_TIMEOUT_MS),
    headers: KWAYISI_REQUEST_HEADERS,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Kwayisi chart ${normalizedSymbol} failed: ${response.statusCode}`);
  }

  const scriptText = String(response.body || "");

  const pointPattern =
    /\[d\("(\d{4}-\d{2}-\d{2})"\),\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\]/g;
  const rows = [];
  const seenDates = new Set();
  let match;

  while ((match = pointPattern.exec(scriptText)) !== null) {
    const date = String(match[1] || "");
    const value = Number(match[2]);

    if (!date || !Number.isFinite(value) || seenDates.has(date)) {
      continue;
    }

    seenDates.add(date);
    rows.push({
      date,
      value,
      change: 0,
      changePercent: 0,
      volume: 0,
      source: "KwayisiChart",
    });
  }

  rows.sort((left, right) => left.date.localeCompare(right.date));

  if (rows.length === 0) {
    throw new Error(`Kwayisi chart ${normalizedSymbol} returned no rows`);
  }

  console.log(`${normalizedSymbol}: extracted ${rows.length} chart points`);
  return filterRowsByRange(rows, range);
}

function parseGseIndexChartSeries(scriptText) {
  const seriesPattern =
    /\{name:'(GSE-(?:CI|FSI))',tooltip:\{[^}]*\},data:\[(.*?)\]\}/gs;
  const pointPattern =
    /\[d\("(\d{4}-\d{2}-\d{2})"\),\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\]/g;
  const historyByCode = {};
  let seriesMatch;

  while ((seriesMatch = seriesPattern.exec(String(scriptText || ""))) !== null) {
    const code = normalizeGseIndexCode(seriesMatch[1]);
    const dataBlock = String(seriesMatch[2] || "");
    const rows = [];
    const seenDates = new Set();
    let pointMatch;

    pointPattern.lastIndex = 0;

    while ((pointMatch = pointPattern.exec(dataBlock)) !== null) {
      const date = String(pointMatch[1] || "");
      const value = Number(pointMatch[2]);

      if (!date || !Number.isFinite(value) || seenDates.has(date)) {
        continue;
      }

      seenDates.add(date);
      rows.push({
        date,
        value,
        change: 0,
        changePercent: 0,
        volume: 0,
        source: "KwayisiChart",
      });
    }

    rows.sort((left, right) => left.date.localeCompare(right.date));

    if (rows.length > 0) {
      historyByCode[code] = rows;
    }
  }

  return historyByCode;
}

async function refreshGseIndicesCache() {
  if (gseIndexCache.pending) {
    return gseIndexCache.pending;
  }

  gseIndexCache.pending = (async () => {
    const chartFetchPromise = (async () => {
      const response = await requestTextWithTimeout(KWAYISI_CHART_API_BASE, {
        timeoutMs: Math.max(KWAYISI_CHART_TIMEOUT_MS, KWAYISI_RETRY_TIMEOUT_MS),
        headers: KWAYISI_REQUEST_HEADERS,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Kwayisi indices failed: ${response.statusCode}`);
      }

      return {
        scriptText: String(response.body || ""),
      };
    })();

    const pageFetchPromise = (async () => {
      try {
        const response = await requestTextWithTimeout(KWAYISI_GSE_PAGE_URL, {
          timeoutMs: Math.max(KWAYISI_DEFAULT_TIMEOUT_MS, KWAYISI_RETRY_TIMEOUT_MS),
          headers: KWAYISI_REQUEST_HEADERS,
        });

        if (response.statusCode < 200 || response.statusCode >= 300) {
          throw new Error(`Kwayisi GSE page failed: ${response.statusCode}`);
        }

        return {
          pageText: String(response.body || ""),
        };
      } catch (error) {
        console.error("Kwayisi GSE page fallback failed:", error?.message || error);
      }

      return {
        pageText: "",
      };
    })();

    const [
      { scriptText },
      { pageText },
    ] = await Promise.all([chartFetchPromise, pageFetchPromise]);

    if (!scriptText) {
      if (gseIndexCache.summaries.length > 0) {
        return {
          summaries: gseIndexCache.summaries,
          historyByCode: gseIndexCache.historyByCode,
        };
      }

      throw new Error(
        "Kwayisi indices fetch failed: empty chart response"
      );
    }

    const historyByCode = parseGseIndexChartSeries(scriptText);
    const pageSummaries = parseGseIndexPageSummaries(pageText);
    const summaries = GSE_INDEX_CODES.map((code) => {
      const historySummary =
        Array.isArray(historyByCode[code]) && historyByCode[code].length > 0
          ? buildGseIndexSummary(code, historyByCode[code])
          : null;
      const pageSummary = pageSummaries[code] || null;

      return {
        code,
        name: GSE_INDEX_NAME_MAP[code] || code,
        value: pageSummary?.value ?? historySummary?.value ?? 0,
        change: pageSummary?.change ?? historySummary?.change ?? 0,
        changePercent:
          pageSummary?.changePercent ?? historySummary?.changePercent ?? 0,
        ytdChange: pageSummary?.ytdChange ?? historySummary?.ytdChange ?? 0,
        ytdChangePercent:
          pageSummary?.ytdChangePercent ??
          historySummary?.ytdChangePercent ??
          0,
        lastDate:
          pageSummary?.lastDate || historySummary?.lastDate || "",
      };
    }).filter((item) => Number.isFinite(item.value) && item.value > 0);

    if (summaries.length === 0) {
      if (gseIndexCache.summaries.length > 0) {
        return {
          summaries: gseIndexCache.summaries,
          historyByCode: gseIndexCache.historyByCode,
        };
      }

      throw new Error("Kwayisi indices returned no usable rows");
    }

    gseIndexCache.summaries = summaries;
    gseIndexCache.historyByCode = historyByCode;
    gseIndexCache.fetchedAt = Date.now();

    return {
      summaries,
      historyByCode,
    };
  })();

  try {
    return await gseIndexCache.pending;
  } finally {
    gseIndexCache.pending = null;
  }
}

async function getGseIndicesData(options = {}) {
  const { allowStale = true } = options;
  const now = Date.now();
  const hasCachedSummaries =
    Array.isArray(gseIndexCache.summaries) && gseIndexCache.summaries.length > 0;

  if (
    hasCachedSummaries &&
    now - gseIndexCache.fetchedAt < GSE_INDEX_CACHE_TTL_MS
  ) {
    return {
      summaries: gseIndexCache.summaries,
      historyByCode: gseIndexCache.historyByCode,
    };
  }

  if (gseIndexCache.pending) {
    return hasCachedSummaries && allowStale
      ? {
          summaries: gseIndexCache.summaries,
          historyByCode: gseIndexCache.historyByCode,
        }
      : gseIndexCache.pending;
  }

  if (hasCachedSummaries && allowStale) {
    void refreshGseIndicesCache();
    return {
      summaries: gseIndexCache.summaries,
      historyByCode: gseIndexCache.historyByCode,
    };
  }

  return refreshGseIndicesCache();
}

function getHistoryScrapeCacheKey(symbol, range) {
  return `${String(symbol || "").toUpperCase().trim()}::${String(
    range || ""
  ).toUpperCase()}`;
}

function parseRequestedSymbolsQuery(value) {
  const rawSymbols = Array.isArray(value) ? value : [value];
  const uniqueSymbols = [];
  const seenSymbols = new Set();

  for (const rawValue of rawSymbols) {
    const parts = String(rawValue || "")
      .split(",")
      .map((part) => String(part || "").toUpperCase().trim())
      .filter(Boolean);

    for (const symbol of parts) {
      if (!/^[A-Z0-9._-]+$/.test(symbol) || seenSymbols.has(symbol)) {
        continue;
      }

      seenSymbols.add(symbol);
      uniqueSymbols.push(symbol);
    }
  }

  return uniqueSymbols;
}

function getCachedHistoryScrapeRows(symbol, range, options = {}) {
  const { allowExpired = false } = options;
  const key = getHistoryScrapeCacheKey(symbol, range);
  const entry = historyScrapeCache.get(key);
  if (!entry) {
    return null;
  }

  if (allowExpired || entry.expiresAt > Date.now()) {
    return entry.rows;
  }

  return null;
}

function setCachedHistoryScrapeRows(symbol, range, rows, ttlMs = HISTORY_SCRAPE_CACHE_TTL_MS) {
  const key = getHistoryScrapeCacheKey(symbol, range);
  const safeRows = Array.isArray(rows) ? rows : [];
  historyScrapeCache.set(key, {
    rows: safeRows,
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || HISTORY_SCRAPE_CACHE_TTL_MS),
  });
}

async function fetchHistoryRowsWithCache(symbol, range, options = {}) {
  const { bypassFreshCache = false, bypassErrorCooldown = false } = options;
  const key = getHistoryScrapeCacheKey(symbol, range);
  const now = Date.now();
  if (!bypassFreshCache) {
    const freshRows = getCachedHistoryScrapeRows(symbol, range);
    if (Array.isArray(freshRows)) {
      return freshRows;
    }
  }

  const staleRows = getCachedHistoryScrapeRows(symbol, range, {
    allowExpired: true,
  });
  const cooldownUntil = historyScrapeErrorUntil.get(key) || 0;

  if (!bypassErrorCooldown && cooldownUntil > now) {
    if (Array.isArray(staleRows) && staleRows.length > 0) {
      return staleRows;
    }

    return [];
  }

  if (historyScrapePending.has(key)) {
    return historyScrapePending.get(key);
  }

  const scrapePromise = (async () => {
    try {
      const rows = await scrapeKwayisiChartData(symbol, range);
      if (Array.isArray(rows) && rows.length > 0) {
        setCachedHistoryScrapeRows(symbol, range, rows);
      }
      historyScrapeErrorUntil.delete(key);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      historyScrapeErrorUntil.set(
        key,
        Date.now() + HISTORY_SCRAPE_ERROR_COOLDOWN_MS
      );
      console.error("History scrape fallback triggered:", error?.message || error);

      if (Array.isArray(staleRows) && staleRows.length > 0) {
        return staleRows;
      }

      return [];
    } finally {
      historyScrapePending.delete(key);
    }
  })();

  historyScrapePending.set(key, scrapePromise);
  return scrapePromise;
}

function buildStockDetailPayload(symbol, liveData, equityData) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  const company = equityData?.company || {};
  const companyMetadata = buildStockCompanyMetadata(
    {
      ...liveData,
      ...equityData,
      symbol: upperSymbol,
    },
    company
  );
  const mappedStock = mapStock({
    ...equityData,
    ...liveData,
    symbol: upperSymbol,
    company: company.name || undefined,
  });
  const previousClose = derivePreviousClose(mappedStock.price, mappedStock.change);
  const dps = toNullableNumber(equityData?.dps);
  const capital = toNullableNumber(equityData?.capital);

  return {
    ...mappedStock,
    companyName: companyMetadata.companyName,
    sector: companyMetadata.sector,
    industry: companyMetadata.industry,
    website: companyMetadata.website,
    logoUrl: companyMetadata.logoUrl,
    capital,
    dps,
    eps: toNullableNumber(equityData?.eps),
    shares: toNullableNumber(equityData?.shares),
    previousClose,
    dividendYield: deriveDividendYield(dps, previousClose, mappedStock.price),
    description: buildCompanyDescription(upperSymbol, company),
    company: {
      name: company.name || SYMBOL_NAME_MAP[upperSymbol] || upperSymbol,
      address: company.address || "",
      directors: Array.isArray(company.directors) ? company.directors : [],
      email: company.email || "",
      facsimile: company.facsimile || "",
      industry: company.industry || "",
      sector: company.sector || "",
      telephone: company.telephone || "",
      website: companyMetadata.website,
      logoUrl: companyMetadata.logoUrl,
    },
  };
}

async function refreshLiveStocksCache() {
  if (liveStocksCache.pending) {
    return liveStocksCache.pending;
  }

  liveStocksCache.pending = (async () => {
    try {
      const data = await fetchKwayisiJson("/live", {
        cacheTtlMs: LIVE_STOCKS_CACHE_TTL_MS,
        useStaleOnError: true,
      });
      if (!Array.isArray(data)) {
        throw new Error("Live stocks response is not an array");
      }

      const mapped = data.map((item) => enrichStockWithCachedCompanyMetadata(mapStock(item)));
      liveStocksCache.items = mapped;
      liveStocksCache.fetchedAt = Date.now();
      liveStocksCache.rateLimitedUntil = 0;
      return mapped;
    } catch (error) {
      const message = String(error?.message || error || "");

      if (message.includes("429")) {
        liveStocksCache.rateLimitedUntil =
          Date.now() + LIVE_STOCKS_RATE_LIMIT_COOLDOWN_MS;
      }

      console.error("getLiveStocks fallback triggered:", message);

      const shouldRetryAbortedLiveFetch =
        liveStocksCache.items.length === 0 && isAbortLikeErrorMessage(message);

      if (shouldRetryAbortedLiveFetch) {
        try {
          await sleep(250);
          const retriedData = await fetchKwayisiJson("/live", {
            cacheTtlMs: LIVE_STOCKS_CACHE_TTL_MS,
            timeoutMs: KWAYISI_RETRY_TIMEOUT_MS,
            useStaleOnError: false,
            bypassCache: true,
          });

          if (Array.isArray(retriedData) && retriedData.length > 0) {
            const mappedRetry = retriedData.map((item) =>
              enrichStockWithCachedCompanyMetadata(mapStock(item))
            );
            liveStocksCache.items = mappedRetry;
            liveStocksCache.fetchedAt = Date.now();
            liveStocksCache.rateLimitedUntil = 0;
            return mappedRetry;
          }
        } catch (retryError) {
          console.error(
            "getLiveStocks retry failed:",
            retryError?.message || retryError
          );
        }
      }

      if (liveStocksCache.items.length > 0) {
        return liveStocksCache.items;
      }

      if (!message.includes("429")) {
        try {
          const equitiesSnapshot = await fetchKwayisiJson("/equities", {
            cacheTtlMs: 15 * 60 * 1000,
            useStaleOnError: true,
          });

          if (Array.isArray(equitiesSnapshot) && equitiesSnapshot.length > 0) {
            const mappedSnapshot = equitiesSnapshot.map((item) =>
              enrichStockWithCachedCompanyMetadata(
                mapStock({
                  ...item,
                  company: item?.company?.name || item?.company || item?.name,
                  sector: item?.company?.sector || "",
                  industry: item?.company?.industry || "",
                  website: item?.company?.website || "",
                })
              )
            );
            liveStocksCache.items = mappedSnapshot;
            liveStocksCache.fetchedAt = Date.now();
            return mappedSnapshot;
          }
        } catch (secondaryError) {
          console.error(
            "getLiveStocks secondary fallback failed:",
            secondaryError?.message || secondaryError
          );
        }
      }

      const fallbackSnapshot = getBestAvailableStocksFallback();
      liveStocksCache.items = fallbackSnapshot;
      liveStocksCache.fetchedAt = Date.now();
      return fallbackSnapshot;
    } finally {
      liveStocksCache.pending = null;
    }
  })();

  return liveStocksCache.pending;
}

async function getLiveStocks(options = {}) {
  const { allowStale = true } = options;
  const now = Date.now();
  const hasCachedItems = liveStocksCache.items.length > 0;

  if (
    hasCachedItems &&
    now - liveStocksCache.fetchedAt < LIVE_STOCKS_CACHE_TTL_MS
  ) {
    return liveStocksCache.items;
  }

  if (
    liveStocksCache.rateLimitedUntil > now &&
    hasCachedItems
  ) {
    return liveStocksCache.items;
  }

  if (liveStocksCache.pending) {
    return hasCachedItems && allowStale
      ? liveStocksCache.items
      : liveStocksCache.pending;
  }

  if (hasCachedItems && allowStale) {
    void refreshLiveStocksCache();
    return liveStocksCache.items;
  }

  if (allowStale) {
    const fallbackSnapshot = getBestAvailableStocksFallback();
    const hasFallbackSnapshot = hasPositiveStockSnapshot(fallbackSnapshot);

    if (hasFallbackSnapshot) {
      liveStocksCache.items = fallbackSnapshot;
      liveStocksCache.fetchedAt = Date.now();
      void refreshLiveStocksCache();
      return fallbackSnapshot;
    }
  }

  return refreshLiveStocksCache();
}

function buildFastStockDetailPayload(upperSymbol) {
  let liveData =
    getKwayisiCachedValue(`/live/${encodeURIComponent(upperSymbol)}`) ||
    getKwayisiCachedValue(`/live/${encodeURIComponent(upperSymbol)}`, {
      allowExpired: true,
    }) ||
    null;
  let equityData =
    getKwayisiCachedValue(`/equities/${encodeURIComponent(upperSymbol)}`) ||
    getKwayisiCachedValue(`/equities/${encodeURIComponent(upperSymbol)}`, {
      allowExpired: true,
    }) ||
    null;

  if (!liveData && Array.isArray(liveStocksCache.items) && liveStocksCache.items.length > 0) {
    const stockFromList = liveStocksCache.items.find(
      (item) =>
        String(item.symbol || item.ticker || item.code || "")
          .toUpperCase()
          .trim() === upperSymbol
    );

    if (stockFromList) {
      liveData = {
        name: upperSymbol,
        price: stockFromList.price,
        change: stockFromList.change,
        changePercent: stockFromList.changePercent,
        volume: stockFromList.volume,
      };
    }
  }

  if (!liveData) {
    const localFallback = getLocalStockFallback(upperSymbol);
    if (localFallback) {
      liveData = {
        name: upperSymbol,
        price: localFallback.price,
        change: localFallback.change,
        changePercent: localFallback.changePercent,
        volume: localFallback.volume,
      };
    }
  }

  if (!liveData && !equityData) {
    return null;
  }

  return buildStockDetailPayload(upperSymbol, liveData, equityData);
}

function refreshStockDetailInBackground(upperSymbol) {
  if (stockDetailPending.has(upperSymbol)) {
    return stockDetailPending.get(upperSymbol);
  }

  const pendingPromise = (async () => {
    try {
      const [liveResult, equityResult] = await Promise.allSettled([
        fetchKwayisiJson(`/live/${encodeURIComponent(upperSymbol)}`, {
          allowNotFound: true,
          cacheTtlMs: LIVE_STOCKS_CACHE_TTL_MS,
          useStaleOnError: true,
        }),
        fetchKwayisiJson(`/equities/${encodeURIComponent(upperSymbol)}`, {
          allowNotFound: true,
          cacheTtlMs: KWAYISI_PROFILE_CACHE_TTL_MS,
          useStaleOnError: true,
        }),
      ]);

      let liveData =
        liveResult.status === "fulfilled" ? liveResult.value : null;
      let equityData =
        equityResult.status === "fulfilled" ? equityResult.value : null;

      if (!liveData || !equityData) {
        const fastPayload = buildFastStockDetailPayload(upperSymbol);
        if (fastPayload) {
          if (!liveData) {
            liveData = {
              name: upperSymbol,
              price: fastPayload.price,
              change: fastPayload.change,
              changePercent: fastPayload.changePercent,
              volume: fastPayload.volume,
            };
          }

          if (!equityData && fastPayload.company) {
            equityData = {
              capital: fastPayload.capital,
              dps: fastPayload.dps,
              eps: fastPayload.eps,
              shares: fastPayload.shares,
              company: {
                name: fastPayload.company.name,
                sector: fastPayload.company.sector,
                industry: fastPayload.company.industry,
                address: fastPayload.company.address,
                directors: fastPayload.company.directors,
                email: fastPayload.company.email,
                facsimile: fastPayload.company.facsimile,
                telephone: fastPayload.company.telephone,
                website: fastPayload.company.website,
              },
            };
          }
        }
      }

      if (!liveData && !equityData) {
        const liveError =
          liveResult.status === "rejected" ? liveResult.reason?.message : "";
        const equityError =
          equityResult.status === "rejected" ? equityResult.reason?.message : "";
        const errorMessage = [liveError, equityError].filter(Boolean).join(" | ");
        throw new Error(errorMessage || `No stock data found for ${upperSymbol}`);
      }

      const payload = buildStockDetailPayload(upperSymbol, liveData, equityData);
      setStockDetailCacheEntry(upperSymbol, payload);
      return payload;
    } finally {
      stockDetailPending.delete(upperSymbol);
    }
  })();

  stockDetailPending.set(upperSymbol, pendingPromise);
  return pendingPromise;
}

async function getStockDetail(symbol) {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  if (!upperSymbol) {
    throw new Error("Stock symbol is required");
  }

  const cachedDetail = getStockDetailCacheEntry(upperSymbol);
  if (cachedDetail) {
    return cachedDetail;
  }

  const staleDetail = getStockDetailStaleEntry(upperSymbol);
  if (staleDetail) {
    void refreshStockDetailInBackground(upperSymbol).catch(() => {});
    return staleDetail;
  }

  const fastPayload = buildFastStockDetailPayload(upperSymbol);
  if (fastPayload) {
    setStockDetailCacheEntry(upperSymbol, fastPayload);
    void refreshStockDetailInBackground(upperSymbol).catch(() => {});
    return fastPayload;
  }

  return refreshStockDetailInBackground(upperSymbol);
}

function warmHeatmapMetadataInBackground(symbols) {
  const normalizedSymbols = symbols
    .map((symbol) => String(symbol || "").toUpperCase().trim())
    .filter(Boolean)
    .filter((symbol) => {
      if (heatmapMetadataWarmPending.has(symbol)) {
        return false;
      }

      heatmapMetadataWarmPending.add(symbol);
      return true;
    });

  if (normalizedSymbols.length === 0) {
    return;
  }

  void (async () => {
    try {
      for (const batch of chunkValues(normalizedSymbols, HEATMAP_EQUITY_BATCH_SIZE)) {
        await Promise.allSettled(
          batch.map(async (symbol) => {
            try {
              await fetchKwayisiJson(`/equities/${encodeURIComponent(symbol)}`, {
                allowNotFound: true,
                cacheTtlMs: KWAYISI_PROFILE_CACHE_TTL_MS,
                useStaleOnError: true,
              });
            } finally {
              heatmapMetadataWarmPending.delete(symbol);
            }
          })
        );
      }
    } catch (error) {
      console.error("Heatmap metadata warmup failed:", error?.message || error);

      for (const symbol of normalizedSymbols) {
        heatmapMetadataWarmPending.delete(symbol);
      }
    }
  })();
}

async function getMarketHeatmapStocks() {
  const liveStocks = await getLiveStocks();
  const heatmapItems = [];
  const missingMetadataSymbols = [];

  for (const liveStock of liveStocks) {
    const symbol = String(liveStock.symbol || liveStock.ticker || liveStock.code || "")
      .toUpperCase()
      .trim();

    if (!symbol) {
      continue;
    }

    const resource = `/equities/${encodeURIComponent(symbol)}`;
    const equityData =
      getKwayisiCachedValue(resource) ||
      getKwayisiCachedValue(resource, {
        allowExpired: true,
      }) ||
      null;
    const company = equityData?.company || {};

    if (!equityData) {
      missingMetadataSymbols.push(symbol);
    }

    heatmapItems.push({
      symbol,
      name:
        SYMBOL_NAME_MAP[symbol] ||
        company.name ||
        liveStock?.name ||
        symbol,
      companyName:
        company.name ||
        SYMBOL_NAME_MAP[symbol] ||
        liveStock?.name ||
        symbol,
      sector: company.sector || "",
      capital: toNullableNumber(equityData?.capital),
      price: toFiniteNumber(
        liveStock?.price,
        toFiniteNumber(equityData?.price, 0)
      ),
      change: toFiniteNumber(liveStock?.change, 0),
      changePercent: toFiniteNumber(
        liveStock?.changePercent,
        deriveChangePercent(
          toFiniteNumber(liveStock?.price, toFiniteNumber(equityData?.price, 0)),
          toFiniteNumber(liveStock?.change, 0)
        )
      ),
      volume: toFiniteNumber(liveStock?.volume, 0),
    });
  }

  warmHeatmapMetadataInBackground(missingMetadataSymbols);
  heatmapItems.sort((left, right) => left.symbol.localeCompare(right.symbol));
  return heatmapItems;
}

function warmEquityProfilesInBackground(symbols = KNOWN_SYMBOLS) {
  const normalizedSymbols = symbols
    .map((symbol) => String(symbol || "").toUpperCase().trim())
    .filter(Boolean)
    .filter((symbol) => {
      if (equityProfileWarmPending.has(symbol)) {
        return false;
      }

      const resource = `/equities/${encodeURIComponent(symbol)}`;
      const cachedValue = getKwayisiCachedValue(resource);
      if (typeof cachedValue !== "undefined") {
        return false;
      }

      equityProfileWarmPending.add(symbol);
      return true;
    });

  if (normalizedSymbols.length === 0) {
    return;
  }

  void (async () => {
    for (const batch of chunkValues(normalizedSymbols, HEATMAP_EQUITY_BATCH_SIZE)) {
      await Promise.allSettled(
        batch.map(async (symbol) => {
          try {
            await fetchKwayisiJson(`/equities/${encodeURIComponent(symbol)}`, {
              allowNotFound: true,
              cacheTtlMs: KWAYISI_PROFILE_CACHE_TTL_MS,
              useStaleOnError: true,
            });
          } finally {
            equityProfileWarmPending.delete(symbol);
          }
        })
      );

      await sleep(180);
    }
  })();
}

async function warmHistoryCoverageForSymbol(symbol, range = "ALL") {
  const upperSymbol = String(symbol || "").toUpperCase().trim();
  if (!upperSymbol) {
    return;
  }

  const key = `${upperSymbol}::${range}`;
  if (historyCoverageWarmPending.has(key)) {
    return;
  }

  historyCoverageWarmPending.add(key);

  try {
    const chartRows = await fetchHistoryRowsWithCache(upperSymbol, range, {
      bypassErrorCooldown: true,
    });

    if (Array.isArray(chartRows) && chartRows.length > 0) {
      for (const row of chartRows) {
        insertHistory({
          symbol: upperSymbol,
          trade_date: row.date,
          close_price: row.value,
          change_value: 0,
          change_percent: 0,
          volume: 0,
          source: "KwayisiChart",
        });
      }

      markHistoryCoverageSync(upperSymbol, range);
    }
  } catch (error) {
    console.error(
      `History coverage warm failed for ${upperSymbol}:`,
      error?.message || error
    );
  } finally {
    historyCoverageWarmPending.delete(key);
  }
}

function warmMissingHistoryInBackground(symbols = KNOWN_SYMBOLS) {
  const missingSymbols = symbols.filter((symbol) => {
    const rows = getRealHistory(symbol, "1W");
    return !Array.isArray(rows) || rows.length < 2;
  });

  if (missingSymbols.length === 0) {
    return;
  }

  void (async () => {
    for (const symbol of missingSymbols) {
      await warmHistoryCoverageForSymbol(symbol, "ALL");
      await sleep(260);
    }
  })();
}

app.get("/api/test", (req, res) => {
  res.json({ message: "Plutus backend is working" });
});

app.get("/api/indices", async (req, res) => {
  try {
    const data = await getGseIndicesData();
    res.json(data.summaries);
  } catch (error) {
    console.error("Indices route failed:", error);
    res.status(500).json({ error: "Failed to fetch indices" });
  }
});

app.get("/api/indices/:code/history", async (req, res) => {
  try {
    const code = normalizeGseIndexCode(req.params.code);
    const requestedRange = String(req.query.range || "1W").toUpperCase();
    const validRanges = new Set(["1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"]);
    const range = validRanges.has(requestedRange) ? requestedRange : "1W";

    if (!GSE_INDEX_CODES.includes(code)) {
      return res.status(404).json({ error: "Index not found" });
    }

    const data = await getGseIndicesData();
    const rows = data.historyByCode[code] || [];
    return res.json(filterRowsByRange(rows, range));
  } catch (error) {
    console.error("Index history route failed:", error);
    return res.status(500).json({ error: "Failed to fetch index history" });
  }
});

app.get("/api/stocks", async (req, res) => {
  try {
    const stocks = await getLiveStocks();
    res.json(stocks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round(process.uptime()),
    storage: path.dirname(DB_PATH),
  });
});

app.get("/api/stocks/heatmap", async (req, res) => {
  try {
    const items = await getMarketHeatmapStocks();
    res.json(items);
  } catch (error) {
    console.error("Heatmap route failed:", error);
    res.status(500).json({ error: "Failed to fetch heatmap data" });
  }
});

app.get("/api/stocks/mini-history", async (req, res) => {
  try {
    const requestedRange = String(req.query.range || "1W").toUpperCase();
    const validRanges = new Set(["1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"]);
    const range = validRanges.has(requestedRange) ? requestedRange : "1W";
    const requestedSymbols = parseRequestedSymbolsQuery(req.query.symbols);
    const symbols = (requestedSymbols.length > 0 ? requestedSymbols : KNOWN_SYMBOLS).slice(
      0,
      60
    );
    const seriesBySymbol = {};
    const missingSymbols = [];

    for (const symbol of symbols) {
      let rows = getRealHistory(symbol, range);

      if ((!Array.isArray(rows) || rows.length === 0) && range !== "ALL") {
        const cachedAllRows =
          getCachedHistoryScrapeRows(symbol, "ALL") ||
          getCachedHistoryScrapeRows(symbol, "ALL", {
            allowExpired: true,
          });

        if (Array.isArray(cachedAllRows) && cachedAllRows.length > 0) {
          rows = filterRowsByRange(cachedAllRows, range);
        }
      }

      if (!Array.isArray(rows) || rows.length < 2) {
        rows = buildFallbackHistoryRows(symbol, range);
      }

      const values = Array.isArray(rows)
        ? rows
            .map((row) => Number(row?.value))
            .filter((value) => Number.isFinite(value))
        : [];

      seriesBySymbol[symbol] = values;

      if (values.length < 2) {
        missingSymbols.push(symbol);
      }
    }

    res.json({
      range,
      seriesBySymbol,
      missingSymbols,
    });
  } catch (error) {
    console.error("Stock mini-history route failed:", error);
    res.status(500).json({ error: "Failed to fetch stock mini history" });
  }
});

app.get("/api/stocks/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const stock = await getStockDetail(symbol);
    res.json(stock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stock" });
  }
});

app.get("/api/stocks/:symbol/about", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const stock = await getStockDetail(symbol);
    const about = await resolveStockAbout(symbol, {
      companyName: stock?.companyName || stock?.name || SYMBOL_NAME_MAP[symbol] || symbol,
      fallbackDescription: stock?.description || "",
      website: stock?.company?.website || stock?.website || "",
    });
    res.json(about);
  } catch (error) {
    console.error("Stock about route failed:", error);
    res.status(500).json({ error: "Failed to fetch stock about" });
  }
});

app.get("/api/stocks/:symbol/branding", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const stock = await getStockDetail(symbol);
    const branding = await resolveCompanyWebsiteBranding(symbol, {
      companyName: stock?.companyName || stock?.name || SYMBOL_NAME_MAP[symbol] || symbol,
      website: stock?.company?.website || stock?.website || "",
    });

    res.json({
      symbol,
      companyName:
        stock?.companyName ||
        branding.companyName ||
        stock?.name ||
        SYMBOL_NAME_MAP[symbol] ||
        symbol,
      website: branding.website || stock?.company?.website || stock?.website || "",
      logoUrl: branding.logoUrl || stock?.company?.logoUrl || stock?.logoUrl || "",
      description: branding.description || "",
      source: branding.source || "fallback",
    });
  } catch (error) {
    console.error("Stock branding route failed:", error);
    res.status(500).json({ error: "Failed to fetch stock branding" });
  }
});

app.get("/api/stocks/:symbol/news", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const news = await getStockNews(symbol);
    res.json(news);
  } catch (error) {
    console.error("Stock news route failed:", error);
    res.status(500).json({ error: "Failed to fetch stock news" });
  }
});

app.get("/api/stocks/:symbol/corporate-actions", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const events = await getStockCorporateActions(symbol);
    res.json(events);
  } catch (error) {
    console.error("Stock corporate actions route failed:", error);
    res.status(500).json({ error: "Failed to fetch corporate actions" });
  }
});

app.get("/api/stocks/:symbol/history", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const requestedRange = String(req.query.range || "1W").toUpperCase();
    const validRanges = new Set(["1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"]);
    const range = validRanges.has(requestedRange) ? requestedRange : "1W";

    const dbRows = getRealHistory(symbol, range);
    const shouldBackfillCoverage = shouldBackfillHistoryCoverage(
      symbol,
      range,
      dbRows
    );

    if (dbRows.length > 0 && !shouldBackfillCoverage) {
      return res.json(dbRows);
    }

    const cachedAllRows =
      getCachedHistoryScrapeRows(symbol, "ALL") ||
      getCachedHistoryScrapeRows(symbol, "ALL", {
        allowExpired: true,
      });

    if (Array.isArray(cachedAllRows) && cachedAllRows.length > 0) {
      const cachedRangeRows = filterRowsByRange(
        appendLiveSnapshotToHistoryRows(symbol, cachedAllRows),
        range
      );

      if (cachedRangeRows.length > 0 && !shouldBackfillCoverage) {
        return res.json(cachedRangeRows);
      }
    }

    const scrapeRange = "ALL";
    const forceFreshScrape = shouldBackfillCoverage && range === "ALL";
    let usedFreshAllScrape = false;
    let chartRows = [];

    if (forceFreshScrape) {
      try {
        chartRows = await scrapeKwayisiChartData(symbol, "ALL");
        usedFreshAllScrape = Array.isArray(chartRows) && chartRows.length > 0;

        if (usedFreshAllScrape) {
          setCachedHistoryScrapeRows(symbol, "ALL", chartRows);
          historyScrapeErrorUntil.delete(getHistoryScrapeCacheKey(symbol, "ALL"));
        }
      } catch (freshAllError) {
        console.error(
          `Fresh ALL history scrape failed for ${symbol}:`,
          freshAllError?.message || freshAllError
        );
        chartRows = [];
      }
    } else {
      chartRows = await fetchHistoryRowsWithCache(symbol, scrapeRange);
    }

    if (chartRows.length > 0) {
      for (const row of chartRows) {
        insertHistory({
          symbol,
          trade_date: row.date,
          close_price: row.value,
          change_value: 0,
          change_percent: 0,
          volume: 0,
          source: "KwayisiChart",
        });
      }
      markHistoryCoverageSync(symbol, "ALL");
      markHistoryCoverageSync(symbol, range);
    } else if (forceFreshScrape && !usedFreshAllScrape) {
      // Keep retrying future ALL requests until we successfully refresh full history.
      historyCoverageSyncAt.delete(
        `${String(symbol || "").toUpperCase().trim()}::${range}`
      );
    }

    const refreshedDbRows = getRealHistory(symbol, range);
    if (refreshedDbRows.length > 0) {
      return res.json(refreshedDbRows);
    }

    if (chartRows.length > 0) {
      return res.json(
        filterRowsByRange(appendLiveSnapshotToHistoryRows(symbol, chartRows), range)
      );
    }

    if (Array.isArray(cachedAllRows) && cachedAllRows.length > 0) {
      const cachedRangeRows = filterRowsByRange(
        appendLiveSnapshotToHistoryRows(symbol, cachedAllRows),
        range
      );

      if (cachedRangeRows.length > 0) {
        return res.json(cachedRangeRows);
      }
    }

    if (dbRows.length > 0) {
      return res.json(dbRows);
    }

    const generatedFallbackRows = buildFallbackHistoryRows(symbol, range);
    if (generatedFallbackRows.length > 0) {
      return res.json(generatedFallbackRows);
    }

    return res.json([]);
  } catch (error) {
    console.error("History route failed:", error);
    return res.status(500).json({
      error: "Chart fetch failed",
      details: String(error && error.stack ? error.stack : error),
    });
  }
});

app.get("/api/admin/reset-history", (req, res) => {
  try {
    const info = db.prepare(`DELETE FROM stock_history`).run();
    res.json({
      ok: true,
      deletedRows: info.changes,
      message: "All stock history cleared",
    });
  } catch (error) {
    console.error("Reset history failed:", error);
    res.status(500).json({
      ok: false,
      message: "Reset history failed",
      error: error.message,
    });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const refreshParam = String(req.query.refresh || "").toLowerCase().trim();
    const forceRefresh =
      refreshParam === "1" ||
      refreshParam === "true" ||
      refreshParam === "yes";
    const news = await getHomepageNews({ forceRefresh });
    res.json(news);
  } catch (error) {
    console.error("Homepage news route failed:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.get("/downloads/plutus-debug.apk", (req, res) => {
  if (!fs.existsSync(ANDROID_DEBUG_APK_PATH)) {
    res.status(404).json({ error: "APK not found" });
    return;
  }

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader(
    "Content-Type",
    "application/vnd.android.package-archive"
  );

  res.download(ANDROID_DEBUG_APK_PATH, "Plutus-debug.apk", (error) => {
    if (error && !res.headersSent) {
      console.error("APK download failed:", error);
      res.status(500).json({ error: "Failed to download APK" });
    }
  });
});

if (fs.existsSync(CLIENT_INDEX_PATH)) {
  app.use(
    express.static(CLIENT_DIST_DIR, {
      index: false,
      setHeaders: (res, filePath) => {
        const normalizedPath = path.normalize(filePath);
        const isHtmlFile =
          normalizedPath === CLIENT_INDEX_PATH ||
          normalizedPath.endsWith(`${path.sep}index.html`) ||
          normalizedPath.endsWith(".html");
        const isManifestFile =
          normalizedPath.endsWith(`${path.sep}manifest.webmanifest`) ||
          normalizedPath.endsWith(".webmanifest") ||
          normalizedPath.endsWith(".json");
        const isServiceWorkerFile =
          normalizedPath.endsWith(`${path.sep}sw.js`) ||
          normalizedPath.endsWith(`${path.sep}service-worker.js`);
        const isVersionedStaticAsset =
          normalizedPath.includes(`${path.sep}assets${path.sep}`) ||
          normalizedPath.includes(`${path.sep}logos${path.sep}`) ||
          normalizedPath.includes(`${path.sep}popular-lists${path.sep}`) ||
          /\.(?:css|js|svg|png|jpe?g|webp|gif|ico)$/i.test(normalizedPath);

        if (isHtmlFile) {
          res.setHeader("Cache-Control", "no-cache");
          return;
        }

        if (isManifestFile || isServiceWorkerFile) {
          res.setHeader("Cache-Control", "no-cache");
          return;
        }

        if (isVersionedStaticAsset) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }

        res.setHeader("Cache-Control", "public, max-age=86400");
      },
    })
  );

  app.use((req, res, next) => {
    if (
      (req.method !== "GET" && req.method !== "HEAD") ||
      req.path.startsWith("/api")
    ) {
      return next();
    }

    res.setHeader("Cache-Control", "no-cache");
    return res.sendFile(CLIENT_INDEX_PATH);
  });
} else {
  app.get("/", (req, res) => {
    res.status(503).send(
      "Frontend build is missing. Run `npm run build` in the project root, then refresh this page."
    );
  });
}

function warmCachesInBackground() {
  if (IS_CLOUD_RUN) {
    return;
  }

  void getLiveStocks({ allowStale: false }).catch((error) => {
    console.error("Live stocks warmup failed:", error?.message || error);
  });

  void getGseIndicesData({ allowStale: false }).catch((error) => {
    console.error("Indices warmup failed:", error?.message || error);
  });

  void fetchAllNewsItems().catch((error) => {
    console.error("News warmup failed:", error?.message || error);
  });

  setTimeout(() => {
    warmEquityProfilesInBackground();
  }, PROFILE_WARMUP_DELAY_MS);

  setTimeout(() => {
    void getGsePressReleaseArchive({ allowStale: false }).catch((error) => {
      console.error(
        "Corporate actions warmup failed:",
        error?.message || error
      );
    });
  }, GSE_PRESS_RELEASE_WARMUP_DELAY_MS);
}

app.listen({ port: PORT, host: HOST, ipv6Only: false }, () => {
  const displayHost = HOST === "::" ? "localhost" : HOST;
  console.log(`Server running at http://${displayHost}:${PORT}`);
  if (IS_CLOUD_RUN) {
    console.log("Skipping startup warmups on Cloud Run.");
    return;
  }

  setTimeout(warmCachesInBackground, CACHE_WARMUP_DELAY_MS);
});
