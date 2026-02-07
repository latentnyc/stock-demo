import { render, screen, act, waitFor } from '@testing-library/react';
import { PortfolioProvider, usePortfolio } from './PortfolioContext';
import { useEffect } from 'react';
import { vi, describe, it, expect } from 'vitest';

// Mock the api utils to avoid real network calls
vi.mock('../utils/api', () => ({
    fetchWithThrottle: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            c: 150.00,
            d: 2.5,
            dp: 1.5,
            h: 155,
            l: 145,
            t: [], // history timestamps
            c: []  // history closes
        })
    }))
}));

const TestComponent = ({ onStep }) => {
    const { apiKey, setApiKey, stockData, fetchStockData } = usePortfolio();

    return (
        <div>
            <div data-testid="api-key">{apiKey}</div>
            <div data-testid="stock-data-count">{Object.keys(stockData).length}</div>
            <div data-testid="apple-data">{stockData['AAPL'] ? stockData['AAPL'].name : 'No Data'}</div>
            <button onClick={() => fetchStockData('AAPL')}>Fetch AAPL</button>
            <button onClick={() => setApiKey('new-key')}>Set Key</button>
        </div>
    );
};

describe('PortfolioContext', () => {
    it('clears stockData cache when API key changes', async () => {
        render(
            <PortfolioProvider>
                <TestComponent />
            </PortfolioProvider>
        );

        // 1. Initial State: No Key
        expect(screen.getByTestId('api-key')).toHaveTextContent('');

        // 2. Fetch Data (Should be Mock because no key)
        const fetchBtn = screen.getByText('Fetch AAPL');
        await act(async () => {
            fetchBtn.click();
        });

        // Wait for data to populate
        await waitFor(() => {
            expect(screen.getByTestId('apple-data')).toHaveTextContent(/Mock/);
        });

        // Verify cache has 1 item
        expect(screen.getByTestId('stock-data-count')).toHaveTextContent('1');

        // 3. Change API Key
        const setKeyBtn = screen.getByText('Set Key');
        await act(async () => {
            setKeyBtn.click();
        });

        // 4. Verify Cache is Cleared
        // This is the CRITICAL expectation that validates the fix
        await waitFor(() => {
            expect(screen.getByTestId('stock-data-count')).toHaveTextContent('0');
            expect(screen.getByTestId('apple-data')).toHaveTextContent('No Data');
        });
    });
});
