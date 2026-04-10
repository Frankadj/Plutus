import { useState } from "react";
import { C } from "../theme/colors";

type ChartPoint = {
  date: string;
  value: number;
};

type StockChartProps = {
  history: ChartPoint[];
  positive?: boolean;
  onHoverChange?: (point: ChartPoint | null) => void;
};

const chartDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const chartDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatChartDate(date: string) {
  const hasTime = date.includes("T");
  const parsed = hasTime ? new Date(date) : new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    const retry = new Date(date);
    if (Number.isNaN(retry.getTime())) {
      return date;
    }

    return hasTime
      ? chartDateTimeFormatter.format(retry)
      : chartDateFormatter.format(retry);
  }

  return hasTime
    ? chartDateTimeFormatter.format(parsed)
    : chartDateFormatter.format(parsed);
}

function StockChart({
  history,
  positive = true,
  onHoverChange,
}: StockChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const cleanedHistory = (history || []).filter(
    (item) =>
      item &&
      typeof item.date === "string" &&
      typeof item.value === "number" &&
      !Number.isNaN(item.value)
  );

  if (cleanedHistory.length < 2) {
    return (
      <div
        style={{
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.sub,
          background: C.card,
        }}
      >
        Not enough history yet
      </div>
    );
  }

  const values = cleanedHistory.map((h) => h.value);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;

  const width = 400;
  const height = 180;
  const lineColor = positive ? C.green : C.red;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const hoveredIndex =
    hovered !== null
      ? Math.max(0, Math.min(cleanedHistory.length - 1, hovered))
      : null;
  const hoveredX =
    hoveredIndex !== null
      ? (hoveredIndex / (values.length - 1)) * width
      : null;
  const hoveredY =
    hoveredIndex !== null
      ? height - ((values[hoveredIndex] - min) / range) * height
      : null;
  const hoveredDate =
    hoveredIndex !== null
      ? formatChartDate(cleanedHistory[hoveredIndex].date)
      : "";
  const tooltipWidth =
    hoveredDate.length > 0 ? Math.min(240, hoveredDate.length * 7.2 + 22) : 0;
  const tooltipX =
    hoveredX !== null
      ? Math.max(10, Math.min(width - tooltipWidth - 10, hoveredX - tooltipWidth / 2))
      : 0;

  const updateHovered = (
    clientX: number,
    rect: DOMRect,
    pointerId?: number,
    target?: EventTarget | null
  ) => {
    const x = ((clientX - rect.left) / rect.width) * width;
    const index = Math.max(
      0,
      Math.min(values.length - 1, Math.round((x / width) * (values.length - 1)))
    );

    setHovered(index);
    onHoverChange?.(cleanedHistory[index] || null);

    if (
      typeof pointerId === "number" &&
      target &&
      "setPointerCapture" in target &&
      typeof target.setPointerCapture === "function"
    ) {
      target.setPointerCapture(pointerId);
    }
  };

  return (
    <div
      style={{
        background: C.card,
        padding: "12px 0 0",
      }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height + 34}`}
        preserveAspectRatio="none"
        style={{ height: 214, display: "block", overflow: "visible", touchAction: "none" }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          updateHovered(e.clientX, rect, e.pointerId, e.currentTarget);
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          updateHovered(e.clientX, rect);
        }}
        onPointerLeave={() => {
          setHovered(null);
          onHoverChange?.(null);
        }}
        onPointerUp={() => {
          setHovered(null);
          onHoverChange?.(null);
        }}
        onPointerCancel={() => {
          setHovered(null);
          onHoverChange?.(null);
        }}
      >
        {hoveredX !== null && hoveredY !== null ? (
          <>
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={28}
              y2={height + 28}
              stroke={C.sub}
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.75"
            />

            <g transform={`translate(${tooltipX}, 0)`}>
              <rect
                x="0"
                y="0"
                width={tooltipWidth}
                height="24"
                rx="12"
                fill={C.card}
                stroke={C.border}
              />
              <text
                x={tooltipWidth / 2}
                y="16"
                textAnchor="middle"
                fill={C.text}
                fontSize="11"
                fontWeight="700"
                fontFamily="Arial, sans-serif"
              >
                {hoveredDate}
              </text>
            </g>
          </>
        ) : null}

        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          points={points}
          transform="translate(0 28)"
        />

        {hoveredX !== null && hoveredY !== null ? (
          <circle
            cx={hoveredX}
            cy={hoveredY + 28}
            r="5"
            fill={lineColor}
            stroke={C.bg}
            strokeWidth="2"
          />
        ) : null}
      </svg>
    </div>
  );
}

export default StockChart;
