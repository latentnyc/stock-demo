
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, 'api_logs.txt');

app.use(cors());
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    fs.appendFileSync('server/debug_output.txt', `[START] ${new Date().toISOString()} ${req.method} ${req.url}\n`);
    console.log(`Incoming Request: ${req.method} ${req.url}`);
    const start = Date.now();
    const { method, url } = req;

    // Hook into response finish to log status and duration
    res.on('finish', () => {
        // Exclude logging for the logs endpoint itself to reduce noise
        if (url.startsWith('/api/logs')) return;

        const duration = Date.now() - start;
        const status = res.statusCode;
        const timestamp = new Date().toISOString();
        const cacheHitHeader = res.getHeader('X-Cache-Hit');
        const cacheHit = cacheHitHeader === 'true' ? 1 : 0;
        const logEntry = `${timestamp} - ${method} ${url} ${status} ${duration}ms CacheHit:${cacheHit}\n`;

        // 1. Log to File
        fs.appendFile(LOG_FILE, logEntry, (err) => {
            if (err) console.error('Error writing to log file:', err);
        });

        // 2. Log to Database
        db.run(`INSERT INTO logs (timestamp, method, url, status, duration, cache_hit) VALUES (?, ?, ?, ?, ?, ?)`,
            [timestamp, method, url, status, duration, cacheHit],
            (err) => {
                if (err) console.error('Error writing to log db:', err);
            }
        );
    });

    next();
});

// Routes
app.get('/', (req, res) => {
    res.send('Stock Demo API is running');
});



// Portfolio Routes
app.get('/api/portfolio', (req, res) => {
    db.all('SELECT * FROM portfolio ORDER BY ticker ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/portfolio', (req, res) => {
    const { ticker, quantity, costBasis } = req.body;
    const price = parseFloat(costBasis) || 0;
    const qty = parseFloat(quantity);
    const upperTicker = ticker.toUpperCase();

    // Check if exists using case-insensitive check
    db.get('SELECT id, quantity, average_price, ticker FROM portfolio WHERE UPPER(ticker) = ?', [upperTicker], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Update with weighted average
            const currentQty = parseFloat(row.quantity);
            const currentAvg = parseFloat(row.average_price) || 0;

            const newQuantity = currentQty + qty;
            let newAveragePrice = currentAvg;

            if (newQuantity > 0) {
                newAveragePrice = ((currentQty * currentAvg) + (qty * price)) / newQuantity;
            }

            db.run('UPDATE portfolio SET quantity = ?, average_price = ? WHERE id = ?',
                [newQuantity, newAveragePrice, row.id],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, action: 'updated', quantity: newQuantity, average_price: newAveragePrice });
                });
        } else {
            // Insert - Always use uppercased ticker for new entries to maintain cleanliness
            db.run('INSERT INTO portfolio (ticker, quantity, average_price) VALUES (?, ?, ?)',
                [upperTicker, qty, price],
                (err) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, action: 'inserted' });
                });
        }
    });
});

app.post('/api/portfolio/import', (req, res) => {
    const items = req.body; // Expecting array of { ticker, quantity, average_price }
    if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Input must be an array" });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run("DELETE FROM portfolio", (err) => {
            if (err) {
                console.error("Error clearing portfolio:", err);
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }

            if (items.length === 0) {
                db.run("COMMIT");
                return res.json({ success: true, count: 0 });
            }

            const stmt = db.prepare("INSERT INTO portfolio (ticker, quantity, average_price) VALUES (?, ?, ?)");

            items.forEach(item => {
                stmt.run(item.ticker.toUpperCase(), item.quantity, item.average_price || 0);
            });

            stmt.finalize((err) => {
                if (err) {
                    console.error("Error finalizing statement:", err);
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT", (err) => {
                    if (err) {
                        console.error("Error committing:", err);
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ success: true, count: items.length });
                });
            });
        });
    });
});

app.delete('/api/portfolio/:ticker', (req, res) => {
    const { ticker } = req.params;
    // Case-insensitive delete to catch 'Apple', 'APPLE', 'aapl'
    db.run('DELETE FROM portfolio WHERE UPPER(ticker) = ?', [ticker.toUpperCase()], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Logs Route
app.get('/api/logs', (req, res) => {
    const includeCacheHits = req.query.include_cache_hits === 'true';

    let query = 'SELECT * FROM logs';
    const params = [];

    if (!includeCacheHits) {
        query += ' WHERE cache_hit = 0';
    }

    query += ' ORDER BY id DESC LIMIT 100';

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Google Auth Route
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;

        db.get('SELECT * FROM users WHERE google_id = ?', [sub], (err, user) => {
            if (err) return res.status(500).json({ error: err.message });

            if (user) {
                db.run('UPDATE users SET name = ?, picture = ? WHERE google_id = ?', [name, picture, sub]);
            } else {
                db.run('INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)', [sub, email, name, picture]);
            }

            const sessionToken = jwt.sign({ id: sub, email, name, picture }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
            res.json({ token: sessionToken, user: { google_id: sub, email, name, picture } });
        });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Queue Status Route
import limiter from './rateLimiter.js';
app.get('/api/queue-status', (req, res) => {
    res.json({ depth: limiter.getQueueLength() });
});

// Proxy Route
import { fetchStockData } from './proxy.js';
app.use('/api/proxy', fetchStockData);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); // Restart triggered
