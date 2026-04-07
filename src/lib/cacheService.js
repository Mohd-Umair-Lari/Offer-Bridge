// Cache utilities for efficient data management
const CACHE_KEYS = {
  REQUESTS: 'offerbridge_requests',
  OFFERS: 'offerbridge_offers',
  ESCROW: 'offerbridge_escrow',
  DISPUTES: 'offerbridge_disputes',
  TIMESTAMP: 'offerbridge_cache_timestamp',
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const CacheService = {
  // Get cached data if still fresh
  get: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(key);
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
      if (cached && timestamp && Date.now() - parseInt(timestamp) < CACHE_DURATION) {
        return JSON.parse(cached);
      }
      // Cache expired or invalid
      CacheService.clear();
      return null;
    } catch {
      return null;
    }
  },

  // Set cache
  set: (key, data) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
      console.log('[Cache] Set:', key);
    } catch {
      console.warn('[Cache] Failed to set:', key);
    }
  },

  // Clear all cache (call on logout or session change)
  clear: () => {
    if (typeof window === 'undefined') return;
    try {
      Object.values(CACHE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('[Cache] Cleared');
    } catch {
      console.warn('[Cache] Failed to clear');
    }
  }
};

// Retry logic with exponential backoff
export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`[Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};
