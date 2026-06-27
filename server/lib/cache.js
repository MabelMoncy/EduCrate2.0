import NodeCache from 'node-cache';

// Cache items for 5 minutes by default
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

/**
 * Middleware to cache API responses
 * @param {number} duration - TTL in seconds
 */
export const cacheMiddleware = (duration = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Use URL + query params as the cache key
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = cache.get(key);

    if (cachedBody) {
      return res.json(cachedBody);
    }

    // Override res.json to store the response body in cache before sending
    const originalJson = res.json;
    res.json = (body) => {
      cache.set(key, body, duration);
      originalJson.call(res, body);
    };

    next();
  };
};

/**
 * Utility to clear cache for specific routes or entirely
 * @param {string|null} routePattern - substring to match routes to clear, or null to clear all
 */
export const clearCache = (routePattern = null) => {
  if (!routePattern) {
    cache.flushAll();
    return;
  }
  
  const keys = cache.keys();
  const keysToDelete = keys.filter(k => k.includes(routePattern));
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
  }
};
