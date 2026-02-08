import React from 'react';
import Modal from './Modal';
import { usePortfolio } from '../../context/PortfolioContext';
import { Activity } from 'lucide-react';

const MarketStatusModal = ({ isOpen, onClose }) => {
    const { marketStatus } = usePortfolio();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Market Status"
        >
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{
                        padding: '12px',
                        borderRadius: '50%',
                        backgroundColor: marketStatus.isOpen ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)'
                    }}>
                        <Activity size={32} color={marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-secondary)'} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: marketStatus.isOpen ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                            {marketStatus.isOpen ? 'Market is Open' : 'Market is Closed'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Region: {marketStatus.exchange || 'US'} • Timezone: {marketStatus.timezone || 'ET'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>Current Status</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                            {marketStatus.status || (marketStatus.isOpen ? 'REGULAR' : 'CLOSED')}
                        </div>
                    </div>
                    <div style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                            {marketStatus.isOpen ? 'Closes At' : 'Next Open'}
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: '500', color: marketStatus.isOpen ? 'var(--text-primary)' : 'var(--accent-green)' }}>
                            {marketStatus.isOpen ? (marketStatus.nextClose || "4:00 PM ET") : (marketStatus.nextOpen || "Calculating...")}
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '16px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: 'var(--text-muted)'
                }}>
                    <div style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>Market Hours</div>
                    Standard trading hours are Monday through Friday, 9:30 AM to 4:00 PM ET.
                    Pre-market trading (4:00 AM - 9:30 AM) and after-hours trading (4:00 PM - 8:00 PM) are available on some platforms.
                </div>
            </div>
        </Modal>
    );
};

export default MarketStatusModal;
