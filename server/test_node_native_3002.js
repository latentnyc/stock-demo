
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
    await testEndpoint('quote', { symbol: 'AAPL' });
    await testEndpoint('profile2', { symbol: 'AAPL' });
    // await testEndpoint('company-news', { symbol: 'AAPL', from: '2023-01-01', to: '2023-01-10' }); 
    await testEndpoint('candle', { symbol: 'AAPL', resolution: 'D', from: 1672531200, to: 1673136000 });
}

runTests();
