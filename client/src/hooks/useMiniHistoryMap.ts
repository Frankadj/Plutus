import { useEffect, useMemo, useState } from "react";
import type { Stock } from "../App";

const miniHistoryCache = new Map<string, number[]>();

function getResolvedSymbol(stock: Partial<Stock>) {
  return String(stock.symbol || stock.ticker || stock.code || "")
    .toUpperCase()
    .trim();
}

function getCacheKey(range: string, symbol: string) {
  return `${String(range || "1W").toUpperCase()}::${symbol}`;
}

function readCachedSeries(range: string, symbols: string[]) {
  const nextMap: Record<string, number[]> = {};

  for (const symbol of symbols) {
    const values = miniHistoryCache.get(getCacheKey(range, symbol));

    if (Array.isArray(values) && values.length >= 2) {
      nextMap[symbol] = values;
    }
  }

  return nextMap;
}

type UseMiniHistoryMapOptions = {
  apiBase: string;
  stocks: Stock[];
  range?: string;
};

export function useMiniHistoryMap({
  apiBase,
  stocks,
  range = "1W",
}: UseMiniHistoryMapOptions) {
  const symbols = useMemo(
    () =>
      Array.from(
        new Set(
          stocks
            .map((stock) => getResolvedSymbol(stock))
            .filter(Boolean)
        )
      ),
    [stocks]
  );
  const symbolsKey = symbols.join(",");
  const [seriesMap, setSeriesMap] = useState<Record<string, number[]>>(() =>
    readCachedSeries(range, symbols)
  );

  useEffect(() => {
    setSeriesMap((current) => ({
      ...current,
      ...readCachedSeries(range, symbols),
    }));
  }, [range, symbolsKey, symbols]);

  useEffect(() => {
    if (!symbolsKey) {
      return;
    }

    const controller = new AbortController();
    let retryTimer: number | null = null;

    const loadMiniHistory = async (attempt = 0) => {
      try {
        const params = new URLSearchParams({
          range,
          symbols: symbolsKey,
        });
        const response = await fetch(
          `${apiBase}/api/stocks/mini-history?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load mini chart history");
        }

        const data = await response.json();
        const rawSeriesBySymbol =
          data && typeof data === "object" && data.seriesBySymbol
            ? data.seriesBySymbol
            : {};
        const nextSeriesBySymbol: Record<string, number[]> = {};

        for (const symbol of symbols) {
          const values = Array.isArray(rawSeriesBySymbol[symbol])
            ? rawSeriesBySymbol[symbol]
                .map((value: unknown) => Number(value))
                .filter((value: number) => Number.isFinite(value))
            : [];

          if (values.length >= 2) {
            nextSeriesBySymbol[symbol] = values;
            miniHistoryCache.set(getCacheKey(range, symbol), values);
          }
        }

        if (Object.keys(nextSeriesBySymbol).length > 0) {
          setSeriesMap((current) => ({
            ...current,
            ...nextSeriesBySymbol,
          }));
        }

        const missingSymbols = Array.isArray(data?.missingSymbols)
          ? data.missingSymbols.filter((symbol: unknown) => typeof symbol === "string")
          : [];

        if (missingSymbols.length > 0 && attempt < 1) {
          retryTimer = window.setTimeout(() => {
            void loadMiniHistory(attempt + 1);
          }, 1800);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        console.error("Mini history load failed:", error);
      }
    };

    void loadMiniHistory();

    return () => {
      controller.abort();
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [apiBase, range, symbols, symbolsKey]);

  return seriesMap;
}
