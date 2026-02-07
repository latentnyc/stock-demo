import React, { useEffect, useState } from 'react';
import { fetchWithThrottle } from '../../utils/api';
import { ExternalLink, RefreshCw } from 'lucide-react';

const News = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadNews = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchWithThrottle('/proxy/news?category=general');
            if (!res.ok) {
                throw new Error('Failed to fetch news');
            }
            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setNews(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading news:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNews();
    }, []);

    return (
        <div className="news-container" style={{ animation: 'fadeIn 0.5s ease', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Market News</h1>
                    <div style={{ color: 'var(--text-secondary)' }}>Latest updates from the global markets</div>
                </div>
                <button
                    onClick={loadNews}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: 'var(--bg-accent)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <RefreshCw size={18} className={loading ? 'spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div style={{
                    padding: '20px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid var(--accent-red)',
                    color: 'var(--accent-red)'
                }}>
                    Error: {error}
                </div>
            )}

            {loading && news.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    Loading market news...
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {news.length > 0 ? (
                        news.map((item, index) => (
                            <div key={item.id || index} className="card" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s',
                                cursor: 'default'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: '600' }}>
                                        {item.source}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(item.datetime * 1000).toLocaleString()}
                                    </div>
                                </div>

                                <h3 style={{ marginBottom: '12px', lineHeight: '1.4' }}>{item.headline}</h3>

                                {item.summary && (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '16px', flex: 1 }}>
                                        {item.summary}
                                    </p>
                                )}

                                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            color: 'var(--accent-blue)',
                                            fontWeight: '500',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        Read Full Story <ExternalLink size={16} style={{ marginLeft: '6px' }} />
                                    </a>
                                </div>
                            </div>
                        ))
                    ) : (
                        !loading && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No news articles found.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default News;
