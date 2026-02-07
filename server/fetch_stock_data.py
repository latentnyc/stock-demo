import sys
import json
import yfinance as yf
from datetime import datetime
import time

def fetch_data(endpoint, ticker, **kwargs):
    try:
        if not ticker:
             return {"error": "Ticker is required"}
        
        stock = yf.Ticker(ticker)
        
        # Debug: print news to stderr
        if endpoint == 'news' or endpoint == 'company-news':
             try:
                 print(json.dumps(stock.news, default=str), file=sys.stderr)
             except:
                 pass
        
        if endpoint == 'quote':
            # Fast info or history for current price
            # External API doesn't have a direct 'quote' endpoint like some providers, 
            # but info or fast_info usually contains current price.
            # However, for reliability, fetch 1d history.
            try:
                history = stock.history(period="1d", interval="1m")
            except Exception as e:
                return {"error": f"Failed to fetch history: {str(e)}"}
                
            if history.empty:
                # Try fetching info as backup
                info = stock.info
                if 'currentPrice' in info:
                     return {
                        "c": info['currentPrice'],
                        "h": info.get('dayHigh', 0),
                        "l": info.get('dayLow', 0),
                        "o": info.get('open', 0),
                        "pc": info.get('previousClose', 0),
                        "t": int(time.time())
                     }
                return {"error": "No data found for ticker"}
            
            # Get the latest row
            latest = history.iloc[-1]
            # Previous close is tricky with history alone if market is open/closed. 
            # Ideally fetch info for previousClose.
            info = stock.info
            prev_close = info.get('previousClose', latest['Close'])
            
            # Calculate change and percent change
            change = float(latest['Close']) - float(prev_close)
            percent_change = (change / float(prev_close)) * 100 if prev_close != 0 else 0

            return {
                "c": float(latest['Close']),
                "d": change,
                "dp": percent_change,
                "h": float(latest['High']),
                "l": float(latest['Low']),
                "o": float(latest['Open']),
                "pc": float(prev_close),
                "t": int(latest.name.timestamp()) 
            }

        elif endpoint == 'profile2':
            info = stock.info
            return {
                "name": info.get('longName'),
                "ticker": info.get('symbol'),
                "logo": info.get('logo_url', ''), # yfinance often misses logo
                "weburl": info.get('website'),
                "industry": info.get('industry'),
                "currency": info.get('currency'),
                # Add more fields if needed by frontend
            }

        elif endpoint == 'company-news' or endpoint == 'news':
             # yfinance returns news as a list of dicts. 
             # Structure changed recently: item['content']['title'], etc.
             
             if endpoint == 'news':
                # General market news logic
                category = kwargs.get('category', 'general')
                news_ticker = "^GSPC" 
                if ticker and ticker != 'null' and ticker != 'undefined':
                     news_ticker = ticker
                stock = yf.Ticker(news_ticker)
             
             news_list = stock.news
             formatted_news = []
             
             for n in news_list:
                 # Check if new structure (nested in 'content') or old structure
                 item = n
                 if 'content' in n:
                     item = n['content']
                 
                 # Extract fields
                 title = item.get('title', item.get('headline', ''))
                 
                 # Date handling
                 # displayTime or pubDate are ISO strings in new structure: "2026-02-07T17:27:03Z"
                 # providerPublishTime is int timestamp in old structure
                 pub_date = item.get('pubDate', item.get('providerPublishTime', 0))
                 timestamp = 0
                 if isinstance(pub_date, str):
                     try:
                         # Handle Z at end if present
                         if pub_date.endswith('Z'):
                             dt = datetime.strptime(pub_date, "%Y-%m-%dT%H:%M:%SZ")
                         else:
                             dt = datetime.fromisoformat(pub_date)
                         timestamp = int(dt.timestamp())
                     except:
                         timestamp = int(time.time()) # Fallback
                 else:
                     timestamp = int(pub_date)

                 # URL
                 url = item.get('canonicalUrl', {}).get('url') if isinstance(item.get('canonicalUrl'), dict) else item.get('clickThroughUrl', {}).get('url')
                 if not url:
                     url = item.get('link')
                 
                 # Image
                 image_url = ''
                 thumb = item.get('thumbnail')
                 if thumb and isinstance(thumb, dict):
                     res = thumb.get('resolutions')
                     if res and len(res) > 0:
                         image_url = res[0].get('url')

                 # Source
                 provider = item.get('provider')
                 source = provider.get('displayName') if isinstance(provider, dict) else item.get('publisher')

                 formatted_news.append({
                     "category": "company" if endpoint == 'company-news' else "general",
                     "datetime": timestamp,
                     "headline": title,
                     "id": item.get('id', n.get('uuid')),
                     "image": image_url,
                     "related": ticker if ticker and ticker != 'null' else "^GSPC",
                     "source": source or "Yahoo Finance",
                     "summary": item.get('summary', ''),
                     "url": url
                 })

             return formatted_news

        elif endpoint == 'candle':
            # kwargs: resolution, from, to
            # Map Client resolution to yfinance interval
            # 1, 5, 15, 30, 60, D, W, M
            resolution_map = {
                '1': '1m', '5': '5m', '15': '15m', '30': '30m', '60': '60m', 
                'D': '1d', 'W': '1wk', 'M': '1mo'
            }
            res_arg = kwargs.get('resolution', 'D')
            interval = resolution_map.get(res_arg, '1d')
            
            start_ts = int(kwargs.get('from', 0))
            end_ts = int(kwargs.get('to', int(time.time())))
            
            start_date = datetime.fromtimestamp(start_ts).strftime('%Y-%m-%d')
            end_date = datetime.fromtimestamp(end_ts).strftime('%Y-%m-%d')
            
            # yfinance history handles dates somewhat loosely, let's just try
            try:
                history = stock.history(interval=interval, start=start_date, end=end_date)
            except Exception as e:
                # Fallback to period if dates fail
                 history = stock.history(period="1mo", interval=interval)

            if history.empty:
                 return {"s": "no_data"}
            
            return {
                "c": history['Close'].tolist(),
                "h": history['High'].tolist(),
                "l": history['Low'].tolist(),
                "o": history['Open'].tolist(),
                "s": "ok",
                "t": [int(t.timestamp()) for t in history.index],
                "v": history['Volume'].tolist()
            }
        


        elif endpoint == 'dividends':
            try:
                # 1. Get info for basic dividend stats
                info = stock.info
                
                # 2. Get history of dividends for growth calc
                dividends = stock.dividends
                
                yield_val = info.get('dividendYield', 0)
                rate_val = info.get('dividendRate', 0)
                
                last_payment_date = None
                last_payment_amount = 0
                upcoming_payment_date = info.get('exDividendDate', None) # Often used as proxy if future
                
                # Analyze dividend history if available
                growth = None
                if not dividends.empty:
                    # Sort by date
                    dividends = dividends.sort_index()
                    
                    if len(dividends) > 0:
                        last_payment_amount = float(dividends.iloc[-1])
                        last_payment_date = int(dividends.index[-1].timestamp())
                        
                    # Calculate 1yr growth if enough data
                    # Look back 1 year
                    if len(dividends) >= 2:
                         # Simple growth: (Latest - YearAgo) / YearAgo
                         # Or CAGR. Let's do simple latest vs 1 year ago (approx 4 payments ago for quarterly)
                         # A better approx for 'growth' might be checking the sum of last 12 months vs previous 12 months
                         pass # Keep it simple for now, maybe just return raw data or basic stats

                return {
                    "yield": yield_val,
                    "rate": rate_val,
                    "lastPaymentDate": last_payment_date,
                    "lastPaymentAmount": last_payment_amount,
                    "upcomingPaymentDate": upcoming_payment_date,
                    "currency": info.get('currency', 'USD')
                }
            except Exception as e:
                return {"error": f"Failed to fetch dividends: {str(e)}"}

        else:
            return {"error": f"Unknown endpoint: {endpoint}"}

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Just print usage
        print(json.dumps({"error": "Usage: fetch_stock_data.py <endpoint> <ticker> [args...]"}));
        sys.exit(1)

    endpoint_arg = sys.argv[1]
    ticker_arg = sys.argv[2]
    
    # Parse remaining args 
    # They come in as key=value pair strings in the argv list
    kwargs_parsed = {}
    for arg in sys.argv[3:]:
        if '=' in arg:
            k, v = arg.split('=', 1)
            kwargs_parsed[k] = v
            
    result_data = fetch_data(endpoint_arg, ticker_arg, **kwargs_parsed)
    print(json.dumps(result_data))
