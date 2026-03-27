const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const Parser = require("rss-parser");
const cron = require("node-cron");
const path = require("path");

const app = express();
const PORT = 3001;
const parser = new Parser();

app.use(cors());
app.use(express.json());

/* =========================
   DATABASE
========================= */
const db = new Database(path.join(__dirname, "plutus.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    trade_date TEXT NOT NULL,
    close_price REAL NOT NULL,
    change_value REAL DEFAULT 0,
    change_percent REAL DEFAULT 0,
    volume INTEGER DEFAULT 0,
    source TEXT DEFAULT 'Kwayisi',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, trade_date)
  );
`);

/* =========================
   HELPERS
========================= */
function mapStock(item) {
  return {
    symbol: String(item.symbol || item.ticker || "").toUpperCase().trim(),
    name: item.name || item.company || item.symbol || "",
    price: Number(item.price ?? item.close ?? 0),
    change: Number(item.change ?? item.change_value ?? 0),
    changePercent: Number(
      item.changePercent ?? item.change_percent ?? item.pct ?? 0
    ),
    volume: Number(item.volume ?? item.tradeVolume ?? 0),
  };
}

function todayString() {
  return new Date().toISOString().split("T")[0];
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
    row.source || "Kwayisi"
  );
}

function getHistory(symbol, range = "1M") {
  const limits = {
    "1W": 5,
    "1M": 22,
    "3M": 66,
    "6M": 132,
    "1Y": 252,
    "5Y": 1260,
    ALL: 10000,
  };

  const limit = limits[range] || 22;

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
    ORDER BY trade_date DESC
    LIMIT ?
  `).all(String(symbol).toUpperCase(), limit);

  return rows.reverse();
}

function parseDateDDMMYYYY(s) {
  const m = String(s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function daysBetween(a, b) {
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  return Math.floor(Math.abs(end - start) / 86400000);
}

function stripHtmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#[\d]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(base, url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) {
    const u = new URL(base);
    return `${u.origin}${url}`;
  }
  return new URL(url, base).toString();
}

function parsePublishedTime(pubDate) {
  const t = Date.parse(pubDate || "");
  return Number.isNaN(t) ? 0 : t;
}

function formatRelativeTime(pubDate) {
  const t = Date.parse(pubDate || "");
  if (Number.isNaN(t)) return "recent";

  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

function shuffleArray(arr) {
  const clone = [...arr];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function interleaveBySource(items, maxItems = 24) {
  const grouped = new Map();

  for (const item of items) {
    if (!grouped.has(item.source)) grouped.set(item.source, []);
    grouped.get(item.source).push(item);
  }

  for (const [source, sourceItems] of grouped.entries()) {
    grouped.set(
      source,
      sourceItems.sort(
        (a, b) => parsePublishedTime(b.publishedAt) - parsePublishedTime(a.publishedAt)
      )
    );
  }

  let sources = [...grouped.keys()];
  sources = shuffleArray(sources);

  const result = [];
  let guard = 0;

  while (result.length < maxItems && sources.length > 0 && guard < 500) {
    guard += 1;
    const nextSources = [];

    for (const source of sources) {
      const queue = grouped.get(source) || [];
      if (queue.length > 0 && result.length < maxItems) {
        result.push(queue.shift());
      }
      if (queue.length > 0) {
        nextSources.push(source);
      }
    }

    sources = shuffleArray(nextSources);
  }

  return result;
}

async function fetchArticleImage(articleUrl) {
  try {
    if (!articleUrl) return "";

    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    const html = await response.text();

    const ogMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (ogMatch && ogMatch[1]) {
      return absoluteUrl(articleUrl, ogMatch[1]);
    }

    const twitterMatch = html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    );
    if (twitterMatch && twitterMatch[1]) {
      return absoluteUrl(articleUrl, twitterMatch[1]);
    }

    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return absoluteUrl(articleUrl, imgMatch[1]);
    }

    return "";
  } catch (error) {
    return "";
  }
}

/* =========================
   GSE OFFICIAL CHECK
========================= */
async function ingestGseOfficialIfFresh() {
  try {
    const response = await fetch("https://gse.com.gh/trading-and-data/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`GSE fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const text = stripHtmlToText(html);

    const rowRegex =
      /\b\d+\s+(\d{2}\/\d{2}\/\d{4})\s+([A-Z]{2,10})\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([\-0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\b/g;

    const matches = [...text.matchAll(rowRegex)];

    if (matches.length === 0) {
      return {
        ok: false,
        inserted: 0,
        message: "No recognizable official GSE rows found in public HTML",
      };
    }

    const parsedRows = matches
      .map((m) => {
        const tradeDate = parseDateDDMMYYYY(m[1]);
        const symbol = String(m[2]).toUpperCase();
        const closePrice = Number(String(m[7]).replace(/,/g, ""));
        const changeValue = Number(String(m[8]).replace(/,/g, ""));
        const volume = Number(String(m[11]).replace(/,/g, ""));

        return {
          tradeDate,
          symbol,
          closePrice,
          changeValue,
          volume,
        };
      })
      .filter((r) => r.tradeDate && r.symbol && Number.isFinite(r.closePrice));

    if (parsedRows.length === 0) {
      return {
        ok: false,
        inserted: 0,
        message: "Official GSE rows were parsed but not usable",
      };
    }

    const newestDate = parsedRows.map((r) => r.tradeDate).sort().slice(-1)[0];

    if (daysBetween(newestDate, todayString()) > 7) {
      return {
        ok: false,
        inserted: 0,
        message: `Official GSE HTML appears stale (latest exposed date: ${newestDate})`,
      };
    }

    const latestRows = parsedRows.filter((r) => r.tradeDate === newestDate);

    let inserted = 0;
    for (const row of latestRows) {
      insertHistory({
        symbol: row.symbol,
        trade_date: row.tradeDate,
        close_price: row.closePrice,
        change_value: row.changeValue,
        change_percent: 0,
        volume: row.volume,
        source: "GSE",
      });
      inserted += 1;
    }

    return {
      ok: true,
      inserted,
      message: `Official GSE rows stored for ${newestDate}`,
    };
  } catch (error) {
    console.error("Official GSE ingestion failed:", error.message);
    return {
      ok: false,
      inserted: 0,
      message: "Official GSE ingestion failed",
    };
  }
}

/* =========================
   KWAYISI DAILY SNAPSHOT
========================= */
async function ingestKwayisiSnapshot() {
  try {
    const response = await fetch("https://dev.kwayisi.org/apis/gse/live");
    if (!response.ok) {
      throw new Error(`Kwayisi fetch failed: ${response.status}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data) ? data.map(mapStock) : [];
    const tradeDate = todayString();

    let inserted = 0;
    for (const stock of rows) {
      if (!stock.symbol || !Number.isFinite(stock.price)) continue;

      insertHistory({
        symbol: stock.symbol,
        trade_date: tradeDate,
        close_price: stock.price,
        change_value: stock.change,
        change_percent: stock.changePercent,
        volume: stock.volume,
        source: "Kwayisi",
      });
      inserted += 1;
    }

    console.log(`Kwayisi EOD snapshot stored: ${inserted} rows for ${tradeDate}`);
    return inserted;
  } catch (error) {
    console.error("Kwayisi snapshot failed:", error.message);
    return 0;
  }
}

/* =========================
   NEWS
========================= */
let newsCache = [];
let newsTime = 0;
const NEWS_CACHE_DURATION = 30 * 60 * 1000;

async function fetchFeed(feedUrl, sourceName, fallbackHomeUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);

    return (feed.items || []).slice(0, 6).map((item, index) => ({
      id: `${sourceName}-rss-${index + 1}-${item.link || item.guid || index}`,
      headline: item.title || "Untitled article",
      source: sourceName,
      time: formatRelativeTime(item.pubDate),
      publishedAt: item.pubDate || "",
      url: item.link || "",
      image:
        item.enclosure?.url ||
        item["media:content"]?.url ||
        item["media:thumbnail"]?.url ||
        "",
      homeUrl: fallbackHomeUrl,
    }));
  } catch (error) {
    console.log(`Failed to fetch feed for ${sourceName}`);
    return [];
  }
}

async function fetchPageNews(config) {
  try {
    const response = await fetch(config.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const blocks = html.match(config.blockRegex) || [];

    return blocks.slice(0, config.limit || 6).map((block, index) => {
      const titleMatch = block.match(config.titleRegex);
      const linkMatch = block.match(config.linkRegex);
      const imageMatch = block.match(config.imageRegex);

      const headline = cleanText(titleMatch?.[1] || "");
      const url = absoluteUrl(config.url, linkMatch?.[1] || "");
      const image = absoluteUrl(config.url, imageMatch?.[1] || "");

      return {
        id: `${config.source}-page-${index + 1}-${url || index}`,
        headline,
        source: config.source,
        time: "recent",
        publishedAt: "",
        url,
        image,
        homeUrl: config.url,
      };
    }).filter((item) => item.headline.length > 20 && item.url);
  } catch (error) {
    console.log(`Failed to fetch page news for ${config.source}`);
    return [];
  }
}

async function getFreshNews() {
  const feedConfigs = [
    {
      source: "MyJoyOnline",
      feedUrl: "https://www.myjoyonline.com/feed/",
      homeUrl: "https://www.myjoyonline.com/",
    },
    {
      source: "CitiNews",
      feedUrl: "https://citinewsroom.com/feed/",
      homeUrl: "https://citinewsroom.com/",
    },
    {
      source: "3News",
      feedUrl: "https://3news.com/feed/",
      homeUrl: "https://3news.com/",
    },
    {
      source: "Modern Ghana",
      feedUrl: "https://rss.modernghana.com/news.xml",
      homeUrl: "https://www.modernghana.com/",
    },
  ];

  const pageConfigs = [
    {
      source: "Graphic Online",
      url: "https://www.graphic.com.gh/general-news.html?type=rss",
      blockRegex: /<h3[\s\S]*?<\/h3>/gi,
      titleRegex: />([\s\S]*?)<\/h3>/i,
      linkRegex: /<a[^>]+href="([^"]+)"/i,
      imageRegex: /<img[^>]+src="([^"]+)"/i,
      limit: 8,
    },
    {
      source: "GhanaWeb",
      url: "https://www.ghanaweb.com/GhanaHomePage/NewsArchive/",
      blockRegex: /<a[\s\S]*?<\/a>/gi,
      titleRegex: />([\s\S]*?)<\/a>/i,
      linkRegex: /href="([^"]+)"/i,
      imageRegex: /<img[^>]+src="([^"]+)"/i,
      limit: 12,
    },
    {
      source: "News Ghana",
      url: "https://www.newsghana.com.gh/",
      blockRegex: /<article[\s\S]*?<\/article>/gi,
      titleRegex: /<h[23][\s\S]*?>([\s\S]*?)<\/h[23]>/i,
      linkRegex: /<a[^>]+href="([^"]+)"/i,
      imageRegex: /<img[^>]+src="([^"]+)"/i,
      limit: 8,
    },
  ];

  let allNews = [];

  for (const config of feedConfigs) {
    const items = await fetchFeed(config.feedUrl, config.source, config.homeUrl);
    allNews = [...allNews, ...items];
  }

  for (const config of pageConfigs) {
    const items = await fetchPageNews(config);
    allNews = [...allNews, ...items];
  }

  // Remove duplicates by headline or URL
  const seen = new Set();
  const deduped = [];

  for (const item of allNews) {
    const key = `${item.headline.toLowerCase()}|${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  // Newest first where pubDate exists
  deduped.sort(
    (a, b) => parsePublishedTime(b.publishedAt) - parsePublishedTime(a.publishedAt)
  );

  // Mix sources so they do not appear in long consecutive runs
  const mixed = interleaveBySource(deduped, 30);

  // Fill images where missing
  const withImages = await Promise.all(
    mixed.map(async (item) => {
      if (item.image) return item;

      const image = await fetchArticleImage(item.url || item.homeUrl || "");
      return {
        ...item,
        image,
      };
    })
  );

  return withImages.map(({ homeUrl, publishedAt, ...rest }) => rest);
}

/* =========================
   ROUTES
========================= */
app.get("/api/test", (req, res) => {
  res.json({ message: "Plutus backend is working" });
});

/* IMPORTANT: history route comes BEFORE /api/stocks/:symbol */
app.get("/api/stocks/:symbol/history", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const range = String(req.query.range || "1M");

    let rows = getHistory(symbol, range);

    if (rows.length > 0) {
      return res.json(rows);
    }

    const r = await fetch("https://dev.kwayisi.org/apis/gse/live");
    if (!r.ok) {
      return res.json([]);
    }

    const data = await r.json();
    const stock = Array.isArray(data)
      ? data.find((s) => String(s.symbol || "").toUpperCase() === symbol)
      : null;

    if (!stock) {
      return res.json([]);
    }

    const price = Number(stock.price || 0);
    if (!Number.isFinite(price) || price <= 0) {
      return res.json([]);
    }

    const fallback = [];

    for (let i = 10; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      fallback.push({
        date: d.toISOString().split("T")[0],
        value: Number((price * (1 + (Math.random() - 0.5) * 0.04)).toFixed(2)),
        change: Number(stock.change || 0),
        changePercent: Number(stock.changePercent || 0),
        volume: Number(stock.volume || 0),
        source: "Fallback",
      });
    }

    res.json(fallback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/stocks", async (req, res) => {
  try {
    const r = await fetch("https://dev.kwayisi.org/apis/gse/live");
    if (!r.ok) {
      return res.status(r.status).json({ error: "Failed to fetch live stocks" });
    }

    const data = await r.json();
    const stocks = Array.isArray(data) ? data.map(mapStock) : [];
    res.json(stocks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch live stocks" });
  }
});

app.get("/api/stocks/:symbol", async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "").toUpperCase();
    const r = await fetch(`https://dev.kwayisi.org/apis/gse/live/${symbol}`);

    if (!r.ok) {
      return res.status(r.status).json({ error: "Failed to fetch stock" });
    }

    const data = await r.json();
    res.json(mapStock(data));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stock" });
  }
});

app.get("/api/admin/ingest-gse", async (req, res) => {
  const result = await ingestGseOfficialIfFresh();
  res.json(result);
});

app.get("/api/admin/ingest-kwayisi", async (req, res) => {
  const inserted = await ingestKwayisiSnapshot();
  res.json({
    ok: inserted > 0,
    inserted,
    message:
      inserted > 0
        ? "Kwayisi snapshot stored"
        : "Kwayisi snapshot failed",
  });
});

app.get("/api/news", async (req, res) => {
  try {
    const now = Date.now();

    if (newsCache.length > 0 && now - newsTime < NEWS_CACHE_DURATION) {
      return res.json(newsCache);
    }

    const freshNews = await getFreshNews();
    newsCache = freshNews;
    newsTime = now;

    res.setHeader("Cache-Control", "no-store");
    res.json(newsCache);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

/* =========================
   CRON
========================= */
cron.schedule("10 18 * * 1-5", async () => {
  console.log("Running daily EOD job...");

  const official = await ingestGseOfficialIfFresh();

  if (!official.ok) {
    console.log(`Official GSE skipped: ${official.message}`);
    await ingestKwayisiSnapshot();
  }
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});