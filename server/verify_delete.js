
// ESM
async function testDelete() {
    const baseUrl = 'http://localhost:3002/api/portfolio';
    const ticker = 'TEST_DEL';

    try {
        console.log(`1. Adding ${ticker}...`);
        const addRes = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, quantity: 1, costBasis: 100 })
        });
        const addData = await addRes.json();
        console.log('Add Result:', addData);

        console.log(`2. Deleting ${ticker}...`);
        const delRes = await fetch(`${baseUrl}/${ticker}`, {
            method: 'DELETE'
        });

        if (delRes.ok) {
            const delData = await delRes.json();
            console.log('Delete Result:', delData);
        } else {
            console.error('Delete Failed:', delRes.status, await delRes.text());
        }

        console.log(`3. Verifying deletion...`);
        const getRes = await fetch(baseUrl);
        const portfolio = await getRes.json();
        const found = portfolio.find(p => p.ticker === ticker);
        if (found) {
            console.error('Ticker still exists in portfolio!');
        } else {
            console.log('Ticker successfully removed.');
        }
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testDelete();
