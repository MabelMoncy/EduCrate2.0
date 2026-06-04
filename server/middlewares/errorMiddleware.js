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

  // M22 — removed SHOW_STACKTRACE env-var override (could accidentally leak stacks in production)
  // Stacks are only shown when NODE_ENV=development AND request is from localhost
  const shouldExposeStack =
    process.env.NODE_ENV === 'development' &&
    (isLocalAddress(req.ip) || isLocalAddress(req.socket?.remoteAddress));

  res.json({
    message: err.message,
    stack: shouldExposeStack ? err.stack : null,
  });
};

export { notFound, errorHandler };
