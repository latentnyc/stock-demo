import React, { useEffect, useState } from 'react';
import RefreshControl from '../common/RefreshControl';
import { useSearchParams } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext';
import StockView from './StockView';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

const Market = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const ticker = searchParams.get('ticker');
    const { MARKET_INDICES, stockData, fetchMarketIndices } = usePortfolio();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // Ensure we have fresh data for all indices
        fetchMarketIndices();
    }, [fetchMarketIndices]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchMarketIndices({ forceRefresh: true });
        setRefreshing(false);
    };

    const oldestFetchedAt = MARKET_INDICES.reduce((oldest, index) => {
        const data = stockData[index.ticker];
        if (data && data.fetchedAt) {
            return !oldest || data.fetchedAt < oldest ? data.fetchedAt : oldest;
        }
        return oldest;
    }, null);

    return (
        <div className="market-container" style={{ animation: 'fadeIn 0.5s ease', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0' }}>Market Overview</h1>
                <RefreshControl
                    onRefresh={handleRefresh}
                    loading={refreshing}
                    lastUpdated={oldestFetchedAt}
                />
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                Global market status and performance.
            </p>

            {/* Selected Index Detail View */}
            {ticker && (
                <div style={{ marginBottom: '40px' }}>
                    <StockView ticker={ticker} isIndex={true} />
                </div>
            )}

            {/* All Indices List */}
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--accent-green)" />
                Major Indices
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
            }}>
                {MARKET_INDICES && MARKET_INDICES.map(index => {
                    const data = stockData[index.ticker] || {};
                    const price = data.price || 0;
                    const change = data.changePercent || 0;
                    const isPositive = change >= 0;
                    const isSelected = ticker === index.ticker;

                    return (
                        <div
                            key={index.ticker}
                            onClick={() => setSearchParams({ ticker: index.ticker })}
                            className="glass-panel"
                            style={{
                                padding: '24px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                border: isSelected ? '1px solid var(--accent-green)' : '1px solid transparent',
                                transition: 'all 0.2s ease',
                                backgroundColor: isSelected ? 'rgba(0, 255, 136, 0.05)' : 'var(--bg-secondary)'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{index.name}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                                        {price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Loading...'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{index.ticker}</div>
                                </div>
                                <div style={{
                                    backgroundColor: isPositive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                                    padding: '8px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {isPositive ? <TrendingUp size={20} color="var(--accent-green)" /> : <TrendingDown size={20} color="var(--accent-red)" />}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                                    fontWeight: '600',
                                    fontSize: '1rem'
                                }}>
                                    {isPositive ? '+' : ''}{change ? change.toFixed(2) : '0.00'}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Market;
