import db from './database.js';

console.log('Attempting to query database...');

db.all('SELECT * FROM portfolio LIMIT 1', [], (err, rows) => {
    if (err) {
        console.error('Database Error:', err.message);
        process.exit(1);
    }
    console.log('Database Connection Successful.');
    console.log('Result:', rows);
    process.exit(0);
});
