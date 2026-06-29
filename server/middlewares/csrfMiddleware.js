/**
 * CSRF double-submit cookie protection (H6).
 *
 * On login, the server sets two cookies:
 *   - educrate_token: httpOnly, Secure, SameSite=Strict — inaccessible to JavaScript
 *   - csrf_token:     NOT httpOnly — readable by JavaScript via document.cookie
 *
 * For every state-changing request (POST/PATCH/PUT/DELETE, except the login route itself),
 * the client must echo the csrf_token value as an X-CSRF-Token request header.
 * The server compares the header value against the cookie value.
 *
 * This prevents cross-site request forgery because:
 * 1. SameSite=Strict on the session cookie blocks cross-origin cookie submission
 * 2. A cross-origin attacker cannot read the csrf_token cookie value to forge the header
 */
export const csrfMiddleware = (req, res, next) => {
    const STATE_CHANGING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];
    // Login route has no session yet — exempt from CSRF check
    // Webhook route must be exempt since it comes from an external service (Razorpay)
    const CSRF_EXEMPT_PATHS = ['/api/auth/login', '/api/orders/webhook'];
    const authHeader = req.headers.authorization || '';

    if (!STATE_CHANGING_METHODS.includes(req.method)) {
        return next();
    }

    // Exact path match for exempt routes
    if (CSRF_EXEMPT_PATHS.includes(req.path)) {
        return next();
    }

    // Firebase users authenticate with an explicit bearer token header, not
    // ambient browser cookies. CSRF targets ambient credentials, so bearer-token
    // requests are handled by token verification at the protected route.
    if (/^Bearer\s+.+/i.test(authHeader)) {
        return next();
    }

    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        res.status(403);
        return next(new Error('CSRF token mismatch'));
    }

    next();
};
