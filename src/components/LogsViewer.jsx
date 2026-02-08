import React, { useState, useEffect } from 'react';
import { fetchInternal, getQueueDepth } from '../utils/api';
import { ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LogsViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [queueDepth, setQueueDepth] = useState(0);
    const [showCacheHits, setShowCacheHits] = useState(false);
    const navigate = useNavigate();

    // Use a ref to access the latest state inside the interval without re-creating the interval
    const showCacheHitsRef = React.useRef(showCacheHits);
    useEffect(() => {
        showCacheHitsRef.current = showCacheHits;
    }, [showCacheHits]);

    const fetchLogs = async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            // Pass the filter to the backend
            const res = await fetchInternal(`/logs?include_cache_hits=${showCacheHitsRef.current}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
            // Fetch queue depth from server (now async)
            const depth = await getQueueDepth();
            setQueueDepth(depth);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    // Re-fetch when the toggle changes
    useEffect(() => {
        fetchLogs();
    }, [showCacheHits]);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(() => {
            fetchLogs(true);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // No need to filter client-side anymore, but we can keep it for safety or remove it. 
    // Since backend now filters, we can just use `logs`.
    const filteredLogs = logs;

    return (
        <div className="logs-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <ArrowLeft size={20} style={{ marginRight: '8px' }} />
                        Back to Dashboard
                    </button>
                    <h1 style={{ margin: 0, fontSize: '1.5rem' }}>System Logs</h1>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-accent)',
                        padding: '4px 12px',
                        borderRadius: '16px',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        marginLeft: '16px'
                    }}>
                        <Layers size={14} style={{ marginRight: '6px' }} />
                        Queue Depth: <span style={{ fontWeight: 'bold', marginLeft: '4px', color: queueDepth > 0 ? 'var(--accent-orange)' : 'inherit' }}>{queueDepth}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <input
                            type="checkbox"
                            checked={showCacheHits}
                            onChange={(e) => setShowCacheHits(e.target.checked)}
                            style={{ accentColor: 'var(--accent-blue)' }}
                        />
                        Show Cache Hits
                    </label>
                    <button
                        onClick={() => fetchLogs(false)}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--bg-accent)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <RefreshCw size={16} style={{ marginRight: '8px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                            <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Timestamp</th>
                            <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Method</th>
                            <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>URL</th>
                            <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Status</th>
                            <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: log.cache_hit ? 0.6 : 1 }}>
                                <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 'bold', color: log.method === 'GET' ? 'var(--accent-blue)' : 'var(--accent-green)' }}>
                                    {log.method}
                                </td>
                                <td style={{ padding: '12px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.url}>
                                    {log.url}
                                    {log.cache_hit === 1 && <span style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-accent)', color: 'var(--text-secondary)' }}>CACHE</span>}
                                </td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: log.status >= 400 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                        color: log.status >= 400 ? 'var(--accent-red)' : 'var(--accent-green)'
                                    }}>
                                        {log.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                                    {log.duration}ms
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No logs available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogsViewer;
