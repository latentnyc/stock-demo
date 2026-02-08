import React, { useState } from 'react';
import RefreshControl from '../common/RefreshControl';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext';
import { Activity, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import MarketStatusModal from '../common/MarketStatusModal';

const Portfolio = () => {
    const navigate = useNavigate();
    const { addStock, portfolio, stockData, loading, marketStatus, removeStock, fetchStockData, fetchMarketStatus } = usePortfolio(); // Added fetchStockData
    const [ticker, setTicker] = useState('');
    const [quantity, setQuantity] = useState('');
    const [costBasis, setCostBasis] = useState('');
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [deletingTicker, setDeletingTicker] = useState(null);
    const [confirmingTicker, setConfirmingTicker] = useState(null);
    const [showMarketModal, setShowMarketModal] = useState(false);

    // Calculate Total Portfolio Value
    const totalValue = portfolio.reduce((sum, item) => {
        const data = stockData[item.ticker] || {};
        const price = data.price || 0;
        return sum + (price * item.quantity);
    }, 0);

    // Calculate Portfolio History
    // Aggregates history from all stocks for the 30-day performance chart.
    // Memoized to avoid unnecessary recalculations and useEffect cycles.
    const historyData = React.useMemo(() => {
        if (portfolio.length === 0) return [];

        // 1. Get all unique dates from all stock histories
        const allDates = new Set();
        const stockHistories = {};

        portfolio.forEach(item => {
            const data = stockData[item.ticker];
            if (data && data.history) {
                stockHistories[item.ticker] = data.history;
                data.history.forEach(point => allDates.add(point.date));
            }
        });

        const sortedDates = Array.from(allDates).sort();

        // 2. Build aggregated history
        return sortedDates.map(date => {
            let totalForDate = 0;
            portfolio.forEach(item => {
                const history = stockHistories[item.ticker];
                if (history) {
                    const point = history.find(p => p.date === date);
                    if (point) {
                        totalForDate += point.price * item.quantity;
                    }
                }
            });
            return { date, value: totalForDate };
        });
    }, [portfolio, stockData]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        if (!ticker || !quantity) return;

        // setLoading(true); // removed local loading state as it conflicts or is not needed if we rely on global or async/await
        // Actually, we can use a local submitting state if we want, but let's just use await
        const success = await addStock(ticker, parseFloat(quantity), parseFloat(costBasis) || 0);

        if (success) {
            setTicker('');
            setQuantity('');
            setCostBasis('');
        } else {
            setError('Failed to add stock. Please check ticker.');
        }
    };

    // Chart Color Logic
    const startValue = historyData.length > 0 ? historyData[0].value : 0;
    const endValue = historyData.length > 0 ? historyData[historyData.length - 1].value : 0;
    const isPositive = endValue >= startValue;
    const chartColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';

    return (
        <div className="dashboard-container">
            {/* Header Section with Total Value and Controls */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '4px' }}>Market Intelligence</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Real-time analysis for the vibe investor.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <RefreshControl
                            onRefresh={async () => {
                                setRefreshing(true);
                                if (portfolio.length > 0) {
                                    await Promise.all(portfolio.map(p => fetchStockData(p.ticker, { forceRefresh: true })));
                                }
                                setRefreshing(false);
                            }}
                            loading={refreshing}
                        />
                        <div style={{
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
                            onClick={() => {
                                fetchMarketStatus();
                                setShowMarketModal(true);
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

                {/* Total Portfolio Value - Prominent */}
                <div className="card" style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <h2 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '1.2rem', fontWeight: 'normal' }}>Total Portfolio Value</h2>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Split Content: Graph (Left) and Add Form (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', marginBottom: '32px' }}>

                {/* Left: Portfolio History Graph */}
                <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>30-Day Performance</h3>
                    {historyData.length > 0 ? (
                        <div style={{ flex: 1, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={30}
                                        tickFormatter={(str) => {
                                            const d = new Date(str);
                                            return `${d.getMonth() + 1}/${d.getDate()}`;
                                        }}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        tickFormatter={(val) => `$${val.toLocaleString()}`}
                                        tickLine={false}
                                        axisLine={false}
                                        width={60}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        labelStyle={{ color: 'var(--text-muted)' }}
                                        formatter={(value) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Portfolio Value']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={chartColor}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <p>Not enough data for chart. Add stocks to see history.</p>
                        </div>
                    )}
                </div>

                {/* Right: Add Position Form */}
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '16px' }}>Add Position</h3>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ticker Symbol</label>
                            <input
                                type="text"
                                placeholder="e.g. AAPL"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--bg-accent)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quantity</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--bg-accent)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cost Basis (Optional)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={costBasis}
                                onChange={(e) => setCostBasis(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--bg-accent)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: 'var(--accent-green)',
                                color: 'var(--bg-primary)',
                                fontWeight: '600',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                opacity: loading ? 0.7 : 1,
                                marginTop: '8px'
                            }}
                        >
                            {loading ? 'Adding...' : 'Add Position'}
                        </button>
                    </form>
                    {error && <p style={{ color: 'var(--accent-red)', marginTop: '12px', fontSize: '0.9rem' }}>{error}</p>}
                </div>
            </div>

            {/* Bottom: Holdings List */}
            <div className="card">
                <h4 style={{ marginBottom: '16px' }}>Your Holdings</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {portfolio.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No holdings yet. Add a stock above.</p>
                    ) : (
                        portfolio.map((item) => {
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
                                        gridTemplateColumns: '80px 120px 1fr 1fr 1fr 1fr 1fr auto',
                                        gap: '16px',
                                        padding: '16px',
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        borderRadius: '8px',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
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

                                    <div style={{ textAlign: 'right', paddingLeft: '16px' }}>
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.stopPropagation();

                                                if (confirmingTicker === item.ticker) {
                                                    // Confirmed
                                                    setDeletingTicker(item.ticker);
                                                    setConfirmingTicker(null);
                                                    try {
                                                        await removeStock(item.ticker);
                                                    } catch (err) {
                                                        console.error("Delete failed:", err);
                                                        alert("Failed to delete stock.");
                                                    } finally {
                                                        setDeletingTicker(null);
                                                    }
                                                } else {
                                                    // First click
                                                    setConfirmingTicker(item.ticker);
                                                    // Auto-reset confirmation after 3 seconds
                                                    setTimeout(() => setConfirmingTicker(current => current === item.ticker ? null : current), 3000);
                                                }
                                            }}
                                            disabled={deletingTicker === item.ticker}
                                            style={{
                                                background: confirmingTicker === item.ticker ? 'var(--accent-red)' : (deletingTicker === item.ticker ? 'rgba(255, 0, 0, 0.3)' : 'transparent'),
                                                border: (deletingTicker === item.ticker || confirmingTicker === item.ticker) ? '1px solid var(--accent-red)' : 'none',
                                                color: confirmingTicker === item.ticker ? '#fff' : (deletingTicker === item.ticker ? 'var(--accent-red)' : 'var(--text-muted)'),
                                                cursor: deletingTicker === item.ticker ? 'wait' : 'pointer',
                                                padding: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '4px',
                                                transition: 'all 0.2s',
                                                opacity: deletingTicker === item.ticker ? 0.7 : 1,
                                                position: 'relative',
                                                zIndex: 10,
                                                minWidth: confirmingTicker === item.ticker ? '80px' : 'auto'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (deletingTicker !== item.ticker && confirmingTicker !== item.ticker) {
                                                    e.currentTarget.style.color = 'var(--accent-red)';
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (deletingTicker !== item.ticker && confirmingTicker !== item.ticker) {
                                                    e.currentTarget.style.color = 'var(--text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                            title="Remove Stock"
                                        >
                                            {confirmingTicker === item.ticker ? (
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Confirm</span>
                                            ) : (
                                                <Trash2 size={18} className={deletingTicker === item.ticker ? "spin" : ""} style={{ pointerEvents: 'none' }} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            {/* Market Status Modal */}
            <MarketStatusModal
                isOpen={showMarketModal}
                onClose={() => setShowMarketModal(false)}
            />
        </div>
    );
};

export default Portfolio;
