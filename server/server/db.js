const db = require("../db");

function upsertHistoricalRow(row) {
  const stmt = db.prepare(`
    INSERT INTO stock_history (
      symbol,
      trade_date,
      close_price,
      change_value,
      change_percent,
      volume,
      source
    )
    VALUES (
      @symbol,
      @trade_date,
      @close_price,
      @change_value,
      @change_percent,
      @volume,
      @source
    )
    ON CONFLICT(symbol, trade_date) DO UPDATE SET
      close_price = excluded.close_price,
      change_value = excluded.change_value,
      change_percent = excluded.change_percent,
      volume = excluded.volume,
      source = excluded.source
  `);

  stmt.run({
    symbol: row.symbol,
    trade_date: row.trade_date,
    close_price: row.close_price,
    change_value: row.change_value ?? 0,
    change_percent: row.change_percent ?? 0,
    volume: row.volume ?? 0,
    source: row.source ?? "GSE",
  });
}

function getHistoryBySymbol(symbol, range = "1M") {
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

  const stmt = db.prepare(`
    SELECT symbol, trade_date, close_price, change_value, change_percent, volume, source
    FROM stock_history
    WHERE symbol = ?
    ORDER BY trade_date DESC
    LIMIT ?
  `);

  const rows = stmt.all(symbol.toUpperCase(), limit);

  return rows.reverse().map((row) => ({
    symbol: row.symbol,
    date: row.trade_date,
    value: row.close_price,
    close_price: row.close_price,
    change: row.change_value,
    changePercent: row.change_percent,
    volume: row.volume,
    source: row.source,
  }));
}

function getLatestHistoricalRow(symbol) {
  const stmt = db.prepare(`
    SELECT symbol, trade_date, close_price, change_value, change_percent, volume, source
    FROM stock_history
    WHERE symbol = ?
    ORDER BY trade_date DESC
    LIMIT 1
  `);

  return stmt.get(symbol.toUpperCase());
}

module.exports = {
  upsertHistoricalRow,
  getHistoryBySymbol,
  getLatestHistoricalRow,
};