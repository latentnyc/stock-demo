import React, { useEffect, useState } from 'react';
import RefreshControl from '../common/RefreshControl';
import { usePortfolio } from '../../context/PortfolioContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, ArrowRight, PieChart } from 'lucide-react';
import { AreaChart, Area, YAxis, ResponsiveContainer } from 'recharts';
import MarketStatusModal from '../common/MarketStatusModal';

const Dashboard = () => {
    const { fetchMarketIndices, stockData, marketStatus, portfolio, fetchMarketStatus } = usePortfolio();
    const navigate = useNavigate();
    const [refreshing, setRefreshing] = useState(false);
    const [showMarketModal, setShowMarketModal] = useState(false);

    useEffect(() => {
        fetchMarketIndices();
    }, [fetchMarketIndices]);

    const indices = [
        { ticker: '^GSPC', name: 'S&P 500' },
        { ticker: '^DJI', name: 'Dow Jones' },
        { ticker: '^IXIC', name: 'NASDAQ' }
    ];

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchMarketIndices({ forceRefresh: true });
        setRefreshing(false);
    };

    // Determine the oldest data point to show accurate 'Last Updated' time.
    // This helps users know if the market data is stale.
    const oldestFetchedAt = indices.reduce((oldest, index) => {
        const data = stockData[index.ticker];
        if (data && data.fetchedAt) {
            return !oldest || data.fetchedAt < oldest ? data.fetchedAt : oldest;
        }
        return oldest;
    }, null);

    // Sort holdings by total value to show the most significant investments first.
    // Takes top 5 for the dashboard summary view.
    const topHoldings = [...portfolio]
        .map(item => {
            const data = stockData[item.ticker] || {};
            const price = data.price || 0;
            const value = price * item.quantity;
            return {
                ...item,
                value,
                price,
                change: data.changePercent || 0,
                name: data.name || item.ticker
            };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return (
        <div className="dashboard-container">
            {/* Header & Market Status */}
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Market overview and portfolio highlights.</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <RefreshControl
                        onRefresh={handleRefresh}
                        loading={refreshing}
                        lastUpdated={oldestFetchedAt}
                    />
                    <div
                        onClick={() => {
                            fetchMarketStatus();
                            setShowMarketModal(true);
                        }}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            backgroundColor: 'var(--bg-accent)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-accent)'}
                    >
                        <Activity size={16} color={marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-secondary)'} />
                        <span>
                            Market: {marketStatus.isOpen ?
                                <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>OPEN</span> :
                                <span style={{ color: 'var(--text-secondary)' }}>CLOSED</span>
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Major Markets */}
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--accent-green)" />
                Major Markets
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                {indices.map(index => {
                    const data = stockData[index.ticker] || {};
                    const price = data.price || 0;
                    const change = data.changePercent || 0;
                    const isPositive = change >= 0;

                    return (
                        <div
                            key={index.ticker}
                            onClick={() => navigate(`/market?ticker=${encodeURIComponent(index.ticker)}`)}
                            className="glass-panel"
                            style={{
                                padding: '24px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; // Assuming original was glass-panel default, which usually is semi-transparent or specific color. 
                                // Actually glass-panel class defines bg, so removing inline override matches css class?
                                // Let's check glass-panel definition if possible, but safely setting to transparent or handling in css is better.
                                // I will just remove the inline bg color on mouse leave if it was set by me.
                                e.currentTarget.style.backgroundColor = '';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{index.name}</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                                        {price ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Loading...'}
                                    </div>
                                </div>
                                <div style={{
                                    backgroundColor: isPositive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {isPositive ? <TrendingUp size={24} color="var(--accent-green)" /> : <TrendingDown size={24} color="var(--accent-red)" />}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                                    fontWeight: '600',
                                    fontSize: '1.1rem'
                                }}>
                                    {isPositive ? '+' : ''}{change ? change.toFixed(2) : '0.00'}%
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Today</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Top Holdings */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <PieChart size={20} color="var(--accent-purple)" />
                    Top Holdings
                </h3>
                <button
                    onClick={() => navigate('/portfolio')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-green)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '500',
                        fontSize: '0.95rem'
                    }}
                >
                    View Portfolio <ArrowRight size={16} />
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
                {topHoldings.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No holdings found. <span style={{ color: 'var(--accent-green)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/portfolio')}>Add your first stock</span> to see it here.
                    </div>
                ) : (
                    <div>
                        {topHoldings.map((item, index) => {
                            const data = stockData[item.ticker] || {};
                            const currentPrice = data.price || 0;
                            const change = data.changePercent || 0;
                            const value = currentPrice * item.quantity;
                            const avgPrice = item.average_price || 0;
                            const totalCost = avgPrice * item.quantity;
                            const gainLoss = value - totalCost;
                            const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

                            return (
                                <div
                                    key={item.ticker}
                                    onClick={() => navigate(`/stock/${item.ticker}`)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '80px 120px 1fr 1fr 1fr 1fr 1fr',
                                        gap: '16px',
                                        padding: '16px 32px',
                                        borderBottom: index !== topHoldings.length - 1 ? '1px solid var(--border-color)' : 'none',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.ticker}</div>
                                    </div>
                                    <div className="hide-on-mobile" style={{ height: '40px', width: '100%' }}>
                                        {data.history && data.history.length > 0 && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={data.history}>
                                                    <defs>
                                                        <linearGradient id={`colorSpark-${item.ticker}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={(data.history[data.history.length - 1].price >= data.history[0].price) ? 'var(--accent-green)' : 'var(--accent-red)'} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={(data.history[data.history.length - 1].price >= data.history[0].price) ? 'var(--accent-green)' : 'var(--accent-red)'} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <YAxis domain={['dataMin', 'dataMax']} hide />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="price"
                                                        stroke={(data.history[data.history.length - 1].price >= data.history[0].price) ? 'var(--accent-green)' : 'var(--accent-red)'}
                                                        strokeWidth={2}
                                                        fillOpacity={1}
                                                        fill={`url(#colorSpark-${item.ticker})`}
                                                        isAnimationActive={false}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Shares</div>
                                        <div>{item.quantity}</div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avg Cost</div>
                                        <div>${avgPrice.toFixed(2)}</div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Price</div>
                                        <div>${currentPrice.toFixed(2)}</div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Change</div>
                                        <div style={{ color: change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Value</div>
                                        <div style={{ fontWeight: 'bold' }}>${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                        <div style={{ fontSize: '0.8rem', color: gainLoss >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            {gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)} ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Market Status Modal */}
            {/* Market Status Modal */}
            <MarketStatusModal
                isOpen={showMarketModal}
                onClose={() => setShowMarketModal(false)}
            />
        </div>
    );
};

export default Dashboard;
