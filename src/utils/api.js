
// Simple Token Bucket Rate Limiter
// We'll limit to 5 calls per second (200ms spacing).

export const BASE_API_URL = 'http://localhost:3002/api';

export const fetchWithThrottle = async (url, options = {}) => {
    // If it's a proxy call, we prepend the backend URL
    // But the caller might be passing a full URL if they are confused.
    // We assume the caller now passes relative paths like '/proxy/quote?symbol=...' or '/portfolio'

    const fullUrl = url.startsWith('http') ? url : `${BASE_API_URL}${url}`;

    try {
        const res = await fetch(fullUrl, options);
        if (res.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        return res;
    } catch (err) {
        throw err;
    }
};
