import { C } from "../theme/colors";

type ChartRefreshOverlayProps = {
  rounded?: number;
};

function ChartRefreshOverlay({
  rounded = 18,
}: ChartRefreshOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: rounded,
        overflow: "hidden",
        pointerEvents: "none",
        background: "rgba(0, 0, 0, 0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "18px 18px 24px",
          borderRadius: 14,
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <div
          className="chart-skeleton-shimmer"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 46%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.05) 54%, rgba(255,255,255,0) 100%)",
            transform: "translateX(-100%)",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 14,
          left: 18,
          width: 112,
          height: 10,
          borderRadius: 999,
          background: "rgba(142, 142, 147, 0.18)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `1px solid ${C.border}`,
          borderRadius: rounded,
        }}
      />
    </div>
  );
}

export default ChartRefreshOverlay;
