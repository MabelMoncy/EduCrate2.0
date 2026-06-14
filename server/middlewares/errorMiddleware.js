const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const isLocalAddress = (address = '') => {
  const value = address.toLowerCase();
  return value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1';
};

const errorHandler = (err, req, res, next) => {
  const isCorsError = err?.message === 'Not allowed by CORS';
  const statusCode =
    res.statusCode === 200 ? (isCorsError ? 403 : 500) : res.statusCode;
  res.status(statusCode);

  const isDev = process.env.NODE_ENV === 'development';
  const isLocal = isLocalAddress(req.ip) || isLocalAddress(req.socket?.remoteAddress);

  // In production: generic message only, no internal details leak
  // In dev from localhost: include stack for debugging
  const body = { message: err.message };
  if (isDev && isLocal && err.stack) {
    body.stack = err.stack;
  }

  res.json(body);
};

export { notFound, errorHandler };
