import yfinance as yf
import json

ticker = "CAT"
stock = yf.Ticker(ticker)
info = stock.info

print(json.dumps({
    "dividendYield": info.get('dividendYield'),
    "dividendRate": info.get('dividendRate'),
    "trailingAnnualDividendYield": info.get('trailingAnnualDividendYield'),
    "trailingAnnualDividendRate": info.get('trailingAnnualDividendRate'),
    "currentPrice": info.get('currentPrice'),
    "previousClose": info.get('previousClose')
}, indent=2))
