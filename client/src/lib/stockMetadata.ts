type StockIdentity = {
  symbol?: string;
  ticker?: string;
  code?: string;
  name?: string;
  companyName?: string;
};

export const STOCK_DISPLAY_NAME_MAP: Record<string, string> = {
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

function isLikelyTickerSymbol(value: string) {
  const trimmed = String(value || "").trim();

  return /^[A-Z0-9._-]{2,12}$/.test(trimmed) && !trimmed.includes(" ");
}

export function resolveStockSymbolFromIdentity(stock: StockIdentity) {
  const explicitSymbol = String(
    stock.symbol || stock.ticker || stock.code || ""
  )
    .toUpperCase()
    .trim();

  if (explicitSymbol) {
    return explicitSymbol;
  }

  const nameAsSymbol = String(stock.name || "").toUpperCase().trim();
  return isLikelyTickerSymbol(nameAsSymbol) ? nameAsSymbol : "";
}

export function resolveStockDisplayName(stock: StockIdentity, symbol: string) {
  const preferredName = String(stock.companyName || stock.name || "").trim();
  const mappedName = STOCK_DISPLAY_NAME_MAP[symbol] || "";

  if (!preferredName) {
    return mappedName || symbol || "Unknown";
  }

  if (mappedName && preferredName.toUpperCase() === symbol) {
    return mappedName;
  }

  return preferredName;
}

export function deriveStockChangePercent(
  priceValue: number,
  changeValue: number,
  rawChangePercent: unknown
) {
  const parsedPercent = Number(rawChangePercent);
  if (Number.isFinite(parsedPercent)) {
    return parsedPercent;
  }

  const previousClose = priceValue - changeValue;
  if (!Number.isFinite(priceValue) || !Number.isFinite(changeValue) || previousClose === 0) {
    return 0;
  }

  return (changeValue / previousClose) * 100;
}
