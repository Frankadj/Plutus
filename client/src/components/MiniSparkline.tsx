import { C } from "../theme/colors";
import type { StockMovementTone } from "../utils/stockMovement";

type MiniSparklineProps = {
  values: number[];
  tone: StockMovementTone;
  width?: number;
  height?: number;
};

function MiniSparkline({
  values,
  tone,
  width = 84,
  height = 36,
}: MiniSparklineProps) {
  const cleanedValues = values.filter((value) => Number.isFinite(value));
  const chartValues =
    cleanedValues.length >= 2
      ? cleanedValues
      : [cleanedValues[0] ?? 0, cleanedValues[0] ?? 0];
  const padding = 3;
  const minValue = Math.min(...chartValues);
  const maxValue = Math.max(...chartValues);
  const valueRange = maxValue - minValue;
  const strokeColor =
    valueRange === 0
      ? C.sub
      : tone === "positive"
        ? C.green
        : tone === "negative"
          ? C.red
          : C.sub;
  const fillColor =
    valueRange === 0
      ? "rgba(148, 163, 184, 0.10)"
      : tone === "positive"
        ? "rgba(52, 211, 153, 0.12)"
        : tone === "negative"
          ? "rgba(248, 113, 113, 0.12)"
          : "rgba(148, 163, 184, 0.10)";

  const coordinates = chartValues.map((value, index) => {
    const x =
      padding +
      (index * (width - padding * 2)) / Math.max(1, chartValues.length - 1);
    const y =
      valueRange === 0
        ? height / 2
        : height -
          padding -
          ((value - minValue) / valueRange) * (height - padding * 2);

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const linePath = coordinates
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  const baselineY = height - padding;
  const areaPath = `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{
        display: "block",
        overflow: "visible",
      }}
    >
      <path d={areaPath} fill={fillColor} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MiniSparkline;
