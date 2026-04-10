import { C } from "../theme/colors";
import useIsCompactLayout from "../hooks/useIsCompactLayout";
import { CHART_PERIODS, type ChartPeriod } from "../utils/chartPeriods";

type ChartPeriodTabsProps = {
  period: ChartPeriod;
  onChange: (period: ChartPeriod) => void;
};

function ChartPeriodTabs({ period, onChange }: ChartPeriodTabsProps) {
  const isCompactLayout = useIsCompactLayout();

  return (
    <div
      style={{
        display: isCompactLayout ? "flex" : "grid",
        gridTemplateColumns: isCompactLayout
          ? undefined
          : `repeat(${CHART_PERIODS.length}, minmax(0, 1fr))`,
        gap: 4,
        width: "100%",
        alignItems: "stretch",
        justifyItems: isCompactLayout ? undefined : "stretch",
        overflowX: isCompactLayout ? "auto" : "visible",
        overflowY: "hidden",
        paddingBottom: isCompactLayout ? 4 : 0,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {CHART_PERIODS.map((option) => {
        const active = period === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: isCompactLayout ? "auto" : "100%",
              minWidth: 0,
              minHeight: isCompactLayout ? 34 : 30,
              boxSizing: "border-box",
              background: active ? C.green : "transparent",
              color: active ? C.textInverse : C.green,
              border: `1px solid ${active ? C.green : "transparent"}`,
              borderRadius: 12,
              padding: isCompactLayout ? "8px 10px" : "5px 2px",
              fontSize: isCompactLayout ? 13 : 12,
              fontWeight: 700,
              lineHeight: 1,
              textAlign: "center",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: isCompactLayout ? "0 0 auto" : "1 1 0",
            }}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

export default ChartPeriodTabs;
