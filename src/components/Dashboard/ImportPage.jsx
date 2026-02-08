import React, { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ImportPage = () => {
    const { importPortfolio } = usePortfolio();
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);

    const parseData = (inputText) => {
        if (!inputText.trim()) {
            setPreviewData([]);
            setError('');
            return;
        }

        const lines = inputText.split(/\n/);
        const parsed = [];
        let parseError = '';

        lines.forEach((line) => {
            if (!line.trim()) return;

            // Split by comma, tab, or multiple spaces
            // Regex: split by comma, tab, or space but handle multiple spaces as one delimiter if not using comma?
            // Simple approach: replace commas with spaces, replace tabs with spaces, then split by space
            const normalized = line.replace(/,/g, ' ').replace(/\t/g, ' ').trim();
            const parts = normalized.split(/\s+/);

            if (parts.length >= 3) {
                const ticker = parts[0].toUpperCase();
                const quantity = parseFloat(parts[1]);
                const costBasis = parseFloat(parts[2]);

                if (!ticker || isNaN(quantity) || isNaN(costBasis)) {
                    // Skip invalid lines or flag them?
                    // For now, consistent with user request "Ticker, Shares, Cost Basis"
                } else {
                    parsed.push({ ticker, quantity, average_price: costBasis });
                }
            }
        });

        if (parsed.length === 0 && inputText.trim().length > 0) {
            parseError = 'Could not parse any valid data. Format: Ticker, Shares, Cost Basis';
        }

        setError(parseError);
        setPreviewData(parsed);
    };

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        parseData(val);
    };

    const handleImport = async () => {
        if (previewData.length === 0) return;

        if (window.confirm('WARNING: This will replace your ENTIRE portfolio with the data below. This action cannot be undone. Are you sure?')) {
            setImporting(true);
            const success = await importPortfolio(previewData);
            setImporting(false);
            if (success) {
                navigate('/portfolio');
            } else {
                setError('Failed to import data. Please check server logs.');
            }
        }
    };

    return (
        <div style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Import Portfolio</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Bulk import your holdings. This will replace your current portfolio.
                </p>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <AlertTriangle size={24} color="var(--accent-yellow)" style={{ flexShrink: 0, marginTop: '4px' }} />
                    <div>
                        <h3 style={{ marginBottom: '8px', color: 'var(--accent-yellow)' }}>Wait! Read this first.</h3>
                        <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                            Pasting data below will <strong>replace all existing holdings</strong>.
                            Please format your data as <code>Ticker, Shares, Cost Basis</code>.
                            Delimiters can be commas, tabs, or spaces.
                        </p>
                    </div>
                </div>

                <textarea
                    value={text}
                    onChange={handleTextChange}
                    placeholder={`AAPL, 10, 150.00\nGOOG 5 2800.50\nMSFT    20    300`}
                    style={{
                        width: '100%',
                        height: '250px',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '16px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        outline: 'none',
                        resize: 'vertical',
                        marginBottom: '16px',
                        fontSize: '0.95rem'
                    }}
                />

                {error && <div style={{ color: 'var(--accent-red)', marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleImport}
                        disabled={importing || previewData.length === 0}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: previewData.length > 0 ? 'var(--accent-red)' : 'var(--bg-secondary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: importing || previewData.length === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: importing || previewData.length === 0 ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Upload size={18} />
                        {importing ? 'Importing...' : 'Reset and Import Data'}
                    </button>
                </div>
            </div>

            {/* Preview Section */}
            {previewData.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={20} color="var(--accent-green)" />
                        Preview ({previewData.length} items)
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Ticker</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Shares</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Cost Basis</th>
                                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.ticker}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>${item.average_price.toFixed(2)}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>${(item.quantity * item.average_price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportPage;
