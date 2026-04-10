import type { Stock } from "../App";
import { useMiniHistoryMap } from "../hooks/useMiniHistoryMap";
import StockCard from "./StockCard";

type StockListProps = {
  stocks: Stock[];
  apiBase: string;
  onSelect: (stock: Stock) => void;
};

function StockList({ stocks, apiBase, onSelect }: StockListProps) {
  const weeklyMiniCharts = useMiniHistoryMap({
    apiBase,
    stocks,
    range: "1W",
  });

  return (
    <div>
      {stocks.map((stock) => {
        const symbol = String(
          stock.symbol || stock.ticker || stock.code || stock.name
        )
          .toUpperCase()
          .trim();

        return (
          <StockCard
            key={symbol}
            stock={stock}
            onSelect={onSelect}
            sparklineValues={weeklyMiniCharts[symbol]}
          />
        );
      })}
    </div>
  );
}

export default StockList;
