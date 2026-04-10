import type { ReactNode } from "react";
import type { MarketCategoryKey } from "../utils/marketCategories";

type Props = {
  category: MarketCategoryKey;
  fallbackLabel?: string;
};

type IconSpec = {
  node: ReactNode;
  viewBox?: string;
};

const BASE_SVG_STYLE = {
  width: "100%",
  height: "100%",
  display: "block",
};

const ICON_MAP: Record<MarketCategoryKey, IconSpec> = {
  all_equities: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M6 18V11M12 18V7M18 18V9"
          stroke="#38BDF8"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <path
          d="M4.5 18.5H19.5"
          stroke="#0F172A"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
  heatmap: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <rect x="4" y="5" width="7" height="6" rx="2" fill="#F59E0B" />
        <rect x="13" y="5" width="7" height="4" rx="2" fill="#FCD34D" />
        <rect x="4" y="13" width="5" height="7" rx="2" fill="#22C55E" />
        <rect x="11" y="11" width="9" height="9" rx="2.5" fill="#38BDF8" />
      </>
    ),
  },
  gainers: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M4 16L9 11L13 15L20 8"
          stroke="#22C55E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 8H20V13"
          stroke="#22C55E"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  losers: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M4 8L9 13L13 9L20 16"
          stroke="#EF4444"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 16H20V11"
          stroke="#EF4444"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  financials: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M4 9L12 5L20 9"
          stroke="#22C55E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M5 10H19" stroke="#0F172A" strokeWidth="1.6" />
        <path d="M7 10V18M12 10V18M17 10V18" stroke="#22C55E" strokeWidth="2" />
        <path d="M4 19H20" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  basic_materials: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M12 4L19 10L12 20L5 10L12 4Z"
          fill="#FBBF24"
          stroke="#B45309"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 10H15" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  },
  consumer_goods: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M8 9H16L15 18H9L8 9Z"
          fill="#FB923C"
          stroke="#C2410C"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M10 9V7.8C10 6.81 10.81 6 11.8 6H12.2C13.19 6 14 6.81 14 7.8V9"
          stroke="#7C2D12"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  },
  technology: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <rect
          x="7"
          y="7"
          width="10"
          height="10"
          rx="2.2"
          fill="#60A5FA"
          stroke="#1D4ED8"
          strokeWidth="1.5"
        />
        <rect x="10" y="10" width="4" height="4" rx="1" fill="#DBEAFE" />
        <path d="M12 4V6M12 18V20M4 12H6M18 12H20" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  industrials: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M5 19V11L10 13V11L15 13V8L19 10V19H5Z"
          fill="#A78BFA"
          stroke="#6D28D9"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 16H9M12 16H13M16 16H17" stroke="#F5F3FF" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  health_care: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <rect x="9" y="4.5" width="6" height="15" rx="2" fill="#2DD4BF" />
        <rect x="4.5" y="9" width="15" height="6" rx="2" fill="#2DD4BF" />
        <path d="M12 6.5V17.5M6.5 12H17.5" stroke="#0F766E" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  consumer_services: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M6 10H18V18H6V10Z"
          fill="#C084FC"
          stroke="#7E22CE"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M5 10L7 6H17L19 10"
          stroke="#7E22CE"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 13H15" stroke="#FAF5FF" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  telecommunications: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path d="M12 7V18" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 18H15" stroke="#0F172A" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8.5 11.5C10.1 9.9 13.9 9.9 15.5 11.5" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M6.2 9.2C8.9 6.5 15.1 6.5 17.8 9.2" stroke="#7DD3FC" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  oil_and_gas: {
    viewBox: "0 0 24 24",
    node: (
      <>
        <path
          d="M8 6H15V18H8V6Z"
          fill="#FACC15"
          stroke="#CA8A04"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M15 9H17.2C18.19 9 19 9.81 19 10.8V15" stroke="#CA8A04" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M10 9.5H13" stroke="#92400E" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
};

function PopularListIcon({ category, fallbackLabel }: Props) {
  const icon = ICON_MAP[category];

  if (!icon) {
    return (
      <span
        aria-hidden="true"
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.3,
          color: "#111111",
          lineHeight: 1,
        }}
      >
        {fallbackLabel || "?"}
      </span>
    );
  }

  return (
    <svg
      viewBox={icon.viewBox || "0 0 24 24"}
      aria-hidden="true"
      style={BASE_SVG_STYLE}
    >
      {icon.node}
    </svg>
  );
}

export default PopularListIcon;
