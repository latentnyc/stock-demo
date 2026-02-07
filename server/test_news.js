// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:3002/api/proxy'; // Port 3002 as seen in index.js

async function testNews() {
    console.log("Starting News Integration Test...");

    // 1. Test General News (No Ticker)
    console.log("\n1. Testing General News (No Ticker)...");
    try {
        const url = `${BASE_URL}/news?category=general`;
        console.log(`Fetching ${url}...`);
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok) {
            if (Array.isArray(data) && data.length > 0) {
                console.log("[PASS] General News returned items:", data.length);
                console.log("Sample Item:", JSON.stringify(data[0], null, 2));
            } else {
                console.warn("[WARN] General News returned empty array or invalid format:", data);
            }
        } else {
            console.error("[FAIL] General News request failed:", res.status, data);
        }
    } catch (err) {
        console.error("[ERROR] General News test failed:", err.message);
    }

    // 2. Test Company News (With Ticker)
    console.log("\n2. Testing Company News (AAPL)...");
    try {
        const url = `${BASE_URL}/news?ticker=AAPL`; // Note: proxy.js maps this to news endpoint? 
        // Wait, fetch_stock_data.py handles 'news' endpoint with ticker or without.
        // But proxy.js validation might fail if I use 'news' endpoint with ticker? 
        // No, proxy.js says: if (!ticker && endpoint !== 'news') ... so if ticker acts normally it should pass.
        // Actually, for company news, we usually use `company-news` endpoint in Finnhub.
        // But my implementation plan said `news` endpoint for general.
        // Let's test both `news` with ticker and `company-news` with ticker.

        console.log(`Fetching ${url}...`);
        const res = await fetch(url);
        const data = await res.json();

        if (res.ok) {
            console.log("[PASS] Company News (news endpoint) returned:", Array.isArray(data) ? data.length : data);
        } else {
            console.error("[FAIL] Company News (news endpoint) request failed:", res.status, data);
        }

    } catch (err) {
        console.error("[ERROR] Company News test failed:", err.message);
    }
}

testNews();
