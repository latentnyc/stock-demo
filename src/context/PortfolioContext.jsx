import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithThrottle, fetchInternal } from '../utils/api';

const PortfolioContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const usePortfolio = () => useContext(PortfolioContext);

export const PortfolioProvider = ({ children }) => {
    const [portfolio, setPortfolio] = useState([]);
    const [stockData, setStockData] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [marketStatus, setMarketStatus] = useState({ isOpen: false, nextOpen: null, holiday: null });

    // Load Portfolio from Backend
    const loadPortfolio = useCallback(async () => {
        try {
            const res = await fetchInternal(`/portfolio?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setPortfolio(data);
            }
        } catch (err) {
            console.error('Failed to load portfolio:', err);
        }
    }, []);

    useEffect(() => {
        loadPortfolio();
    }, [loadPortfolio]);

    const fetchMarketStatus = useCallback(async () => {
        try {
            // Check /stock/market-status to get the current market state.
            const res = await fetchWithThrottle('/proxy/stock/market-status');
            if (res.ok) {
                const data = await res.json();
                // data = { isOpen: boolean, holiday: string, ... }
                setMarketStatus(data);
            }
        } catch (err) {
            console.error('Failed to fetch market status:', err);
        }
    }, []);

    useEffect(() => {
        fetchMarketStatus();
        const interval = setInterval(fetchMarketStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [fetchMarketStatus]);

    const fetchStockData = useCallback(async (ticker, options = {}) => {
        if (!ticker) return null;
        setLoading(true);
        setError(null);

        const noCacheParam = options.forceRefresh ? '&forceRefresh=true' : '';

        try {
            // Strategy: Two-tiered fetching for optimal UX.
            // 1. Fetch Quote FIRST for immediate UI feedback (Price/Change).
            // 2. Fetch detailed data (Profile, News, Candles, Dividends) in parallel afterwards.
            const quoteRes = await fetchWithThrottle(`/proxy/quote?symbol=${ticker}${noCacheParam}`);
            if (!quoteRes.ok) {
                const errData = await quoteRes.json().catch(() => ({}));
                if (errData.code === 'NO_API_KEY') {
                    throw new Error('API Key configuration missing. Please check Settings.');
                }
                if (quoteRes.status === 429) throw new Error('Rate Limit Exceeded');
                throw new Error(errData.error || 'Failed to fetch quote');
            }
            const quote = await quoteRes.json();
            // Get fetchedAt from header
            const fetchedAtHeader = quoteRes.headers.get('X-Fetched-At');
            const fetchedAt = fetchedAtHeader ? new Date(fetchedAtHeader).getTime() : Date.now();

            if (quote.pc === 0 && quote.d === null) {
                throw new Error('Invalid Ticker or No Data');
            }

            // INITIAL UPDATE: Price and Change only
            setStockData(prev => ({
                ...prev,
                [ticker]: {
                    ...prev[ticker],
                    ticker: ticker.toUpperCase(),
                    price: quote.c,
                    change: quote.d,
                    changePercent: quote.dp,
                    high: quote.h,
                    low: quote.l,
                    fetchedAt: fetchedAt, // Use server timestamp
                    status: 'loading_details' // Indicate we are still fetching details
                }
            }));


            // 2. Fetch the rest in parallel
            // We fetch profile, news, candles, and dividends concurrently to minimize total wait time.
            // This data populates the detailed view and historical charts.

            const fetchDetails = async () => {
                // 2. Profile
                const profileRes = await fetchWithThrottle(`/proxy/stock/profile2?symbol=${ticker}${noCacheParam}`);
                const profile = profileRes.ok ? await profileRes.json() : {};

                // 3. News
                // Cache friendlier: update 'to' only once per hour? Or keep it 'today'.
                // 'fromDate' as 3 days ago is fine, but let's make sure it doesn't shift every millisecond.
                const now = new Date();
                const toDate = now.toISOString().split('T')[0]; // YYYY-MM-DD (stable for 24h)

                // For 'from', 3 days ago
                const threeDaysAgo = new Date(now);
                threeDaysAgo.setDate(now.getDate() - 3);
                const fromDate = threeDaysAgo.toISOString().split('T')[0]; // (stable for 24h)

                const newsRes = await fetchWithThrottle(`/proxy/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}${noCacheParam}`);
                const news = newsRes.ok ? await newsRes.json() : [];

                // 4. Candles
                // Timestamp based: cache miss every second if we use Date.now() / 1000
                // Normalize 'to' to the current hour or minute to allow caching for at least that duration
                // Let's normalize to the start of the current 5-minute block
                const nowSeconds = Math.floor(Date.now() / 1000);
                const block = 3600; // 1 hour
                const candleTo = nowSeconds - (nowSeconds % block);

                const candleFrom = candleTo - (30 * 86400000 / 1000); // 30 days ago from the normalized 'to'

                const candleRes = await fetchWithThrottle(`/proxy/stock/candle?symbol=${ticker}&resolution=D&from=${candleFrom}&to=${candleTo}${noCacheParam}`);
                const candleData = candleRes.ok ? await candleRes.json() : {};

                // 5. Dividends
                const dividendRes = await fetchWithThrottle(`/proxy/dividends?symbol=${ticker}${noCacheParam}`);
                const dividendData = dividendRes.ok ? await dividendRes.json() : {};

                let history = [];
                if (candleData && candleData.s === 'ok') {
                    history = candleData.t.map((timestamp, index) => ({
                        date: new Date(timestamp * 1000).toISOString().split('T')[0],
                        price: parseFloat(candleData.c[index].toFixed(2))
                    }));
                }

                const fullData = {
                    ticker: (profile.ticker || ticker).toUpperCase(),
                    name: profile.name || ticker,
                    price: quote.c,
                    change: quote.d,
                    changePercent: quote.dp,
                    high: quote.h,
                    low: quote.l,
                    logo: profile.logo,
                    history,
                    status: 'ok',
                    news: Array.isArray(news) ? news.slice(0, 5) : [],
                    dividends: dividendData,
                    fetchedAt: fetchedAt // Use the timestamp from the quote response as the primary timestamp
                };

                // FINAL UPDATE: All data
                setStockData(prev => ({ ...prev, [ticker]: fullData }));
                return fullData;
            };

            return await fetchDetails();

        } catch (err) {
            console.error("Error fetching stock data:", err);
            setError(err.message);
            setStockData(prev => ({ ...prev, [ticker]: { error: err.message } }));
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchGeneralNews = useCallback(async (options = {}) => {
        try {
            const noCacheParam = options.forceRefresh ? '&forceRefresh=true' : '';
            const res = await fetchWithThrottle(`/proxy/news?category=general${noCacheParam}`);
            if (res.ok) {
                const data = await res.json();
                const fetchedAtHeader = res.headers.get('X-Fetched-At');
                const fetchedAt = fetchedAtHeader ? new Date(fetchedAtHeader).getTime() : Date.now();
                return { articles: data, fetchedAt };
            }
            return { articles: [], fetchedAt: Date.now() };
        } catch (err) {
            console.error("Error fetching general news:", err);
            return { articles: [], fetchedAt: Date.now() };
        }
    }, []);

    const MARKET_INDICES = [
        { ticker: '^GSPC', name: 'S&P 500' },
        { ticker: '^DJI', name: 'Dow Jones' },
        { ticker: '^IXIC', name: 'NASDAQ' },
        { ticker: '^FTSE', name: 'FTSE 100' },
        { ticker: '^GDAXI', name: 'DAX' },
        { ticker: '^FCHI', name: 'CAC 40' },
        { ticker: '^N225', name: 'Nikkei 225' },
        { ticker: '000001.SS', name: 'Shanghai Composite' },
        { ticker: '^HSI', name: 'Hang Seng Index' },
        { ticker: '^NSEI', name: 'Nifty 50' }
    ];

    const fetchMarketIndices = useCallback(async (options = {}) => {
        await Promise.all(MARKET_INDICES.map(index => fetchStockData(index.ticker, options)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchStockData]);

    // Fetch data for all portfolio items
    useEffect(() => {
        if (portfolio.length > 0) {
            portfolio.forEach(p => {
                // Optimization: Don't re-fetch if we have recent data? 
                // For now, simple fetch. Logic could be improved to check timestamp in stockData.
                fetchStockData(p.ticker);
            });
        }
    }, [portfolio, fetchStockData]);

    const addStock = async (ticker, quantity, costBasis = 0) => {
        const data = await fetchStockData(ticker);
        if (!data || data.error) return false;

        try {
            const res = await fetchInternal('/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, quantity, costBasis })
            });
            if (res.ok) {
                await loadPortfolio(); // Refresh
                return true;
            }
        } catch (err) {
            console.error('Failed to add stock:', err);
        }
        return false;
    };

    const importPortfolio = async (data) => {
        try {
            const res = await fetchInternal('/portfolio/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                await loadPortfolio();
                return true;
            }
        } catch (err) {
            console.error('Failed to import portfolio:', err);
        }
        return false;
    };

    const removeStock = async (ticker) => {
        try {
            const res = await fetchInternal(`/portfolio/${ticker}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                await loadPortfolio();
            } else {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Failed to delete: ${res.status}`);
            }
        } catch (err) {
            console.error('Failed to remove stock:', err);
            throw err; // Re-throw so UI can handle it
        }
    };

    // Alert System Logic
    const [alerts, setAlerts] = useState(() => {
        try {
            const saved = localStorage.getItem('stockAlerts');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error parsing alerts from localStorage:", e);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('stockAlerts', JSON.stringify(alerts));
    }, [alerts]);

    const checkAlerts = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];

        Object.values(stockData).forEach(stock => {
            if (!stock || typeof stock.changePercent !== 'number') return;

            const isSignificantMove = Math.abs(stock.changePercent) > 3;
            if (isSignificantMove) {
                // Check if we already alerted for this stock today
                const alreadyAlerted = alerts.some(alert =>
                    alert.ticker === stock.ticker &&
                    alert.date === today &&
                    alert.type === (stock.changePercent > 0 ? 'up' : 'down')
                );

                if (!alreadyAlerted) {
                    const newAlert = {
                        id: Date.now() + Math.random().toString(36).substr(2, 9),
                        ticker: stock.ticker,
                        changePercent: stock.changePercent,
                        price: stock.price,
                        date: today,
                        timestamp: Date.now(),
                        read: false,
                        type: stock.changePercent > 0 ? 'up' : 'down'
                    };
                    setAlerts(prev => [newAlert, ...prev]);
                }
            }
        });
    }, [stockData, alerts]);

    useEffect(() => {
        checkAlerts();
    }, [checkAlerts]);

    const markAlertsAsRead = useCallback(() => {
        setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    }, []);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    const value = {
        portfolio,
        stockData,
        loading,
        error,
        addStock,
        removeStock,
        importPortfolio,
        fetchStockData,
        fetchGeneralNews,
        fetchMarketIndices,
        fetchMarketStatus,
        marketStatus,
        MARKET_INDICES,
        alerts,
        markAlertsAsRead,
        clearAlerts
    };

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
};
