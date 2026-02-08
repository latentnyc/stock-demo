// Simple Token Bucket Rate Limiter
// We'll limit to 5 calls per second (200ms spacing).

export const BASE_API_URL = '/api';

/**
 * Simple Token Bucket Rate Limiter
 * 
 * Implements a client-side rate limiter to prevent overwhelming the browser or backend with requests.
 * Uses a token bucket algorithm where tokens are refilled over time.
 */
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.tokens = maxRequests;
        this.lastRefill = Date.now();
        this.queue = [];
        this.processing = false;

        // Concurrency Control
        this.activeRequests = 0;
        // Browser typically has 6 connections per domain. 
        // We limit low-priority (throttled) requests to 3, leaving 3 for high-priority/internal.
        this.CONCURRENCY_LIMIT_LOW = 3;
    }

    refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        const tokensToAdd = Math.floor(timePassed * (this.maxRequests / this.timeWindow));

        if (tokensToAdd > 0) {
            this.tokens = Math.min(this.maxRequests, this.tokens + tokensToAdd);
            this.lastRefill = now;
        }
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            this.refill();

            const item = this.queue[0];
            const isHighPriority = item.priority === 'high';

            const hasTokens = this.tokens >= 1;
            // Check concurrency: High priority ignores the low limit (but still bounded by tokens/rate)
            const allowedConcurrency = isHighPriority || (this.activeRequests < this.CONCURRENCY_LIMIT_LOW);

            if (hasTokens && allowedConcurrency) {
                const { resolve, fn } = this.queue.shift();
                this.tokens--;
                this.activeRequests++;

                // Fire and forget (from queue perspective), but track active count
                fn()
                    .then(resolve)
                    .finally(() => {
                        this.activeRequests--;
                        this.processQueue(); // Release slot
                    });
            } else {
                if (!hasTokens) {
                    const timeToWait = (this.timeWindow / this.maxRequests) - (Date.now() - this.lastRefill);
                    await new Promise(r => setTimeout(r, Math.max(0, timeToWait + 10)));
                } else if (!allowedConcurrency) {
                    // Blocked by concurrency limit, wait for a request to finish.
                    // The finally block will trigger us again.
                    break;
                }
            }
        }

        this.processing = false;
    }

    enqueue(fn, priority = 'normal') {
        return new Promise((resolve) => {
            this.queue.push({ resolve, fn, priority });

            // Sort high priority to front
            if (priority === 'high') {
                const item = this.queue.pop();
                let lastHighIndex = -1;
                // findLastIndex not supported in all envs
                for (let i = this.queue.length - 1; i >= 0; i--) {
                    if (this.queue[i].priority === 'high') {
                        lastHighIndex = i;
                        break;
                    }
                }
                this.queue.splice(lastHighIndex + 1, 0, item);
            }

            this.processQueue();
        });
    }

    getQueueLength() {
        return this.queue.length;
    }
}

// Rate Limit: 10 requests per 200ms (50 req/s, burst of 10).
// Reduced burst from 100 to 10 to ensure we don't saturate the browser's persistent connection limit (max 6),
// allowing distinct requests (like logs) to slide in immediately.
const limiter = new RateLimiter(10, 200);

export const getQueueDepth = () => limiter.getQueueLength();

/**
 * Fetches data from a URL with rate limiting.
 * This is primarily used for external API calls or proxy calls that need to be throttled.
 * 
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options.
 * @returns {Promise<Response>} - The fetch response.
 */
export const fetchWithThrottle = async (url, options = {}) => {
    // If it's a proxy call, we prepend the backend URL
    const fullUrl = url.startsWith('http') ? url : `${BASE_API_URL}${url}`;
    const priority = options.priority || 'normal';

    return limiter.enqueue(async () => {
        const res = await fetch(fullUrl, options);
        if (res.status === 429) {
            // If we get a 429, we probably should back off more, but for now just throw
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        return res;
    }, priority);
};

/**
 * Fetches data from the internal backend without client-side rate limiting.
 * Use this for internal API endpoints that do not require throttling (e.g., database CRUD).
 * 
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options.
 * @returns {Promise<Response>} - The fetch response.
 */
export const fetchInternal = async (url, options = {}) => {
    // Internal fetch bypasses the rate limiter queue
    const fullUrl = url.startsWith('http') ? url : `${BASE_API_URL}${url}`;
    console.log(`[fetchInternal] Requesting: ${fullUrl}  Method: ${options.method || 'GET'}`);
    const res = await fetch(fullUrl, options);
    return res;
};

/**
 * Search for symbols (stocks, crypto, etc)
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export const searchSymbols = async (query) => {
    if (!query) return [];
    try {
        const res = await fetchWithThrottle(`/proxy/search?q=${encodeURIComponent(query)}`, { priority: 'high' });
        if (res.ok) {
            const data = await res.json();
            return data.result || [];
        }
        return [];
    } catch (e) {
        console.error("Search failed:", e);
        return [];
    }
};
