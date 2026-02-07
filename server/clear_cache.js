
import db from './database.js';

db.serialize(() => {
    db.get("SELECT COUNT(*) as count FROM cache", (err, row) => {
        if (err) console.error(err);
        else console.log(`Cache count before: ${row.count}`);

        db.run("DELETE FROM cache", (err) => {
            if (err) console.error(err);
            else console.log("Cache cleared.");

            db.get("SELECT COUNT(*) as count FROM cache", (err, row) => {
                if (err) console.error(err);
                else console.log(`Cache count after: ${row.count}`);
            });
        });
    });
});
