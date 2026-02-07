import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

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

    // News endpoint can work without a specific ticker (defaults to market news)
    if (!ticker && endpoint !== 'news') {
        return res.status(400).json({ error: 'Symbol/Ticker is required' });
    }

    try {
        // Build Cache Key
        const queryString = Object.keys(query)
            .sort()
            .map(k => `${k}=${query[k]}`)
            .join('&');
        const cacheKey = `${endpoint}?${queryString}`;

        // 1. Check Cache
        const cached = await new Promise((resolve, reject) => {
            if (query.noCache === 'true') {
                console.log(`[CACHE BYPASS] ${cacheKey}`);
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
                return res.json(JSON.parse(cached.data));
            } else {
                console.log(`[CACHE EXPIRED] ${cacheKey}`);
                db.run('DELETE FROM cache WHERE key = ?', [cacheKey]);
            }
        } else {
            console.log(`[CACHE MISS] ${cacheKey}`);
        }

        // 2. Fetch from Python Script (yfinance)
        // Args: endpoint ticker [key=value]...
        // For news without ticker, pass a placeholder or handle in python
        const safeTicker = ticker || 'null';
        const args = [PYTHON_SCRIPT, endpoint, safeTicker];
        for (const [key, value] of Object.entries(query)) {
            if (key !== 'symbol' && key !== 'ticker') {
                args.push(`${key}=${value}`);
            }
        }

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
                return res.status(500).json({ error: 'Failed to fetch data from yfinance provider' });
            }

            try {
                const result = JSON.parse(dataString);

                if (result.error) {
                    console.error(`Python script returned error: ${result.error}`);
                    return res.status(500).json({ error: result.error });
                }

                // 3. Store in Cache
                let duration = 60 * 1000; // Default 1 min
                for (const key in CACHE_DURATIONS) {
                    if (endpoint.includes(key)) {
                        duration = CACHE_DURATIONS[key];
                        break;
                    }
                }

                const expiry = Date.now() + duration;

                db.run('INSERT OR REPLACE INTO cache (key, data, expiry) VALUES (?, ?, ?)',
                    [cacheKey, JSON.stringify(result), expiry],
                    (err) => {
                        if (err) console.error('Error writing to cache:', err);
                    }
                );

                res.json(result);

            } catch (parseError) {
                console.error('Error parsing Python output:', parseError, dataString);
                res.status(500).json({ error: 'Invalid response from data provider' });
            }
        });

    } catch (error) {
        console.error(`Proxy Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};
