import React, { useState, useEffect } from 'react';
import { fetchWithThrottle } from '../utils/api';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LogsViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetchWithThrottle('/logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

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
                </div>
                <button
                    onClick={fetchLogs}
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
                        {logs.map((log) => (
                            <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </td>
                                <td style={{ padding: '12px', fontWeight: 'bold', color: log.method === 'GET' ? 'var(--accent-blue)' : 'var(--accent-green)' }}>
                                    {log.method}
                                </td>
                                <td style={{ padding: '12px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.url}>
                                    {log.url}
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
                {logs.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No logs available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogsViewer;
