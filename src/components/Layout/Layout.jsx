import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import { Home, LineChart, PieChart, Newspaper, ScrollText, Search, User, Bell, LogOut, LogIn } from 'lucide-react'; // Add LogOut, LogIn icons
import '../../styles/index.css';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
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
        <Icon size={20} style={{ marginRight: '12px' }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{label}</span>
    </div>
);

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { marketStatus } = usePortfolio();
    const { user, isAuthenticated, logout } = useAuth(); // Get auth state

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
                    GeminiInvestor
                </div>

                <nav style={{ flex: 1 }}>
                    <SidebarItem icon={Home} label="Dashboard" active={location.pathname === '/'} onClick={() => navigate('/')} />
                    <SidebarItem icon={LineChart} label="Market" onClick={() => { }} />
                    <SidebarItem icon={PieChart} label="Portfolio" active={location.pathname === '/portfolio'} onClick={() => navigate('/portfolio')} />
                    <SidebarItem icon={Newspaper} label="News" active={location.pathname === '/news'} onClick={() => navigate('/news')} />
                    <SidebarItem icon={ScrollText} label="Logs" active={location.pathname === '/logs'} onClick={() => navigate('/logs')} />
                </nav>

                <div className="glass-panel" style={{
                    padding: '16px',
                    borderRadius: '12px',
                    marginTop: 'auto'
                }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Market Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', color: marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: '600', fontSize: '0.9rem' }}>
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
                            onFocus={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'transparent'}
                        />
                    </div>

                    {/* User Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />

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
        </div>
    );
};

export default Layout;
