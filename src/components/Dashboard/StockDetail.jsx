import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, ExternalLink, Trash2, RefreshCw } from 'lucide-react';

const StockDetail = () => {
    const { ticker: rawTicker } = useParams();
    const ticker = rawTicker ? rawTicker.toUpperCase() : '';
    const navigate = useNavigate();
    const { stockData, fetchStockData, loading, error, removeStock } = usePortfolio();
    const [data, setData] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (stockData[ticker]) {
                setData(stockData[ticker]);
            } else {
                const result = await fetchStockData(ticker);
                setData(result);
            }
        };
        loadData();
    }, [ticker, stockData, fetchStockData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        const result = await fetchStockData(ticker, { forceRefresh: true });
        setData(result);
        setRefreshing(false);
    };

    if (loading && !data && !refreshing) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading logic...</div>;
    if (error || !data || data.error) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                <h2>Error Loading Data</h2>
                <p>{data?.error || error || "Unknown Error"}</p>
                <button onClick={() => navigate('/settings')} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>Check API Key</button>
            </div>
        );
    }

    const change = data.change || 0;
    const changePercent = data.changePercent || 0;
    const isPositive = change >= 0;
    const color = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';

    return (
        <div className="stock-detail-container" style={{ animation: 'fadeIn 0.5s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        marginRight: '8px',
                        padding: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-accent)'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        marginRight: '16px',
                        padding: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-accent)',
                        opacity: refreshing ? 0.5 : 1
                    }}
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={refreshing ? "spin" : ""} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>{data.ticker}</h1>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        {data.name}
                        {data.fetchedAt && <span style={{ fontSize: '0.8rem', marginLeft: '10px', color: 'var(--text-muted)' }}>Updated: {data.fetchedAt}</span>}
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${Number(data.price).toFixed(2)}</div>
                        <button
                            onClick={() => {
                                if (window.confirm(`Remove ${data.ticker} from portfolio?`)) {
                                    removeStock(data.ticker);
                                    navigate('/');
                                }
                            }}
                            data-testid="detail-delete-button"
                            style={{
                                background: 'rgba(255, 0, 0, 0.1)',
                                border: '1px solid var(--accent-red)',
                                color: 'var(--accent-red)',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Remove Stock"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                    <div style={{ color, fontWeight: '600' }}>
                        {change > 0 ? '+' : ''}{parseFloat(change).toFixed(2)} ({parseFloat(changePercent).toFixed(2)}%)
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="card" style={{ marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Price History (30 Days)</h3>
                {!data.history || data.history.length === 0 ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <p>No chart data available for this timeframe.</p>
                        {data.status && <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--accent-red)' }}>Status: {data.status}</p>}
                    </div>
                ) : (
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.history}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    tickFormatter={(val) => `$${val}`}
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    labelStyle={{ color: 'var(--text-muted)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={color}
                                    fillOpacity={1}
                                    fill="url(#colorPrice)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Dividend Info */}
            {data.dividends && (data.dividends.yield > 0 || data.dividends.rate > 0) && (
                <div className="card" style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Dividend Information</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                        <div className="stat-item">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Annual Yield</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {data.dividends?.yield ? `${data.dividends.yield.toFixed(2)}%` : 'N/A'}
                            </div>
                        </div>
                        <div className="stat-item">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Annual Rate</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                {data.dividends?.rate ? `$${data.dividends.rate.toFixed(2)}` : 'N/A'}
                            </div>
                        </div>
                        <div className="stat-item">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Last Payment</span>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                {data.dividends?.lastPaymentDate
                                    ? new Date(data.dividends.lastPaymentDate * 1000).toLocaleDateString()
                                    : '-'}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {data.dividends?.lastPaymentAmount ? `$${data.dividends.lastPaymentAmount.toFixed(2)}` : ''}
                            </div>
                        </div>
                        <div className="stat-item">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upcoming Payment</span>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                {data.dividends?.upcomingPaymentDate && data.dividends.upcomingPaymentDate > (data.dividends.lastPaymentDate || 0)
                                    ? new Date(data.dividends.upcomingPaymentDate * 1000).toLocaleDateString()
                                    : 'TBD'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* News Feed */}
            <div className="card">
                <h3 style={{ marginBottom: '20px' }}>Recent News</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {data.news && data.news.length > 0 ? (
                        data.news.map((item, index) => (
                            <div key={index} style={{
                                padding: '16px',
                                backgroundColor: 'rgba(255,255,255,0.02)',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${color}`
                            }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    {new Date(item.datetime * 1000).toLocaleDateString()}
                                </div>
                                <h4 style={{ marginBottom: '8px' }}>{item.headline}</h4>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>{item.summary}</p>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-blue)', fontSize: '0.9rem' }}
                                >
                                    Read Source <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                                </a>
                            </div>
                        ))
                    ) : (
                        <div style={{ color: 'var(--text-muted)' }}>No news available</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockDetail;
