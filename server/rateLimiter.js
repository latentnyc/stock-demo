
class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests; // Burst capacity (slots)
        this.timeWindow = timeWindow;
        this.tokens = maxRequests;
        this.lastRefill = Date.now();
        this.queue = [];
        this.activeRequests = 0;

        // Configuration for priority levels
        // Total slots: 5
        // Reserved for High Priority: 1
        // Low Priority Max Concurrency: 4
        this.LOW_PRIORITY_LIMIT = 4;

        this.processing = false;
    }

    refill() {
        const now = Date.now();
        const timePassed = now - this.lastRefill;
        // Refill Rate: 2 requests per second (1 token every 500ms)
        // We calculate tokens to add based on time passed and the configured rate.
        // The constructor arguments (5, 2500) give us 5 tokens / 2500ms = 0.002 tokens/ms = 2 tokens/s.
        const tokensToAdd = (timePassed * (this.maxRequests / this.timeWindow));

        if (tokensToAdd >= 1) { // Only add full tokens effectively, or float?
            // Helper for float tokens if we want smooth refilling, but integer is safer for discrete requests.
            // Let's use floor but keep track of remainder if we wanted high precision, 
            // but simpler: only update if >= 1
            const wholeTokens = Math.floor(tokensToAdd);
            if (wholeTokens > 0) {
                this.tokens = Math.min(this.maxRequests, this.tokens + wholeTokens);
                this.lastRefill = now; // Reset time only when we add tokens to avoid drift? 
                // Better: this.lastRefill = now - (timePassed % interval) ? 
                // Simple version:
                this.lastRefill = now;
            }
        }
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;

        // Keep processing as long as we have valid items
        while (this.queue.length > 0) {
            this.refill();

            // Peek at the first item
            const item = this.queue[0];
            const isHighPriority = item.priority === 'high';

            // Check conditions to start a REQUEST
            // 1. Must have tokens (Global Rate Limit)
            // 2. Must have open slots (Concurrency Limit)
            // 3. If Low Priority, must be under Low Priority Limit

            const hasToken = this.tokens >= 1;
            const hasSlot = this.activeRequests < this.maxRequests;
            const allowedByPriority = isHighPriority || (this.activeRequests < this.LOW_PRIORITY_LIMIT);

            if (hasToken && hasSlot && allowedByPriority) {
                // Start the request
                this.queue.shift(); // Remove from queue
                this.tokens -= 1;
                this.activeRequests += 1;

                // Execute without awaiting completion (Parallel)
                item.fn()
                    .then(res => item.resolve(res))
                    .catch(err => item.resolve({ error: err }))
                    .finally(() => {
                        this.activeRequests -= 1;
                        this.processQueue(); // Trigger queue check when a slot frees up
                    });

            } else {
                // Determine why we blocked to wait intelligently
                if (!hasToken) {
                    // Wait for refill
                    // Time for 1 token: (this.timeWindow / this.maxRequests);
                    // Simplification: wait 100ms and retry
                    await new Promise(r => setTimeout(r, 100));
                } else if (!hasSlot || !allowedByPriority) {
                    // Wait for a request to finish. 
                    // Since we trigger processQueue in finally, we can just break loop and wait.
                    // But we should ensure we don't spin.
                    break;
                }
            }
        }

        this.processing = false;
    }

    enqueue(fn, priority = 'normal') {
        return new Promise((resolve, reject) => {
            this.queue.push({
                resolve: (res) => {
                    if (res && res.error) reject(res.error);
                    else resolve(res);
                },
                fn,
                priority
            });
            // Sort queue? Priority items should jump ahead?
            // "Ensure a slot is always available" implies reservation, but maybe also ordering.
            // Let's bring high priority to front.
            if (priority === 'high') {
                // Move this item to the front of the queue (or behind other high priority items)
                // Filter out the item we just pushed
                const item = this.queue.pop();

                let lastHighIndex = -1;
                // findLastIndex fallback
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

// Global instance:
// 5 Concurrent Slots (Burst)
// Refill Rate: 2 requests/sec -> 5 tokens / 2500ms
const limiter = new RateLimiter(5, 2500);

export default limiter;
