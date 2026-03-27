const stocks = require("../data/stocks");

function getAllStocks() {
  return stocks;
}

function getStockBySymbol(symbol) {
  return stocks.find(
    (stock) => stock.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

module.exports = {
  getAllStocks,
  getStockBySymbol,
};