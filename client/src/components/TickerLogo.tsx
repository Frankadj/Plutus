import { useEffect, useState } from "react";
import { getApiBase } from "../lib/api";
import { C } from "../theme/colors";
import { getTickerLogoConfig } from "./tickerLogoAssets";

type TickerLogoProps = {
  symbol: string;
  size?: number;
  logoUrl?: string;
};

const dynamicLogoCache = new Map<string, string>();
const dynamicLogoPending = new Map<string, Promise<string>>();

function isGenericLogoUrl(url: string) {
  const normalizedUrl = String(url || "").trim().toLowerCase();

  return normalizedUrl.includes("google.com/s2/favicons");
}

async function fetchDynamicLogo(symbol: string, apiBase: string) {
  if (!symbol) {
    return "";
  }

  if (dynamicLogoCache.has(symbol)) {
    return dynamicLogoCache.get(symbol) || "";
  }

  if (dynamicLogoPending.has(symbol)) {
    return dynamicLogoPending.get(symbol) || Promise.resolve("");
  }

  const request = fetch(
    `${apiBase}/api/stocks/${encodeURIComponent(symbol)}/branding`
  )
    .then(async (response) => {
      if (!response.ok) {
        return "";
      }

      const data = await response.json();
      return typeof data?.logoUrl === "string" ? data.logoUrl.trim() : "";
    })
    .catch(() => "")
    .then((resolvedLogoUrl) => {
      dynamicLogoCache.set(symbol, resolvedLogoUrl);
      dynamicLogoPending.delete(symbol);
      return resolvedLogoUrl;
    });

  dynamicLogoPending.set(symbol, request);
  return request;
}

function TickerLogo({ symbol, size = 42, logoUrl = "" }: TickerLogoProps) {
  const apiBase = getApiBase();
  const safeSymbol = (symbol || "").toUpperCase().trim();
  const config = getTickerLogoConfig(safeSymbol);
  const providedLogoUrl = String(logoUrl || "").trim();
  const [imageFailed, setImageFailed] = useState(false);
  const [dynamicLogoUrl, setDynamicLogoUrl] = useState(
    dynamicLogoCache.get(safeSymbol) || ""
  );
  const shouldFetchDynamicLogo =
    Boolean(safeSymbol) &&
    !config.src &&
    (!providedLogoUrl || isGenericLogoUrl(providedLogoUrl) || imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [safeSymbol, config.src, providedLogoUrl, dynamicLogoUrl]);

  useEffect(() => {
    let cancelled = false;

    if (!shouldFetchDynamicLogo) {
      setDynamicLogoUrl("");
      return () => {
        cancelled = true;
      };
    }

    if (dynamicLogoCache.has(safeSymbol)) {
      setDynamicLogoUrl(dynamicLogoCache.get(safeSymbol) || "");
      return () => {
        cancelled = true;
      };
    }

    setDynamicLogoUrl("");
    void fetchDynamicLogo(safeSymbol, apiBase).then((resolvedLogoUrl) => {
      if (!cancelled) {
        setDynamicLogoUrl(resolvedLogoUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [apiBase, safeSymbol, shouldFetchDynamicLogo]);

  const label = config.label || safeSymbol.slice(0, 3) || "?";
  const paddingRatio = config.paddingRatio ?? 0.12;
  const padding = Math.max(2, Math.round(size * paddingRatio));
  const resolvedLogoUrl = config.src
    ? config.src
    : shouldFetchDynamicLogo
      ? dynamicLogoUrl || (imageFailed ? "" : providedLogoUrl)
      : providedLogoUrl || dynamicLogoUrl;
  const showImage = Boolean(resolvedLogoUrl) && !imageFailed;

  return (
    <div
      aria-label={safeSymbol || "Ticker logo"}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: 12,
        backgroundColor: showImage ? config.bg || "#FFFFFF" : config.bg || "#2A2A2A",
        color: config.text || C.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: safeSymbol.length > 4 ? size * 0.22 : size * 0.28,
        lineHeight: 1,
        flexShrink: 0,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <img
          src={resolvedLogoUrl}
          alt={`${safeSymbol} logo`}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding,
            display: "block",
            boxSizing: "border-box",
            backgroundColor: config.bg || "transparent",
          }}
        />
      ) : (
        label
      )}
    </div>
  );
}

export default TickerLogo;
