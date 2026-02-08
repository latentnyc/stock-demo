import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Settings table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Portfolio table
        db.run(`CREATE TABLE IF NOT EXISTS portfolio (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            quantity REAL NOT NULL
        )`);

        // Cache table
        db.run(`CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            data TEXT,
            expiry INTEGER
        )`);

        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE,
            email TEXT UNIQUE,
            name TEXT,
            picture TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Logs table
        db.run(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            method TEXT,
            url TEXT,
            status INTEGER,
            duration INTEGER,
            cache_hit INTEGER DEFAULT 0
        )`, (err) => {
            if (!err) {
                // Check if cache_hit column exists, if not add it
                db.all("PRAGMA table_info(logs)", (err, rows) => {
                    if (err) {
                        console.error("Error checking logs table schema:", err);
                        return;
                    }
                    const hasCacheHit = rows.some(row => row.name === 'cache_hit');
                    if (!hasCacheHit) {
                        db.run("ALTER TABLE logs ADD COLUMN cache_hit INTEGER DEFAULT 0", (err) => {
                            if (err) console.error("Error adding cache_hit column:", err);
                            else console.log("Added cache_hit column to logs table");
                        });
                    }
                });
            }
        });
        // Check for average_price in portfolio
        db.all("PRAGMA table_info(portfolio)", (err, rows) => {
            if (err) {
                console.error("Error checking portfolio table schema:", err);
                return;
            }
            const hasAvgPrice = rows.some(row => row.name === 'average_price');
            if (!hasAvgPrice) {
                db.run("ALTER TABLE portfolio ADD COLUMN average_price REAL", (err) => {
                    if (err) console.error("Error adding average_price column:", err);
                    else console.log("Added average_price column to portfolio table");
                });
            }
        });
    });
}

export default db;
