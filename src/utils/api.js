// Simple Token Bucket Rate Limiter
// We'll limit to 5 calls per second (200ms spacing).

export const BASE_API_URL = 'http://localhost:3002/api';

class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.tokens = maxRequests;
        this.lastRefill = Date.now();
        this.queue = [];
        this.processing = false;
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

            if (this.tokens > 0) {
                const { resolve, fn } = this.queue.shift();
                this.tokens--;
                fn().then(resolve);
            } else {
                const timeToWait = (this.timeWindow / this.maxRequests) - (Date.now() - this.lastRefill);
                await new Promise(r => setTimeout(r, Math.max(0, timeToWait + 10))); // Wait a bit
            }
        }

        this.processing = false;
    }

    enqueue(fn) {
        return new Promise((resolve) => {
            this.queue.push({ resolve, fn });
            this.processQueue();
        });
    }
}

// 5 requests per 1000ms = 5 req/s
const limiter = new RateLimiter(5, 1000);

export const fetchWithThrottle = async (url, options = {}) => {
    // If it's a proxy call, we prepend the backend URL
    const fullUrl = url.startsWith('http') ? url : `${BASE_API_URL}${url}`;

    return limiter.enqueue(async () => {
        try {
            const res = await fetch(fullUrl, options);
            if (res.status === 429) {
                // If we get a 429, we probably should back off more, but for now just throw
                throw new Error('Rate limit exceeded. Please try again later.');
            }
            return res;
        } catch (err) {
            throw err;
        }
    });
};
