export const CHART_PERIODS = [
  { value: "1W", shortLabel: "1W", label: "1 Week" },
  { value: "1M", shortLabel: "1M", label: "1 Month" },
  { value: "3M", shortLabel: "3M", label: "3 Months" },
  { value: "6M", shortLabel: "6M", label: "6 Months" },
  { value: "YTD", shortLabel: "YTD", label: "Year-to-Date" },
  { value: "1Y", shortLabel: "1Y", label: "1 Year" },
  { value: "5Y", shortLabel: "5Y", label: "5 Years" },
  { value: "ALL", shortLabel: "ALL", label: "All" },
] as const;

export type ChartPeriod = (typeof CHART_PERIODS)[number]["value"];

export function getChartPeriodLabel(period: ChartPeriod) {
  return (
    CHART_PERIODS.find((option) => option.value === period)?.label || period
  );
}
