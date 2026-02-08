import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';
import limiter from './rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_SCRIPT = path.join(__dirname, 'fetch_stock_data.py');


// Cache duration in milliseconds
const CACHE_DURATIONS = {
    quote: 60 * 1000,
    profile2: 24 * 60 * 60 * 1000,
    'company-news': 30 * 60 * 1000,
    candle: 60 * 60 * 1000,
    'market-status': 15 * 60 * 1000,
    dividends: 24 * 60 * 60 * 1000
};

export const fetchStockData = async (req, res) => {
    // With app.use('/api/proxy', ...), req.path is the remaining path (e.g. /quote)
    // We strip the leading slash
    let endpoint = req.path.startsWith('/') ? req.path.substring(1) : req.path;

    // Normalize endpoint: client uses /stock/candle, /stock/profile2 etc.
    // Our python script expects just 'candle', 'profile2'.
    if (endpoint.startsWith('stock/')) {
        endpoint = endpoint.replace('stock/', '');
    }

    const query = req.query; // e.g. { symbol: 'AAPL', resolution: 'D' ... }

    // Validate endpoint
    if (!endpoint) {
        return res.status(400).json({ error: 'No endpoint specified' });
    }

    // Map query params to arguments for python script
    // Client uses 'symbol' but we used 'ticker' in our script naming, let's normalize
    const ticker = query.symbol || query.ticker;

    // Debug logging
    console.log(`[Proxy Debug] Path: ${req.path}, Endpoint: ${endpoint}, Ticker: ${ticker}`);

    // News and market-status endpoints can work without a specific ticker
    if (!ticker && endpoint !== 'news' && endpoint !== 'market-status' && endpoint !== 'company-news' && endpoint !== 'search') {
        return res.status(400).json({ error: 'Symbol/Ticker is required' });
    }

    try {
        // Build Cache Key
        // Exclude 'noCache' from the cache key so that a forced refresh updates the same key
        const queryString = Object.keys(query)
            .filter(k => k !== 'noCache' && k !== 'forceRefresh')
            .sort()
            .map(k => `${k}=${query[k]}`)
            .join('&');
        const cacheKey = `${endpoint}?${queryString}`;

        // 1. Check Cache
        const cached = await new Promise((resolve, reject) => {
            if (query.forceRefresh === 'true') {
                console.log(`[CACHE BYPASS] ${cacheKey} (Force Refresh)`);
                resolve(null);
                return;
            }
            if (query.noCache === 'true') {
                console.log(`[CACHE BYPASS] ${cacheKey} (noCache)`);
                resolve(null);
                return;
            }

            db.get('SELECT * FROM cache WHERE key = ?', [cacheKey], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (cached) {
            const now = Date.now();
            if (cached.expiry > now) {
                console.log(`[CACHE HIT] ${cacheKey}`);
                const parsedData = JSON.parse(cached.data);

                // Check if data is wrapped with fetchedAt
                let responseData = parsedData;
                let fetchedAt = now; // Fallback if not stored

                if (parsedData && parsedData._metadata && parsedData._metadata.fetchedAt) {
                    responseData = parsedData.value;
                    fetchedAt = parsedData._metadata.fetchedAt;
                }

                res.setHeader('X-Cache-Hit', 'true');
                res.setHeader('X-Fetched-At', new Date(fetchedAt).toISOString());
                return res.json(responseData);
            } else {
                console.log(`[CACHE EXPIRED] ${cacheKey}`);
                db.run('DELETE FROM cache WHERE key = ?', [cacheKey]);
            }
        } else {
            console.log(`[CACHE MISS] ${cacheKey}`);
        }
        res.setHeader('X-Cache-Hit', 'false');


        // 2. Fetch from Python Script (yfinance) - Throttled
        // Determine Priority
        // High priority: search, quote (immediate user interaction)
        // Normal priority: candles, news, profile (bulk loading)
        const priority = (endpoint === 'search' || endpoint === 'quote') ? 'high' : 'normal';

        const result = await limiter.enqueue(() => {
            return new Promise((resolve, reject) => {
                const safeTicker = ticker || 'null';
                const args = [PYTHON_SCRIPT, endpoint, safeTicker];
                for (const [key, value] of Object.entries(query)) {
                    if (key !== 'symbol' && key !== 'ticker' && key !== 'forceRefresh' && key !== 'noCache') {
                        args.push(`${key}=${value}`);
                    }
                }

                // console.log(`[Proxy] Spawning Python: ${args.join(' ')}`);

                const pythonProcess = spawn('python', args);

                let dataString = '';
                let errorString = '';

                pythonProcess.stdout.on('data', (data) => {
                    dataString += data.toString();
                });

                pythonProcess.stderr.on('data', (data) => {
                    errorString += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`Python script exited with code ${code}: ${errorString}`);
                        reject(new Error('Failed to fetch data from yfinance provider'));
                        return;
                    }

                    try {
                        const parsed = JSON.parse(dataString);
                        if (parsed.error) {
                            console.error(`Python script returned error: ${parsed.error}`);
                            reject(new Error(parsed.error));
                            return;
                        }
                        resolve(parsed);
                    } catch (parseError) {
                        console.error('Error parsing Python output:', parseError, dataString);
                        reject(new Error('Invalid response from data provider'));
                    }
                });
            });
        }, priority);

        const fetchTime = Date.now();
        res.setHeader('X-Fetched-At', new Date(fetchTime).toISOString());

        // 3. Store in Cache
        let duration = 60 * 1000; // Default 1 min
        for (const key in CACHE_DURATIONS) {
            if (endpoint.includes(key)) {
                duration = CACHE_DURATIONS[key];
                break;
            }
        }

        // Ensure minimum 1 hour cache unless specifically shorter (e.g. maybe quote? User said "All cache data will be considered valid and recent for at least one hour")
        // But code has quote: 60*1000. I should honor user request "All cache data will be considered valid for at least one hour".
        // Wait, user said "All cache data will be considered valid and recent for at least one hour".
        // This implies I should change CACHE_DURATIONS or override here.
        // Let's ensure duration is at least 1 hour (3600000 ms).
        if (duration < 3600000) {
            duration = 3600000;
        }

        const expiry = Date.now() + duration;

        // Wrap data
        const cacheObject = {
            value: result,
            _metadata: {
                fetchedAt: fetchTime
            }
        };

        db.run('INSERT OR REPLACE INTO cache (key, data, expiry) VALUES (?, ?, ?)',
            [cacheKey, JSON.stringify(cacheObject), expiry],
            (err) => {
                if (err) console.error('Error writing to cache:', err);
            }
        );

        res.json(result);

    } catch (error) {
        console.error(`Proxy Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};


