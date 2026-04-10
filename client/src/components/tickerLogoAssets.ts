export type TickerLogoConfig = {
  src?: string;
  bg?: string;
  text?: string;
  label?: string;
  paddingRatio?: number;
};

const COMMON_WHITE_BG = "#FFFFFF";
const COMMON_DARK_BG = "#111111";

export const tickerLogoAssets: Record<string, TickerLogoConfig> = {
  AADS: { src: "/logos/anglogold-ashanti.svg", bg: COMMON_DARK_BG, label: "AAS" },
  AGA: { src: "/logos/anglogold-ashanti.svg", bg: COMMON_DARK_BG, label: "AGA" },
  ACCESS: {
    src: "/logos/access-bank-ghana.png",
    bg: COMMON_WHITE_BG,
    label: "ACC",
  },
  ADB: {
    src: "/logos/agricultural-development-bank.png",
    bg: COMMON_WHITE_BG,
    label: "ADB",
  },
  ALLGH: {
    src: "/logos/atlantic-lithium.webp",
    bg: "#000000",
    label: "ATL",
    paddingRatio: 0.06,
  },
  ASG: { src: "/logos/asante-gold.png", bg: COMMON_WHITE_BG, label: "ASG" },
  BOPP: { src: "/logos/benso-oil-palm.png", bg: COMMON_WHITE_BG, label: "BOPP" },
  CAL: { src: "/logos/calbank.png", bg: COMMON_WHITE_BG, label: "CAL" },
  CLYD: { src: "/logos/clydestone.png", bg: COMMON_DARK_BG, label: "CLYD" },
  CMLT: { src: "/logos/camelot-ghana.png", bg: COMMON_WHITE_BG, label: "CMLT" },
  CPC: {
    src: "/logos/cocoa-processing-company.png",
    bg: COMMON_WHITE_BG,
    label: "CPC",
  },
  DASPHARMA: {
    src: "/logos/daspharma.png",
    bg: COMMON_WHITE_BG,
    label: "DAS",
  },
  DIGICUT: { src: "/logos/digicut.png", bg: COMMON_WHITE_BG, label: "DIG" },
  EGH: {
    src: "/logos/ecobank.svg",
    bg: "#004B87",
    label: "ECO",
    paddingRatio: 0.08,
  },
  EGL: {
    src: "/logos/enterprise-group.png",
    bg: COMMON_WHITE_BG,
    label: "EGL",
  },
  ETI: {
    src: "/logos/ecobank.svg",
    bg: "#004B87",
    label: "ECO",
    paddingRatio: 0.08,
  },
  FAB: {
    src: "/logos/first-atlantic-bank.webp",
    bg: COMMON_WHITE_BG,
    label: "FAB",
  },
  FML: { src: "/logos/fan-milk.png", bg: COMMON_WHITE_BG, label: "FML" },
  GCB: { src: "/logos/gcb-bank.png", bg: COMMON_WHITE_BG, label: "GCB" },
  GGBL: { src: "/logos/guinness-ghana.png", bg: COMMON_WHITE_BG, label: "GGBL" },
  GLD: { bg: "#D4AF37", text: "#111111", label: "GLD" },
  GOIL: { src: "/logos/goil.png", bg: COMMON_WHITE_BG, label: "GOIL" },
  HORDS: { src: "/logos/hords.svg", bg: COMMON_DARK_BG, label: "HORD" },
  IIL: { src: "/logos/iil.png", bg: COMMON_WHITE_BG, label: "IIL" },
  MAC: { bg: "#0F172A", text: "#FFFFFF", label: "MAC" },
  MMH: { bg: "#0F172A", text: "#FFFFFF", label: "MMH" },
  MTNGH: { src: "/logos/mtn-ghana.svg", bg: "#FFCC00", label: "MTN" },
  RBGH: {
    src: "/logos/republic-bank-ghana.png",
    bg: COMMON_WHITE_BG,
    label: "RBGH",
  },
  SAMBA: { bg: "#C1121F", text: "#FFFFFF", label: "SAM" },
  SCB: {
    src: "/logos/standard-chartered-ghana.svg",
    bg: COMMON_WHITE_BG,
    label: "SCB",
  },
  SCBPREF: {
    src: "/logos/standard-chartered-ghana.svg",
    bg: COMMON_WHITE_BG,
    label: "SCB",
  },
  SIC: { src: "/logos/sic-insurance.png", bg: COMMON_WHITE_BG, label: "SIC" },
  SOGEGH: {
    src: "/logos/societe-generale-ghana.svg",
    bg: COMMON_WHITE_BG,
    label: "SG",
  },
  TBL: {
    src: "/logos/trust-bank.jpg",
    bg: COMMON_WHITE_BG,
    label: "TBL",
    paddingRatio: 0.06,
  },
  TLW: { src: "/logos/tullow-oil.svg", bg: COMMON_DARK_BG, label: "TLW" },
  TOTAL: {
    src: "/logos/totalenergies-ghana.svg",
    bg: COMMON_WHITE_BG,
    label: "TOT",
  },
  UNIL: {
    src: "/logos/unilever-wordmark.svg",
    bg: "#1C57A5",
    label: "UNI",
    paddingRatio: 0.08,
  },
};

export function getTickerLogoConfig(symbol: string): TickerLogoConfig {
  const safeSymbol = (symbol || "").toUpperCase().trim();

  return (
    tickerLogoAssets[safeSymbol] || {
      bg: "#2A2A2A",
      text: "#FFFFFF",
      label: safeSymbol.slice(0, 3) || "?",
    }
  );
}
