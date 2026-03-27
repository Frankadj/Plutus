import { C } from "../theme/colors";

type TickerLogoProps = {
  symbol: string;
  size?: number;
};

const logoMap: Record<string, { bg: string; text: string; label?: string }> = {
  MTNGH: { bg: "#FFCC00", text: "#000000", label: "MTN" },
  GCB: { bg: "#1D4ED8", text: "#FFFFFF", label: "GCB" },
  EGH: { bg: "#DC2626", text: "#FFFFFF", label: "EGH" },
  GOIL: { bg: "#16A34A", text: "#FFFFFF", label: "GOIL" },
};

function TickerLogo({ symbol, size = 42 }: TickerLogoProps) {
  const safeSymbol = (symbol || "").toUpperCase().trim();

  const config = logoMap[safeSymbol] || {
    bg: "#2A2A2A",
    text: "#FFFFFF",
    label: safeSymbol.slice(0, 2) || "?",
  };

  const label = config.label || safeSymbol.slice(0, 2) || "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: 12,
        backgroundColor: config.bg,
        color: config.text,
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
      {label}
    </div>
  );
}

export default TickerLogo;