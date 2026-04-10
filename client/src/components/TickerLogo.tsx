import { useEffect, useState } from "react";
import { C } from "../theme/colors";
import { getTickerLogoConfig } from "./tickerLogoAssets";

type TickerLogoProps = {
  symbol: string;
  size?: number;
};

function TickerLogo({ symbol, size = 42 }: TickerLogoProps) {
  const safeSymbol = (symbol || "").toUpperCase().trim();
  const config = getTickerLogoConfig(safeSymbol);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [safeSymbol, config.src]);

  const label = config.label || safeSymbol.slice(0, 3) || "?";
  const paddingRatio = config.paddingRatio ?? 0.12;
  const padding = Math.max(2, Math.round(size * paddingRatio));
  const showImage = Boolean(config.src) && !imageFailed;

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
          src={config.src}
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
