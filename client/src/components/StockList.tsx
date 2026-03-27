import StockCard from "./StockCard";

type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

type StockListProps = {
  stocks: Stock[];
  onSelect: (stock: Stock) => void;
};

function StockList({ stocks, onSelect }: StockListProps) {
  return (
    <div>
      {stocks.map((stock) => (
        <StockCard
          key={stock.symbol}
          stock={stock}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default StockList;