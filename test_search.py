
import yfinance as yf
import sys

def test_search(query):
    print(f"Testing query: {query}")
    try:
        t = yf.Ticker(query)
        print(f"Ticker.info (partial): {t.info.get('symbol')}, {t.info.get('longName')}")
    except Exception as e:
        print(f"Ticker object failed: {e}")

    # Is there a search method?
    # yfinance doesn't expose a public search API easily.
    # We might have to rely on the user typing the ticker.
    
if __name__ == "__main__":
    test_search("Apple")
    test_search("AAPL")
