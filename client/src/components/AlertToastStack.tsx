import { C } from "../theme/colors";

export type AlertToastItem = {
  id: string;
  symbol: string;
  title: string;
  message: string;
};

type AlertToastStackProps = {
  items: AlertToastItem[];
  onDismiss: (id: string) => void;
};

function AlertToastStack({
  items,
  onDismiss,
}: AlertToastStackProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(420px, calc(100% - 24px))",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 2500,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 14px",
            borderRadius: 16,
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: `1px solid ${C.border}`,
              background: "rgba(0, 255, 80, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.green}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 17H9c-1.7 0-2.56 0-2.83-.38-.27-.38.03-1.16.62-2.72.29-.77.54-1.64.54-2.9v-.6a4.67 4.67 0 1 1 9.34 0v.6c0 1.26.25 2.13.54 2.9.59 1.56.89 2.34.62 2.72-.27.38-1.13.38-2.83.38Z" />
              <path d="M10.35 20a1.9 1.9 0 0 0 3.3 0" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: C.text,
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                marginTop: 4,
                color: C.sub,
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {item.message}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            aria-label={`Dismiss alert for ${item.symbol}`}
            style={{
              background: "none",
              border: "none",
              color: C.sub,
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.sub}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default AlertToastStack;
