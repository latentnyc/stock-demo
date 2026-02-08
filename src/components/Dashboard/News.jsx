import React, { useEffect, useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { ExternalLink, Newspaper } from 'lucide-react';
import RefreshControl from '../common/RefreshControl';

const NewsFeed = () => {
    const { fetchGeneralNews } = usePortfolio();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadNews = React.useCallback(async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        const data = await fetchGeneralNews({ forceRefresh });

        // New structure: data = { articles: [], fetchedAt: timestamp }
        if (data && data.articles) {
            setNews(data.articles);
            setLastUpdated(data.fetchedAt);
        } else {
            // Fallback for safety/old version
            if (Array.isArray(data)) {
                setNews(data);
                setLastUpdated(Date.now()); // Fallback
            }
        }

        if (forceRefresh) setRefreshing(false);
        else setLoading(false);
    }, [fetchGeneralNews]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadNews(false);
    }, [loadNews]);

    const handleRefresh = () => {
        loadNews(true);
    };

    if (loading && !lastUpdated) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading market news...
            </div>
        );
    }

    return (
        <div className="news-container" style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Newspaper size={24} style={{ marginRight: '12px', color: 'var(--accent-blue)' }} />
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Market News</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <RefreshControl
                        onRefresh={handleRefresh}
                        loading={refreshing}
                        lastUpdated={lastUpdated}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
                {news.length > 0 ? (
                    news.map((item, index) => (
                        <div key={index} className="card" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '4px solid var(--accent-blue)',
                            transition: 'transform 0.2s',
                            cursor: 'default'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(item.datetime * 1000).toLocaleDateString()} • {item.source}
                                </span>
                            </div>

                            <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>{item.headline}</h3>

                            {item.summary && (
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                                    {item.summary}
                                </p>
                            )}

                            <div style={{ marginTop: 'auto' }}>
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
                                    Read Full Story <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No news available at the moment.
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsFeed;
