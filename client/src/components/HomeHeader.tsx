import { useEffect, useRef, useState } from "react";
import { C } from "../theme/colors";
import { getMarketStatus } from "../utils/marketStatus";
import type { IndexSummary } from "../App";
import IndexCardSkeleton from "./IndexCardSkeleton";
import useIsCompactLayout from "../hooks/useIsCompactLayout";

type HomeHeaderProps = {
  unreadCount: number;
  indices: IndexSummary[];
  indicesError: string;
  onSelectIndex: (index: IndexSummary) => void;
};

function formatIndexValue(value: number | undefined) {
  const safeValue = Number(value);
  return Number.isFinite(safeValue)
    ? new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(safeValue)
    : "--";
}

function BellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={C.text}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function HomeHeader({
  unreadCount,
  indices,
  indicesError,
  onSelectIndex,
}: HomeHeaderProps) {
  const isCompactLayout = useIsCompactLayout();
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [showCountdown, setShowCountdown] = useState(false);
  const [indexChangeMode, setIndexChangeMode] = useState<
    Record<string, "amount" | "percent">
  >({});
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMarketStatus(getMarketStatus());
    }, 60000);

    return () => {
      window.clearInterval(interval);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleTapStatus = () => {
    setShowCountdown(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setShowCountdown(false);
    }, 5000);
  };

  const toggleIndexChangeMode = (code: string) => {
    setIndexChangeMode((current) => ({
      ...current,
      [code]: current[code] === "percent" ? "amount" : "percent",
    }));
  };

  return (
    <div
      style={{
        background: C.bg,
        paddingBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          onClick={handleTapStatus}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: marketStatus.isOpen ? C.green : C.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: C.bg,
              }}
            />
          </div>

          <div
            style={{
              fontSize: isCompactLayout ? 15 : 16,
              fontWeight: 500,
              color: C.text,
            }}
          >
            {showCountdown ? marketStatus.countdownText : marketStatus.shortText}
          </div>
        </div>

        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BellIcon />
          {unreadCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: -4,
                right: -6,
                background: C.red,
                color: "#fff",
                borderRadius: 999,
                fontSize: 10,
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: isCompactLayout ? 8 : 12,
          marginTop: 10,
        }}
      >
        {["GSE-CI", "GSE-FSI"].map((code) => {
          const index = indices.find((item) => item.code === code);
          const change = Number(index?.change ?? 0);
          const changePercent = Number(index?.changePercent ?? 0);
          const hasData = Boolean(index) && Number.isFinite(Number(index?.value));
          const showSkeleton = !hasData && !indicesError;
          const positive = change >= 0;
          const changeMode = indexChangeMode[code] === "percent" ? "percent" : "amount";
          const changeText = hasData
            ? changeMode === "percent"
              ? `${positive ? "+" : "-"}${Math.abs(changePercent).toFixed(2)}%`
              : `${positive ? "+" : "-"}${Math.abs(change).toFixed(2)}`
            : indicesError || "";

          if (showSkeleton) {
            return <IndexCardSkeleton key={code} code={code} />;
          }

          return (
            <div
              key={code}
              onClick={() => {
                if (index) {
                  onSelectIndex(index);
                }
              }}
              onKeyDown={(event) => {
                if (!index) {
                  return;
                }

                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectIndex(index);
                }
              }}
              role="button"
              tabIndex={index ? 0 : -1}
              style={{
                border: `1px solid ${C.border}`,
                background: C.card,
                borderRadius: 14,
                padding: isCompactLayout ? "12px 12px" : "14px 16px",
                textAlign: "left",
                cursor: index ? "pointer" : "default",
                opacity: hasData ? 1 : 0.72,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: isCompactLayout ? 10 : 12,
                  letterSpacing: "0.02em",
                }}
              >
                {code}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: isCompactLayout ? 8 : 12,
                }}
              >
                <div
                  style={{
                    fontSize: isCompactLayout ? 18 : 20,
                    fontWeight: 600,
                    color: C.text,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatIndexValue(index?.value)}
                </div>

                {hasData ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleIndexChangeMode(code);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      fontSize: isCompactLayout ? 13 : 14,
                      fontWeight: 600,
                      color: positive ? C.green : C.red,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    {changeText}
                  </button>
                ) : (
                  <div
                    style={{
                      fontSize: isCompactLayout ? 13 : 14,
                      fontWeight: 600,
                      color: C.sub,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {changeText}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HomeHeader;
