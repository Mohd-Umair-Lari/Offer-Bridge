const CACHE_KEYS = {
  REQUESTS: 'offerbridges_requests',
  OFFERS: 'offerbridges_offers',
  ESCROW: 'offerbridges_escrow',
  DISPUTES: 'offerbridges_disputes',
  TIMESTAMP: 'offerbridges_cache_timestamp',
};

const CACHE_DURATION = 5 * 60 * 1000;

export const CacheService = {
  get: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(key);
      const timestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP);
      if (cached && timestamp && Date.now() - parseInt(timestamp) < CACHE_DURATION) {
        return JSON.parse(cached);
      }
      CacheService.clear();
      return null;
    } catch {
      return null;
    }
  },

  set: (key, data) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString());
    } catch { /* storage unavailable */ }
  },

  clear: () => {
    if (typeof window === 'undefined') return;
    try {
      Object.values(CACHE_KEYS).forEach(key => localStorage.removeItem(key));
    } catch { /* storage unavailable */ }
  }
};

export const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};
