
const PORT = process.env.PORT || 3002;
const BASE_URL = `http://localhost:${PORT}/api/proxy`;

async function testEndpoint(endpoint, params) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${BASE_URL}/${endpoint}?${queryString}`;
    console.log(`Testing ${url}...`);
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
            console.log(`[PASS] ${endpoint}:`, data);
        } else {
            console.error(`[FAIL] ${endpoint}:`, data);
        }
    } catch (err) {
        console.error(`[ERROR] ${endpoint}:`, err.message);
    }
}

async function runTests() {
    await testEndpoint('quote', { symbol: 'CAT' });
    // await testEndpoint('profile2', { symbol: 'CAT' });
    // await testEndpoint('stock/profile2', { symbol: 'CAT' });

    // await testEndpoint('candle', { symbol: 'CAT', resolution: 'D', from: 1672531200, to: 1673136000 }); 
    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 86400000 / 1000);
    await testEndpoint('stock/candle', { symbol: 'CAT', resolution: 'D', from, to });
}

runTests();
