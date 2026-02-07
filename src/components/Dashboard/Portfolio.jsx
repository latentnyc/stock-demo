import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext';
import { ScrollText, Activity, Trash2 } from 'lucide-react';

const Portfolio = () => {
    const navigate = useNavigate();
    const { addStock, portfolio, stockData, loading, marketStatus, removeStock } = usePortfolio();
    const [ticker, setTicker] = useState('');
    const [quantity, setQuantity] = useState('');
    const [error, setError] = useState('');

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!ticker || !quantity) return;

        try {
            setError('');
            const success = await addStock(ticker, quantity);
            if (success) {
                setTicker('');
                setQuantity('');
            } else {
                setError('Invalid ticker or API error. Check Settings.');
            }
        } catch (err) {
            setError('Failed to add stock');
        }
    };

    const totalValue = portfolio.reduce((sum, item) => {
        const price = stockData[item.ticker]?.price || 0;
        return sum + (price * item.quantity);
    }, 0);

    return (
        <div className="dashboard-container">
            <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Market Intelligence</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Real-time analysis for the modern investor.</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {/* Market Status */}
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
            </div>

            {/* Add Stock Form */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '32px' }}>
                <h3 style={{ marginBottom: '16px' }}>Add Position</h3>
                <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Ticker (e.g. AAPL)"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        data-testid="ticker-input"
                        style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-accent)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            outline: 'none'
                        }}
                    />
                    <input
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        data-testid="quantity-input"
                        style={{
                            padding: '12px 16px',
                            backgroundColor: 'var(--bg-accent)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        data-testid="add-stock-button"
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'var(--accent-green)',
                            color: 'var(--bg-primary)',
                            fontWeight: '600',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Adding...' : 'Add Position'}
                    </button>
                </form>
                {error && <p style={{ color: 'var(--accent-red)', marginTop: '12px' }}>{error}</p>}
            </div>

            {/* Portfolio Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Total Value Card */}
                <div className="card">
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Portfolio Value</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {/* Removed static "Today (Mock)" */}
                </div>

                {/* Holdings List */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h4 style={{ marginBottom: '16px' }}>Your Holdings</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {portfolio.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }} data-testid="no-holdings-message">No holdings yet. Add a stock above.</p>
                        ) : (
                            portfolio.map((item) => {
                                const data = stockData[item.ticker] || {};
                                const currentPrice = data.price || 0;
                                const change = data.changePercent || 0;
                                const value = currentPrice * item.quantity;

                                const handleDelete = (e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to remove ${item.ticker}?`)) {
                                        // In a real app we might want error handling here, 
                                        // but for now we'll rely on the optimistic update/reload in context
                                        const remove = async () => {
                                            await loading; // primitive wait if needed, but context handles it
                                            // Actuall logic is in context
                                            usePortfolio().removeStock(item.ticker);
                                        }
                                        // Correction: we can't call hook in callback. 
                                        // We should use the removeStock from the destuctured props above.
                                        // Wait, I need to make sure removeStock is available in scope.
                                        // It isn't destructured in the original code.
                                    }
                                };

                                // wait, I can't use hooks inside map or callback. 
                                // I need to pass removeStock from the component scope.

                                return (
                                    <div
                                        key={item.ticker}
                                        onClick={() => navigate(`/stock/${item.ticker}`)}
                                        data-testid={`holding-item-${item.ticker}`}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                                            padding: '12px',
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
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.quantity} shares</div>
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
                                        </div>
                                        <div style={{ textAlign: 'right', paddingLeft: '16px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Remove ${item.ticker} from portfolio?`)) {
                                                        removeStock(item.ticker);
                                                    }
                                                }}
                                                data-testid={`delete-button-${item.ticker}`}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    padding: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '4px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = 'var(--accent-red)';
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = 'var(--text-muted)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                title="Remove Stock"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Portfolio;
