
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import { Home, LineChart, PieChart, Newspaper, ScrollText, Search, User, Bell, LogOut, LogIn, Upload } from 'lucide-react';
import { searchSymbols } from '../../utils/api';
import '../../styles/index.css';
import MarketStatusModal from '../common/MarketStatusModal';

// eslint-disable-next-line no-unused-vars
const SidebarItem = ({ icon: SidebarIcon, label, active, onClick }) => (
    <div onClick={onClick} style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        marginBottom: '8px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: active ? 'rgba(0, 255, 136, 0.1)' : 'transparent',
        color: active ? 'var(--accent-green)' : 'var(--text-secondary)',
        transition: 'all 0.2s ease',
    }}>
        <SidebarIcon size={20} style={{ marginRight: '12px' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{label}</span>
    </div>
);

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { marketStatus, alerts, markAlertsAsRead, fetchMarketStatus } = usePortfolio();
    const { user, isAuthenticated, logout } = useAuth(); // Get auth state
    const [showAlerts, setShowAlerts] = React.useState(false);
    const [showMarketModal, setShowMarketModal] = React.useState(false);
    const alertRef = React.useRef(null);

    // Search Logic
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [showResults, setShowResults] = React.useState(false);
    const searchRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (alertRef.current && !alertRef.current.contains(event.target)) {
                setShowAlerts(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        if (showAlerts || showResults) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAlerts, showResults]);

    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.length > 2) {
                setIsSearching(true);
                setShowResults(true);
                const results = await searchSymbols(searchQuery);
                // Filter to only stocks/ETFs if needed.
                // Let's filter out non-US if possible or just show all. 
                // For now, simple slice
                setSearchResults(results.slice(0, 8));
                setIsSearching(false);
            } else if (searchQuery.length === 0) {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <aside style={{
                width: 'var(--sidebar-width)',
                padding: '24px',
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                backgroundColor: 'var(--bg-secondary)',
                zIndex: 10
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '48px',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)'
                }}>
                    <LineChart size={24} color="var(--accent-green)" style={{ marginRight: '10px' }} />
                    PatentInvestor
                </div>

                <nav style={{ flex: 1 }}>
                    <SidebarItem icon={Home} label="Dashboard" active={location.pathname === '/'} onClick={() => navigate('/')} />
                    <SidebarItem icon={LineChart} label="Market" active={location.pathname === '/market'} onClick={() => navigate('/market')} />
                    <SidebarItem icon={PieChart} label="Portfolio" active={location.pathname === '/portfolio'} onClick={() => navigate('/portfolio')} />
                    <SidebarItem icon={Newspaper} label="News" active={location.pathname === '/news'} onClick={() => navigate('/news')} />
                    <SidebarItem icon={Upload} label="Import" active={location.pathname === '/import'} onClick={() => navigate('/import')} />
                    <SidebarItem icon={ScrollText} label="Logs" active={location.pathname === '/logs'} onClick={() => navigate('/logs')} />
                </nav>

                <div className="glass-panel" style={{
                    padding: '16px',
                    borderRadius: '12px',
                    marginTop: 'auto'
                }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Market Status</div>
                    <div
                        onClick={() => {
                            fetchMarketStatus();
                            setShowMarketModal(true);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-secondary)',
                            borderRadius: '50%',
                            marginRight: '8px',
                            boxShadow: marketStatus.isOpen ? '0 0 8px var(--accent-green)' : 'none'
                        }}></span>
                        {marketStatus.isOpen ? 'Open' : 'Closed'}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                marginLeft: 'var(--sidebar-width)',
                flex: 1,
                padding: '0 40px 40px 40px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <header style={{
                    height: 'var(--header-height)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '20px',
                    marginBottom: '20px'
                }}>
                    {/* Search Bar */}
                    <div style={{
                        position: 'relative',
                        width: '400px'
                    }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search stocks, ETFs, news..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 16px 12px 48px',
                                backgroundColor: 'var(--bg-accent)',
                                border: '1px solid transparent',
                                borderRadius: '50px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                fontSize: '0.9rem',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--border-color)';
                                if (searchResults.length > 0) setShowResults(true);
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'transparent';
                                // Simple blur handling, click outside hook handles close
                            }}
                        />

                        {/* Search Results Dropdown */}
                        {showResults && (
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '50px',
                                left: '0',
                                width: '100%',
                                padding: '8px',
                                borderRadius: '16px',
                                zIndex: 1000,
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }} ref={searchRef}>
                                {isSearching ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        Searching...
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(result => (
                                        <div
                                            key={result.symbol}
                                            onClick={() => {
                                                navigate(`/stock/${result.symbol}`);
                                                setSearchQuery('');
                                                setShowResults(false);
                                                setSearchResults([]);
                                            }}
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 'bold' }}>{result.symbol}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{result.description}</span>
                                            </div>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
                                                {result.type}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No results found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ position: 'relative' }} ref={alertRef}>
                            <Bell
                                size={20}
                                color="var(--text-secondary)"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setShowAlerts(!showAlerts)}
                            />
                            {alerts.some(a => !a.read) && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: 'var(--accent-red)',
                                    borderRadius: '50%',
                                    border: '1px solid var(--bg-primary)'
                                }} />
                            )}

                            {showAlerts && (
                                <div className="glass-panel" style={{
                                    position: 'absolute',
                                    top: '40px',
                                    right: '0',
                                    width: '320px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    zIndex: 1000,
                                    border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h4 style={{ margin: 0 }}>Alerts</h4>
                                        {alerts.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    markAlertsAsRead();
                                                    // Optional: close on mark read? No, user might want to review.
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--accent-green)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {alerts.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                No alerts yet.
                                            </div>
                                        ) : (
                                            alerts.map(alert => (
                                                <div key={alert.id} style={{
                                                    padding: '12px',
                                                    marginBottom: '8px',
                                                    backgroundColor: alert.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                                                    borderRadius: '8px',
                                                    borderLeft: `3px solid ${alert.type === 'up' ? 'var(--accent-green)' : 'var(--accent-red)'}`
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{alert.ticker}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem' }}>
                                                        Movin {alert.type === 'up' ? 'up' : 'down'} <span style={{
                                                            color: alert.type === 'up' ? 'var(--accent-green)' : 'var(--accent-red)',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {Math.abs(alert.changePercent).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAuthenticated ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user?.name}</span>
                                {user?.picture ? (
                                    <img
                                        src={user.picture}
                                        alt={user.name}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--bg-accent)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <User size={18} color="var(--text-primary)" />
                                    </div>
                                )}
                                <LogOut
                                    size={20}
                                    color="var(--text-secondary)"
                                    style={{ cursor: 'pointer' }}
                                    onClick={logout}
                                    title="Logout"
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--accent-green)',
                                    color: '#000',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                <LogIn size={18} />
                                Login
                            </button>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <div style={{ flex: 1 }}>
                    {children}
                </div>
            </main>
            <MarketStatusModal
                isOpen={showMarketModal}
                onClose={() => setShowMarketModal(false)}
            />
        </div>
    );
};

export default Layout;
