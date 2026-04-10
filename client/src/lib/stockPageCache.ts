type CacheEnvelope<T> = {
  value: T;
  expiresAt: number;
};

const STOCK_PAGE_CACHE_PREFIX = "plutus_stock_page:";

function makeCacheKey(kind: string, symbol: string, suffix = "") {
  const safeSymbol = String(symbol || "").toUpperCase().trim();
  const safeSuffix = String(suffix || "").trim();
  return `${STOCK_PAGE_CACHE_PREFIX}${kind}:${safeSymbol}${
    safeSuffix ? `:${safeSuffix}` : ""
  }`;
}

export function readStockPageCache<T>(
  kind: string,
  symbol: string,
  suffix = ""
): T | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(makeCacheKey(kind, symbol, suffix));
    if (!raw) {
      return null;
    }

    const envelope = JSON.parse(raw) as CacheEnvelope<T> | null;
    if (
      !envelope ||
      typeof envelope !== "object" ||
      typeof envelope.expiresAt !== "number"
    ) {
      return null;
    }

    if (envelope.expiresAt <= Date.now()) {
      localStorage.removeItem(makeCacheKey(kind, symbol, suffix));
      return null;
    }

    return envelope.value ?? null;
  } catch {
    return null;
  }
}

export function writeStockPageCache<T>(
  kind: string,
  symbol: string,
  value: T,
  ttlMs: number,
  suffix = ""
) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    const safeTtlMs = Math.max(1000, Number(ttlMs) || 1000);
    const envelope: CacheEnvelope<T> = {
      value,
      expiresAt: Date.now() + safeTtlMs,
    };

    localStorage.setItem(
      makeCacheKey(kind, symbol, suffix),
      JSON.stringify(envelope)
    );
  } catch {
    // Ignore local storage write failures.
  }
}
