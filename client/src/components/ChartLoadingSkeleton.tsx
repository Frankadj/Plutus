import { C } from "../theme/colors";

type ChartLoadingSkeletonProps = {
  height?: number;
  rounded?: number;
};

function ChartLoadingSkeleton({
  height = 214,
  rounded = 18,
}: ChartLoadingSkeletonProps) {
  return (
    <div
      className="chart-skeleton"
      style={{
        position: "relative",
        height,
        borderRadius: rounded,
        overflow: "hidden",
        background: C.card,
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "18px 18px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 400 130"
            preserveAspectRatio="none"
            style={{
              display: "block",
              opacity: 0.9,
            }}
          >
            <path
              d="M0 112 C42 108, 68 92, 92 96 C126 102, 150 58, 184 52 C218 46, 238 88, 270 78 C302 68, 326 18, 360 28 C380 34, 392 26, 400 18"
              fill="none"
              stroke="rgba(142, 142, 147, 0.22)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M0 118 C34 114, 64 106, 94 100 C132 92, 158 82, 186 90 C220 100, 246 70, 278 64 C308 58, 340 74, 372 52 C386 42, 394 36, 400 30"
              fill="none"
              stroke="rgba(0, 255, 80, 0.12)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div
            className="chart-skeleton-shimmer"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0.18) 52%, rgba(255,255,255,0.08) 56%, rgba(255,255,255,0) 100%)",
              transform: "translateX(-100%)",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 10,
            marginTop: 14,
          }}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(142, 142, 147, 0.14)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChartLoadingSkeleton;
