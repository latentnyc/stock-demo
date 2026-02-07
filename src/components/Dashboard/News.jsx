import React, { useEffect, useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { ExternalLink, Newspaper } from 'lucide-react';

const NewsFeed = () => {
    const { fetchGeneralNews } = usePortfolio();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNews = async () => {
            const data = await fetchGeneralNews();
            setNews(data);
            setLoading(false);
        };
        loadNews();
    }, [fetchGeneralNews]);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading market news...
            </div>
        );
    }

    return (
        <div className="news-container" style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Newspaper size={24} style={{ marginRight: '12px', color: 'var(--accent-blue)' }} />
                <h1 style={{ fontSize: '2rem', margin: 0 }}>Market News</h1>
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
