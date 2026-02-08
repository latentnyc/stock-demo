import React from 'react';
import { RefreshCw, Clock } from 'lucide-react';

const RefreshControl = ({ onRefresh, lastUpdated, loading }) => {
    // Format timestamp
    const formattedTime = lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {lastUpdated && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                }}>
                    <Clock size={14} />
                    <span>Last updated: {formattedTime}</span>
                </div>
            )}
            <button
                onClick={onRefresh}
                disabled={loading}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: loading ? 'var(--text-muted)' : 'var(--accent-blue)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'all 0.2s',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
            >
                <RefreshCw size={16} className={loading ? 'spin' : ''} />
                Refresh
            </button>
            <style>
                {`
@keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
}
                    .spin {
    animation: spin 1s linear infinite;
}
`}
            </style>
        </div>
    );
};

export default RefreshControl;
