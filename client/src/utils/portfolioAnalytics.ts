import type { PortfolioTransaction, Position, Stock } from "../App";

export type HoldingAnalytics = {
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  averageCost: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
};

export type PortfolioReturnPoint = {
  date: string;
  value: number;
};

export type PortfolioValuePoint = {
  date: string;
  value: number;
};

type PositionState = {
  shares: number;
  totalCost: number;
};

export function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolvePortfolioSymbol(stock: Partial<Stock> | { symbol?: string }) {
  return String(stock.symbol || (stock as Partial<Stock>).ticker || (stock as Partial<Stock>).code || "")
    .toUpperCase()
    .trim();
}

export function getHoldingAnalytics(
  stocks: Stock[],
  positions: Record<string, Position>
): HoldingAnalytics[] {
  const stockMap = Object.fromEntries(
    stocks
      .map((stock) => [resolvePortfolioSymbol(stock), stock] as const)
      .filter(([symbol]) => Boolean(symbol))
  );

  return Object.entries(positions)
    .map(([symbol, position]) => {
      const safeSymbol = symbol.toUpperCase().trim();
      const stock = stockMap[safeSymbol];
      const shares = toNumber(position.shares);
      const totalCost = toNumber(position.totalCost);
      const currentPrice = toNumber(stock?.price);
      const currentValue = shares * currentPrice;
      const averageCost = shares > 0 ? totalCost / shares : 0;
      const unrealizedPnl = currentValue - totalCost;
      const unrealizedPnlPercent =
        totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

      return {
        symbol: safeSymbol,
        name: stock?.companyName || stock?.name || safeSymbol,
        sector: stock?.sector || "Unclassified",
        shares,
        currentPrice,
        currentValue,
        totalCost,
        averageCost,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    })
    .filter((holding) => holding.symbol && holding.shares > 0)
    .sort((a, b) => b.currentValue - a.currentValue);
}

export function getPortfolioSummary(
  stocks: Stock[],
  positions: Record<string, Position>,
  transactions: PortfolioTransaction[]
) {
  const holdings = getHoldingAnalytics(stocks, positions);
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalCost = holdings.reduce((sum, holding) => sum + holding.totalCost, 0);
  const unrealizedPnl = holdings.reduce(
    (sum, holding) => sum + holding.unrealizedPnl,
    0
  );
  const realizedPnl = transactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === "sell" ? toNumber(transaction.realizedPnl) : 0),
    0
  );
  const totalBuyValue = transactions.reduce(
    (sum, transaction) =>
      sum + (transaction.type === "buy" ? toNumber(transaction.total) : 0),
    0
  );
  const totalReturn = realizedPnl + unrealizedPnl;
  const totalReturnBasis = totalBuyValue > 0 ? totalBuyValue : totalCost;
  const totalReturnPercent =
    totalReturnBasis > 0 ? (totalReturn / totalReturnBasis) * 100 : 0;

  return {
    holdings,
    totalValue,
    totalCost,
    unrealizedPnl,
    realizedPnl,
    totalReturn,
    totalReturnPercent,
  };
}

function getTransactionDateKey(timestamp: number) {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

type NormalizedTransaction = PortfolioTransaction & {
  symbol: string;
  timestamp: number;
  dateKey: string;
};

function normalizeTransactions(transactions: PortfolioTransaction[]) {
  return [...transactions]
    .map<NormalizedTransaction>((transaction) => ({
      ...transaction,
      symbol: String(transaction.symbol || "").toUpperCase().trim(),
      timestamp: toNumber(transaction.timestamp),
      dateKey: getTransactionDateKey(toNumber(transaction.timestamp)),
    }))
    .filter(
      (transaction) =>
        transaction.symbol &&
        transaction.timestamp > 0 &&
        transaction.dateKey
    )
    .sort((left, right) => left.timestamp - right.timestamp);
}

function buildReconstructedPositionState(transactions: PortfolioTransaction[]) {
  const stateBySymbol = new Map<string, PositionState>();

  for (const transaction of normalizeTransactions(transactions)) {
    applyTransactionToState(stateBySymbol, transaction);
  }

  return stateBySymbol;
}

export function getPortfolioHistorySymbols(
  positions: Record<string, Position>,
  transactions: PortfolioTransaction[]
) {
  const symbols = new Set<string>();

  for (const [symbol, position] of Object.entries(positions)) {
    const normalizedSymbol = String(symbol || "").toUpperCase().trim();
    if (!normalizedSymbol || toNumber(position?.shares) <= 0) {
      continue;
    }

    symbols.add(normalizedSymbol);
  }

  for (const transaction of transactions) {
    const normalizedSymbol = String(transaction.symbol || "")
      .toUpperCase()
      .trim();
    if (normalizedSymbol) {
      symbols.add(normalizedSymbol);
    }
  }

  return [...symbols].sort((left, right) => left.localeCompare(right));
}

export function hasCompletePortfolioHistory(
  positions: Record<string, Position>,
  transactions: PortfolioTransaction[]
) {
  const normalizedTransactions = normalizeTransactions(transactions);

  if (normalizedTransactions.length === 0) {
    return false;
  }

  const reconstructedState = buildReconstructedPositionState(normalizedTransactions);
  const symbols = getPortfolioHistorySymbols(positions, normalizedTransactions);

  return symbols.every((symbol) => {
    const expectedShares = toNumber(positions[symbol]?.shares);
    const actualShares = toNumber(reconstructedState.get(symbol)?.shares);
    return Math.abs(expectedShares - actualShares) < 0.0001;
  });
}

function applyTransactionToState(
  stateBySymbol: Map<string, PositionState>,
  transaction: PortfolioTransaction
) {
  const symbol = String(transaction.symbol || "").toUpperCase().trim();
  if (!symbol) {
    return 0;
  }

  const current = stateBySymbol.get(symbol) || { shares: 0, totalCost: 0 };
  const shares = toNumber(transaction.shares);
  const total = toNumber(transaction.total);

  if (transaction.type === "buy") {
    stateBySymbol.set(symbol, {
      shares: current.shares + shares,
      totalCost: current.totalCost + total,
    });
    return 0;
  }

  const averageCostPerShare =
    current.shares > 0 ? current.totalCost / current.shares : 0;
  const realizedPnl =
    Number.isFinite(toNumber(transaction.realizedPnl)) &&
    Math.abs(toNumber(transaction.realizedPnl)) > 0
      ? toNumber(transaction.realizedPnl)
      : total - averageCostPerShare * shares;

  const remainingShares = Math.max(0, current.shares - shares);
  const remainingTotalCost = Math.max(
    0,
    current.totalCost - averageCostPerShare * shares
  );

  stateBySymbol.set(symbol, {
    shares: remainingShares,
    totalCost: remainingTotalCost,
  });

  return realizedPnl;
}

export function buildPortfolioReturnSeries(
  stocks: Stock[],
  positions: Record<string, Position>,
  transactions: PortfolioTransaction[],
  historyBySymbol: Record<string, PortfolioReturnPoint[]>
) {
  const relevantSymbols = new Set<string>();
  const stateBySymbol = new Map<string, PositionState>();
  const symbolsWithTransactions = new Set(
    transactions.map((transaction) => String(transaction.symbol || "").toUpperCase().trim())
  );

  for (const symbol of Object.keys(positions)) {
    const normalizedSymbol = symbol.toUpperCase().trim();
    if (!normalizedSymbol) {
      continue;
    }

    relevantSymbols.add(normalizedSymbol);

    if (!symbolsWithTransactions.has(normalizedSymbol)) {
      stateBySymbol.set(normalizedSymbol, {
        shares: toNumber(positions[symbol]?.shares),
        totalCost: toNumber(positions[symbol]?.totalCost),
      });
    }
  }

  for (const transaction of transactions) {
    const symbol = String(transaction.symbol || "").toUpperCase().trim();
    if (symbol) {
      relevantSymbols.add(symbol);
    }
  }

  for (const symbol of Object.keys(historyBySymbol)) {
    if (symbol) {
      relevantSymbols.add(symbol.toUpperCase().trim());
    }
  }

  const allDates = new Set<string>();

  for (const symbol of relevantSymbols) {
    for (const point of historyBySymbol[symbol] || []) {
      if (point?.date) {
        allDates.add(point.date);
      }
    }
  }

  const dates = [...allDates].sort();
  if (dates.length < 2) {
    return [];
  }

  const sortedTransactions = [...transactions]
    .map((transaction) => ({
      ...transaction,
      symbol: String(transaction.symbol || "").toUpperCase().trim(),
      timestamp: toNumber(transaction.timestamp),
    }))
    .filter((transaction) => transaction.symbol && transaction.timestamp > 0)
    .sort((left, right) => left.timestamp - right.timestamp);

  const transactionSymbols = new Set(sortedTransactions.map((transaction) => transaction.symbol));
  for (const symbol of relevantSymbols) {
    if (!transactionSymbols.has(symbol) && !stateBySymbol.has(symbol)) {
      const position = positions[symbol];
      if (position && toNumber(position.shares) > 0) {
        stateBySymbol.set(symbol, {
          shares: toNumber(position.shares),
          totalCost: toNumber(position.totalCost),
        });
      }
    }
  }

  const priceMapBySymbol = new Map<string, Map<string, number>>();
  const lastKnownPriceBySymbol = new Map<string, number>();
  const liveStockMap = new Map(
    stocks.map((stock) => [resolvePortfolioSymbol(stock), stock] as const)
  );

  for (const symbol of relevantSymbols) {
    const priceMap = new Map<string, number>();
    for (const point of historyBySymbol[symbol] || []) {
      const value = toNumber(point?.value);
      if (point?.date && value > 0) {
        priceMap.set(point.date, value);
      }
    }
    priceMapBySymbol.set(symbol, priceMap);
  }

  const returnSeries: PortfolioReturnPoint[] = [];
  let realizedPnl = 0;
  let transactionIndex = 0;

  for (const date of dates) {
    while (
      transactionIndex < sortedTransactions.length &&
      getTransactionDateKey(sortedTransactions[transactionIndex].timestamp) <= date
    ) {
      realizedPnl += applyTransactionToState(
        stateBySymbol,
        sortedTransactions[transactionIndex]
      );
      transactionIndex += 1;
    }

    let unrealizedPnl = 0;

    for (const symbol of relevantSymbols) {
      const priceMap = priceMapBySymbol.get(symbol);
      const dateValue = priceMap?.get(date);
      if (dateValue) {
        lastKnownPriceBySymbol.set(symbol, dateValue);
      }

      const state = stateBySymbol.get(symbol);
      if (!state || state.shares <= 0) {
        continue;
      }

      const currentPrice =
        lastKnownPriceBySymbol.get(symbol) ||
        toNumber(liveStockMap.get(symbol)?.price);

      if (!(currentPrice > 0)) {
        continue;
      }

      unrealizedPnl += state.shares * currentPrice - state.totalCost;
    }

    returnSeries.push({
      date,
      value: realizedPnl + unrealizedPnl,
    });
  }

  const summary = getPortfolioSummary(stocks, positions, transactions);
  if (returnSeries.length > 0) {
    returnSeries[returnSeries.length - 1] = {
      ...returnSeries[returnSeries.length - 1],
      value: summary.totalReturn,
    };
  }

  return returnSeries;
}

export function buildPortfolioValueSeries(
  stocks: Stock[],
  positions: Record<string, Position>,
  transactions: PortfolioTransaction[],
  historyBySymbol: Record<string, PortfolioValuePoint[]>
) {
  const normalizedTransactions = normalizeTransactions(transactions);

  if (
    normalizedTransactions.length === 0 ||
    !hasCompletePortfolioHistory(positions, normalizedTransactions)
  ) {
    return [];
  }

  const relevantSymbols = getPortfolioHistorySymbols(positions, normalizedTransactions);
  if (relevantSymbols.length === 0) {
    return [];
  }

  const firstInvestmentDate =
    normalizedTransactions.find((transaction) => transaction.type === "buy")?.dateKey ||
    normalizedTransactions[0]?.dateKey ||
    "";
  if (!firstInvestmentDate) {
    return [];
  }

  const lastTransactionDate =
    normalizedTransactions[normalizedTransactions.length - 1]?.dateKey || "";
  const allDates = new Set<string>();

  for (const symbol of relevantSymbols) {
    for (const point of historyBySymbol[symbol] || []) {
      if (point?.date && point.date >= firstInvestmentDate) {
        allDates.add(point.date);
      }
    }
  }

  const dates = [...allDates].sort();
  if (dates.length === 0) {
    return [];
  }

  const priceMapBySymbol = new Map<string, Map<string, number>>();
  const lastKnownPriceBySymbol = new Map<string, number>();
  const liveStockMap = new Map(
    stocks.map((stock) => [resolvePortfolioSymbol(stock), stock] as const)
  );

  for (const symbol of relevantSymbols) {
    const priceMap = new Map<string, number>();

    for (const point of historyBySymbol[symbol] || []) {
      const value = toNumber(point?.value);
      if (point?.date && value > 0) {
        priceMap.set(point.date, value);
      }
    }

    priceMapBySymbol.set(symbol, priceMap);
  }

  const endingStateBySymbol = buildReconstructedPositionState(normalizedTransactions);
  const hasOpenHoldingsAfterLastTransaction = [...endingStateBySymbol.values()].some(
    (state) => toNumber(state.shares) > 0
  );
  const endDateKey = hasOpenHoldingsAfterLastTransaction
    ? dates[dates.length - 1]
    : lastTransactionDate;

  const stateBySymbol = new Map<string, PositionState>();
  const valueSeries: PortfolioValuePoint[] = [];
  let transactionIndex = 0;

  for (const date of dates) {
    if (date < firstInvestmentDate) {
      continue;
    }

    while (
      transactionIndex < normalizedTransactions.length &&
      normalizedTransactions[transactionIndex].dateKey <= date
    ) {
      applyTransactionToState(stateBySymbol, normalizedTransactions[transactionIndex]);
      transactionIndex += 1;
    }

    if (endDateKey && date > endDateKey) {
      break;
    }

    let activeHoldingCount = 0;
    let portfolioValue = 0;

    for (const symbol of relevantSymbols) {
      const priceMap = priceMapBySymbol.get(symbol);
      const dateValue = priceMap?.get(date);
      if (dateValue && Number.isFinite(dateValue) && dateValue > 0) {
        lastKnownPriceBySymbol.set(symbol, dateValue);
      }

      const state = stateBySymbol.get(symbol);
      if (!state || toNumber(state.shares) <= 0) {
        continue;
      }

      activeHoldingCount += 1;

      const currentPrice =
        lastKnownPriceBySymbol.get(symbol) ||
        (hasOpenHoldingsAfterLastTransaction && date === endDateKey
          ? toNumber(liveStockMap.get(symbol)?.price)
          : 0);

      if (!(currentPrice > 0)) {
        continue;
      }

      portfolioValue += state.shares * currentPrice;
    }

    const hasFutureTransactions = transactionIndex < normalizedTransactions.length;
    const shouldIncludePoint =
      activeHoldingCount > 0 || hasFutureTransactions || date === lastTransactionDate;

    if (shouldIncludePoint) {
      valueSeries.push({
        date,
        value: portfolioValue,
      });
    }
  }

  const firstPositiveIndex = valueSeries.findIndex((point) => point.value > 0);
  if (firstPositiveIndex > 0) {
    return valueSeries.slice(firstPositiveIndex);
  }

  return valueSeries;
}
