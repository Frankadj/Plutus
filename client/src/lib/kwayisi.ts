const KWAYISI_API_BASE = "https://dev.kwayisi.org/apis/gse";

export function shouldUseDirectKwayisiBrowserData() {
  return import.meta.env.PROD;
}

export function getKwayisiLiveUrl() {
  return `${KWAYISI_API_BASE}/live`;
}

export function getKwayisiEquityUrl(symbol: string) {
  const cleanSymbol = String(symbol || "").toUpperCase().trim();
  return `${KWAYISI_API_BASE}/equities/${encodeURIComponent(cleanSymbol)}`;
}
