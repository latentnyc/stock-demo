import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithThrottle } from '../utils/api';

const PortfolioContext = createContext();

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
            const res = await fetchWithThrottle('/portfolio');
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
            // Finnhub doesn't have a simple generic "is market open" endpoint freely available easily without exchange, 
            // but we can try /stock/market-status?exchange=US
            const res = await fetchWithThrottle('/proxy/stock/market-status?exchange=US');
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

        const noCacheParam = options.forceRefresh ? '&noCache=true' : '';

        try {
            // 1. Fetch Quote FIRST for immediate UI feedback (Price/Change)
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
                    fetchedAt: new Date().toLocaleTimeString(),
                    status: 'loading_details' // Indicate we are still fetching details
                }
            }));


            // 2. Fetch the rest in parallel
            // We don't await this block to block the UI, but we await it to return the full object if needed by caller (addStock)
            // Actually, for addStock we might want the full object.

            const fetchDetails = async () => {
                // 2. Profile
                const profileRes = await fetchWithThrottle(`/proxy/stock/profile2?symbol=${ticker}${noCacheParam}`);
                const profile = profileRes.ok ? await profileRes.json() : {};

                // 3. News
                const toDate = new Date().toISOString().split('T')[0];
                const fromDate = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
                const newsRes = await fetchWithThrottle(`/proxy/company-news?symbol=${ticker}&from=${fromDate}&to=${toDate}${noCacheParam}`);
                const news = newsRes.ok ? await newsRes.json() : [];

                // 4. Candles
                const candleFrom = Math.floor((Date.now() - 30 * 86400000) / 1000);
                const candleTo = Math.floor(Date.now() / 1000);
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
                    ticker: ticker.toUpperCase(),
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
                    fetchedAt: new Date().toLocaleTimeString()
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

    const fetchGeneralNews = useCallback(async () => {
        try {
            const res = await fetchWithThrottle('/proxy/news?category=general');
            if (res.ok) {
                return await res.json();
            }
            return [];
        } catch (err) {
            console.error("Error fetching general news:", err);
            return [];
        }
    }, []);

    const fetchMarketIndices = useCallback(async () => {
        const indices = ['^GSPC', '^DJI', '^IXIC'];
        await Promise.all(indices.map(ticker => fetchStockData(ticker)));
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

    const addStock = async (ticker, quantity) => {
        const data = await fetchStockData(ticker);
        if (!data || data.error) return false;

        try {
            const res = await fetchWithThrottle('/portfolio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, quantity })
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

    const removeStock = async (ticker) => {
        try {
            const res = await fetchWithThrottle(`/portfolio/${ticker}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                await loadPortfolio();
            }
        } catch (err) {
            console.error('Failed to remove stock:', err);
        }
    };

    const value = {
        portfolio,
        stockData,
        loading,
        error,
        addStock,
        removeStock,
        fetchStockData,
        fetchGeneralNews,
        fetchMarketIndices,
        marketStatus
    };

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
};
