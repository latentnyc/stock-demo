import sys
import json
import yfinance as yf
from datetime import datetime
import time
import requests # Import at top

# Common mappings for better UX - Global Scope
TICKER_MAP = {
    'APPLE': 'AAPL',
    'MICROSOFT': 'MSFT',
    'GOOGLE': 'GOOGL',
    'AMAZON': 'AMZN',
    'TESLA': 'TSLA',
    'META': 'META',
    'FACEBOOK': 'META',
    'NVIDIA': 'NVDA',
    'NETFLIX': 'NFLX',
    'AMD': 'AMD',
    'INTEL': 'INTC'
}

def fetch_data(endpoint, ticker, **kwargs):
    try:
        if not ticker:
             return {"error": "Ticker is required"}
        
        # Apply mapping globally
        if ticker.upper() in TICKER_MAP:
            ticker = TICKER_MAP[ticker.upper()]

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

        elif endpoint == 'market-status':
            from datetime import timezone, timedelta
            import datetime as dt

            # Default to closed
            is_open = False
            exchange = "US"
            tz = "ET"
            market_state = "CLOSED"

            # Try to fetch from Yahoo Finance using a major index
            # ^IXIC (Nasdaq Composite) is a good proxy for overall US market status
            try:
                market_ticker = yf.Ticker("^IXIC")
                info = market_ticker.info
                market_state = info.get('marketState', 'CLOSED').upper()
                
                if market_state == 'REGULAR':
                    is_open = True
                
                exchange = info.get('exchange', 'US')
                tz = info.get('timeZoneShortName', 'ET')
            except Exception as e:
                print(f"Market status fetch failed: {e}", file=sys.stderr)

            # Calculate next open/close
            # Use UTC and offset for simplicity if pytz is missing
            # Using standard datetime.timezone if available
            now_utc = datetime.now(timezone.utc)
            
            # Simple ET approximation (UTC-5 standard, UTC-4 DST)
            # Currently February -> Standard Time (UTC-5)
            # Ideally we use pytz
            try:
                import pytz
                et_tz = pytz.timezone('US/Eastern')
                now_et = now_utc.astimezone(et_tz)
            except ImportError:
                # Fallback to fixed offset. Feb is Winter -> UTC-5
                offset = timedelta(hours=-5)
                now_et = now_utc + offset

            # Market Hours: 9:30 - 16:00 ET, Mon-Fri
            weekday = now_et.weekday() # 0=Mon, 6=Sun
            
            today_open = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
            today_close = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
            
            next_open_str = "Unknown"
            next_close_str = "Unknown"
            
            # Logic
            if is_open:
                # If currently open, next event is close at 16:00 today
                # But allow for extended hours if market_state says extended
                if market_state in ['POST', 'POSTPOST']:
                    is_open = False # Logic override if we want to show 'Closed' for regular trading
                    # But if yfinance says REGULAR, it is open.
                
                next_close_str = today_close.strftime("%I:%M %p ET")
                next_open_str = "Market is Open" 
            
            # Re-evaluate is_open based on market_state if provided, otherwise time fallback
            # (We keep is_open from yfinance as truth, but if it failed, we might use time)
            
            if not is_open:
                # If closed, find next open
                candidate = now_et
                found = False
                days_added = 0
                
                # If today is weekday and before 9:30, it opens today
                if weekday < 5 and now_et < today_open:
                    next_open_dt = today_open
                    found = True
                else:
                    # Start checking from tomorrow
                    candidate = candidate + timedelta(days=1)
                    days_added += 1
                    while not found and days_added < 10: 
                        w = candidate.weekday()
                        if w < 5: # Mon-Fri
                            next_open_dt = candidate.replace(hour=9, minute=30, second=0, microsecond=0)
                            found = True
                        else:
                            candidate = candidate + timedelta(days=1)
                            days_added += 1
                
                if found:
                    day_diff = (next_open_dt.date() - now_et.date()).days
                    
                    if day_diff == 0:
                        day_str = "Today"
                    elif day_diff == 1:
                        day_str = "Tomorrow"
                    else:
                        day_str = next_open_dt.strftime("%A, %b %d")
                        
                    next_open_str = f"{day_str} at {next_open_dt.strftime('%I:%M %p')} ET"

            return {
                "isOpen": is_open,
                "status": market_state,
                "nextOpen": next_open_str,
                "nextClose": next_close_str, 
                "exchange": exchange,
                "timezone": tz,
                "t": int(time.time()),
                "source": "Yahoo Finance"
            }

        elif endpoint == 'search':
            # yfinance doesn't have a direct search method on the Ticker object that returns a list.
            # However, we can just return the query as a single result if it looks like a ticker,
            # or try to fetch info to validate.
            # For now, to satisfy the requirement "Ensure a slot is always available for... user search",
            # we will return a basic structure. 
            # Real implementation might need a different library or scraping, but let's at least not error.
            query = kwargs.get('q', '')
            results = []
            
            upper_query = query.upper()
            
            # If mapped (handled globally, but we want to show it explicitly as a result)
            if upper_query in TICKER_MAP:
                ticker = TICKER_MAP[upper_query]
                results.append({
                    "description": f"{query} (Mapped)",
                    "displaySymbol": ticker,
                    "symbol": ticker,
                    "type": "Common Stock"
                })
            
            # If query length is decent, try Yahoo Finance Search API
            if query and len(query) > 1:
                try:
                    import requests
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}"
                    response = requests.get(url, headers=headers, timeout=5)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if 'quotes' in data:
                            for quote in data['quotes']:
                                # Filter only equity/etf to reduce noise?
                                # quoteType: EQUITY, ETF, MUTUALFUND, INDEX, CURRENCY, CRYPTOCURRENCY
                                # For now, allow most, but prioritize logic if needed.
                                
                                # Skip if no symbol
                                if 'symbol' not in quote:
                                    continue
                                
                                results.append({
                                    "description": quote.get('longname', quote.get('shortname', quote['symbol'])),
                                    "displaySymbol": quote['symbol'],
                                    "symbol": quote['symbol'],
                                    "type": quote.get('quoteType', 'Unknown')
                                })
                except Exception as e:
                    # Fallback or silent fail
                    print(f"Search API failed: {str(e)}", file=sys.stderr)
                    pass

            # Depuplicate by symbol
            seen = set()
            unique_results = []
            for r in results:
                if r['symbol'] not in seen:
                    seen.add(r['symbol'])
                    unique_results.append(r)

            return {"count": len(unique_results), "result": unique_results}

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
