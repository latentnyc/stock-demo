import React, { useEffect } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, ArrowRight, PieChart } from 'lucide-react';

const Dashboard = () => {
    const { fetchMarketIndices, stockData, marketStatus, portfolio } = usePortfolio();
    const navigate = useNavigate();

    useEffect(() => {
        fetchMarketIndices();
    }, [fetchMarketIndices]);

    const indices = [
        { ticker: '^GSPC', name: 'S&P 500' },
        { ticker: '^DJI', name: 'Dow Jones' },
        { ticker: '^IXIC', name: 'NASDAQ' }
    ];

    // Calculate Top 5 Holdings sorted by value
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
                <div style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--bg-accent)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem'
                }}>
                    <Activity size={16} color={marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-secondary)'} />
                    <span>
                        Market: {marketStatus.isOpen ?
                            <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>OPEN</span> :
                            <span style={{ color: 'var(--text-secondary)' }}>CLOSED</span>
                        }
                    </span>
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
                        <div key={index.ticker} className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
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
                            return (
                                <div
                                    key={item.ticker}
                                    onClick={() => navigate(`/stock/${item.ticker}`)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(200px, 1fr) 1fr 1fr',
                                        padding: '24px 32px',
                                        borderBottom: index !== topHoldings.length - 1 ? '1px solid var(--border-color)' : 'none',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            color: 'var(--text-primary)'
                                        }}>
                                            {item.ticker[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.ticker}</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.quantity} shares</div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Price</div>
                                        <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>${item.price.toFixed(2)}</div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Value</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-green)' }}>${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
