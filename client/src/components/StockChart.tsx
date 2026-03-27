import { useState } from "react";
import { C } from "../theme/colors";

type ChartPoint = {
  date: string;
  value: number;
};

type StockChartProps = {
  history: ChartPoint[];
  positive?: boolean;
};

function StockChart({ history, positive = true }: StockChartProps) {
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
          border: `1px solid ${C.border}`,
          borderRadius: 16,
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

  return (
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        background: C.card,
        padding: 12,
      }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ height: 180, display: "block" }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * width;
          const index = Math.round((x / width) * (values.length - 1));
          setHovered(index);
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <polyline
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          points={points}
        />

        {hoveredIndex !== null && (
          <circle
            cx={(hoveredIndex / (values.length - 1)) * width}
            cy={height - ((values[hoveredIndex] - min) / range) * height}
            r="5"
            fill={lineColor}
          />
        )}
      </svg>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 12,
          color: C.sub,
        }}
      >
        <span>{cleanedHistory[0].date}</span>
        <span>{cleanedHistory[cleanedHistory.length - 1].date}</span>
      </div>

      {hoveredIndex !== null && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: C.text,
            fontWeight: 600,
          }}
        >
          {cleanedHistory[hoveredIndex].date} • ₵
          {cleanedHistory[hoveredIndex].value.toFixed(2)}
        </div>
      )}
    </div>
  );
}

export default StockChart;