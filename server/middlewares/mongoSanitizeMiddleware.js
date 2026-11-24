import expressMongoSanitize from 'express-mongo-sanitize';

const sanitizeQueryObject = (query = {}) => {
  if (!query || typeof query !== 'object' || Array.isArray(query)) return {};
  const clonedQuery = structuredClone(query);
  return expressMongoSanitize.sanitize(clonedQuery, { allowDots: false }) || {};
};

const mongoSanitize = () => (req, _res, next) => {
  if (req.body) expressMongoSanitize.sanitize(req.body, { allowDots: false });
  if (req.params) expressMongoSanitize.sanitize(req.params, { allowDots: false });
  if (req.query) {
    const sanitizedQuery = sanitizeQueryObject(req.query);
    Object.defineProperty(req, 'query', {
      value: sanitizedQuery,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
};

export { sanitizeQueryObject, mongoSanitize };
