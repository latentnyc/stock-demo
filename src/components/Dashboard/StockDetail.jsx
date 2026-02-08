import React from 'react';
import { useParams } from 'react-router-dom';
import StockView from './StockView';

const StockDetail = () => {
    const { ticker: rawTicker } = useParams();
    const ticker = rawTicker ? rawTicker.toUpperCase() : '';

    return <StockView ticker={ticker} isIndex={false} />;
};

export default StockDetail;
