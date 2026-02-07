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
    const start = Date.now();
    const { method, url } = req;

    // Hook into response finish to log status and duration
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const timestamp = new Date().toISOString();
        const logEntry = `${timestamp} - ${method} ${url} ${status} ${duration}ms\n`;

        // 1. Log to File
        fs.appendFile(LOG_FILE, logEntry, (err) => {
            if (err) console.error('Error writing to log file:', err);
        });

        // 2. Log to Database
        db.run(`INSERT INTO logs (timestamp, method, url, status, duration) VALUES (?, ?, ?, ?, ?)`,
            [timestamp, method, url, status, duration],
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
    db.all('SELECT * FROM portfolio', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/portfolio', (req, res) => {
    const { ticker, quantity } = req.body;
    // Check if exists
    db.get('SELECT id, quantity FROM portfolio WHERE ticker = ?', [ticker], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            // Update
            const newQuantity = parseFloat(row.quantity) + parseFloat(quantity);
            db.run('UPDATE portfolio SET quantity = ? WHERE id = ?', [newQuantity, row.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, action: 'updated', quantity: newQuantity });
            });
        } else {
            // Insert
            db.run('INSERT INTO portfolio (ticker, quantity) VALUES (?, ?)', [ticker, quantity], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, action: 'inserted' });
            });
        }
    });
});

app.delete('/api/portfolio/:ticker', (req, res) => {
    const { ticker } = req.params;
    db.run('DELETE FROM portfolio WHERE ticker = ?', [ticker], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Logs Route
app.get('/api/logs', (req, res) => {
    db.all('SELECT * FROM logs ORDER BY id DESC LIMIT 100', [], (err, rows) => {
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

// Proxy Route
import { fetchStockData } from './proxy.js';
app.use('/api/proxy', fetchStockData);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
