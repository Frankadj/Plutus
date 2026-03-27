import { useEffect, useRef, useState } from "react";
import { C } from "../theme/colors";
import { getMarketStatus } from "../utils/marketStatus";

type HomeHeaderProps = {
  unreadCount: number;
};

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

function HomeHeader({ unreadCount }: HomeHeaderProps) {
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [showCountdown, setShowCountdown] = useState(false);
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

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        background: C.bg,
        paddingBottom: 16,
        zIndex: 10,
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
              fontSize: 16,
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
    </div>
  );
}

export default HomeHeader;