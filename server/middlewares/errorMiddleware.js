const sanitizeLogInput = (input) => {
  if (input == null) return '';
  return String(input).replace(/[\r\n]/g, '');
};

const sanitizeStack = (stack) => {
  if (typeof stack !== 'string') return '';
  const atIndex = stack.search(/\n\s+at /);
  if (atIndex === -1) return sanitizeLogInput(stack);
  return sanitizeLogInput(stack.slice(0, atIndex)) + stack.slice(atIndex).replace(/\r/g, '');
};

const notFound = (req, res, next) => {
  const cleanUrl = sanitizeLogInput(req.originalUrl);
  const error = new Error(`Not Found - ${cleanUrl}`);
  res.status(404);
  next(error);
};

const isLocalAddress = (address = '') => {
  const value = address.toLowerCase();
  return value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1';
};

const errorHandler = (err, req, res, _next) => {
  const isCorsError = err?.message === 'Not allowed by CORS';
  const statusCode =
    res.statusCode === 200 ? (isCorsError ? 403 : 500) : res.statusCode;
  res.status(statusCode);

  const isProd = process.env.NODE_ENV === 'production';
  const isLocal = isLocalAddress(req.ip) || isLocalAddress(req.socket?.remoteAddress);
  const is5xx = statusCode >= 500;

  // Always log 5xx errors server-side so they appear in server logs
  if (is5xx) {
    const cleanMethod = sanitizeLogInput(req.method);
    const cleanUrl = sanitizeLogInput(req.originalUrl);
    const cleanMessage = sanitizeLogInput(err?.message);
    const cleanStack = sanitizeStack(err?.stack);
    console.error('[error] %s %s - %s\n%s', cleanMethod, cleanUrl, cleanMessage, cleanStack);
  }
  const body = {};
  if (is5xx && isProd) {
    // In production, never expose internal details for server errors
    body.error = 'An unexpected error occurred. Please try again later.';
  } else {
    // 4xx errors carry intentional, safe messages (e.g. "Invalid semester", "File too large")
    // In dev from localhost, also include stack for 5xx debugging
    body.message = err.message;
    if (!isProd && err.stack) {
      body.stack = err.stack;
    }
  }

  res.json(body);
};

export { notFound, errorHandler, sanitizeLogInput, sanitizeStack };
