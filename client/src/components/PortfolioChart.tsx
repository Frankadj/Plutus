import { useState } from "react";
import { C } from "../theme/colors";

type ChartPoint = {
  date: string;
  value: number;
};

type Props = {
  history: ChartPoint[];
};

function PortfolioChart({ history }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!history || history.length < 2) {
    return (
      <div style={{ height: 150, color: C.sub }}>
        No chart data
      </div>
    );
  }

  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 400;
  const height = 150;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ height: 150 }}
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
        stroke={C.green}
        strokeWidth="2"
        points={points}
      />

      {hovered !== null && (
        <circle
          cx={(hovered / (values.length - 1)) * width}
          cy={
            height -
            ((values[hovered] - min) / range) * height
          }
          r="4"
          fill={C.green}
        />
      )}
    </svg>
  );
}

export default PortfolioChart;