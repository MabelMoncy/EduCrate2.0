# Security Fixes Documentation for EduCrate2.0

**Author:** MabelMoncy  
**Date:** [Fill in Date]  
**Repo:** MabelMoncy/EduCrate2.0  
**Stage:** In Development (Private Repository)

---

## Summary

This document catalogs all security issues identified in the backend/server of EduCrate2.0 during code review, with each issue prioritized, explained, and paired with a recommended fix.  
**Follow this as a checklist before any public deployment.**

---

## Security Issues: Priority List & Fixes

---

### 1. [High] CORS Is Too Permissive

**What Happened:**  
The API currently accepts requests from any website (`origin: function (origin, cb) { cb(null, origin || true) }`). This oversharing enables any web domain to make requests to your backend.

**Risks if Not Fixed:**  
- Authenticated requests (if run in a browser) could be abused from any site, leading to Cross-Site Request Forgery (CSRF), data leaks, or unauthorized actions if credentials are stored by the browser.

**Suggested Fix:**  
Restrict the CORS origins strictly to your production front-end URL(s):

```js
const allowedOrigins = ['https://yourfrontend.example.com'];
app.use(cors({
  origin: (origin, cb) => allowedOrigins.includes(origin) ? cb(null, origin) : cb(new Error('Not allowed by CORS')),
  credentials: true,
}));
```

---

### 2. [High] No Brute Force Protection on Authentication

**What Happened:**  
The `/api/auth/login` route does not have a per-user or per-IP login attempt limit.

**Risks if Not Fixed:**  
- Attackers could repeatedly guess admin credentials, making it easier to brute-force passwords.
- Even in development/testing, this sets poor precedent.

**Suggested Fix:**  
Add a login rate limiter middleware just for the login route:

```js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts. Please try again later.",
});
router.post('/auth/login', loginLimiter, loginAdmin);
```

---

### 3. [High] Incomplete Input Sanitization (No Query Parameter Cleaning)

**What Happened:**  
Sanitization currently only covers `req.body` and `req.params` but **not** `req.query`, due to Express read-only quirk.

**Risks if Not Fixed:**  
- Untrusted query parameters may be used in database queries, allowing NoSQL injection (e.g., `?user[$ne]=null`), potentially leaking or modifying data.

**Suggested Fix:**  
Install and use a dedicated input sanitization middleware like `express-mongo-sanitize` for robust coverage:

```sh
npm install express-mongo-sanitize
```

```js
import mongoSanitize from 'express-mongo-sanitize';
app.use(mongoSanitize());
```

Or, explicitly sanitize query params by shallow copying and cleaning:

```js
app.use((req, _res, next) => {
  // ...existing...
  req.query = JSON.parse(JSON.stringify(req.query)); // makes writable!
  sanitize(req.query);
  next();
});
```

---

### 4. [Medium] Stack Trace Exposure in Non-Production

**What Happened:**  
Error responses include stack traces unless `NODE_ENV` is set to "production".

**Risks if Not Fixed:**  
- Sensitive internal server details can be exposed during accidents or if someone leaves NODE_ENV as "development" in staging/production.

**Suggested Fix:**  
Audit deployment scripts to always set `NODE_ENV=production` on any environment accessible by others. Consider also always suppressing stack traces for non-localhost clients.

---

### 5. [Medium] Revealing Authentication Error Messages

**What Happened:**  
Login responses differ between "user not found," "wrong password," and "not admin."

**Risks if Not Fixed:**  
- Enables attackers to enumerate users/emails and identify privileged accounts.

**Suggested Fix:**  
Always return a generic error message for login failures:

```js
throw new Error('Invalid credentials');
// (Use same message for non-existent user, wrong password, wrong role)
```

---

### 6. [Medium] Secret/Data Leaks from Mismanaged Environment Variables

**What Happened:**  
Cloudinary credentials, DB URI, and JWT secret depend on `.env`. Failure to protect .env or accidental logging could expose secrets.

**Risks if Not Fixed:**  
- Anyone with access to your repo or logs could recover critical credentials.

**Suggested Fix:**  
- Ensure `.env` is listed in `.gitignore`.
- Never print secrets.
- Audit cloud/API keys periodically and rotate before production.

---

### 7. [Low] Logging Sensitive Infrastructure Details

**What Happened:**  
Database connection logs may print server hostnames or instance details.

**Risks if Not Fixed:**  
- If logs are ever published by mistake, internal addresses or topology could be exposed.

**Suggested Fix:**  
Log generic success in production:

```js
if (process.env.NODE_ENV !== 'production') {
  console.log(`MongoDB Connected: ${conn.connection.host}`);
} else {
  console.log('Database connected');
}
```

---

### 8. [Low] Generic Error Status Handling

**What Happened:**  
The error middleware defaults to status 500 if none is set.

**Risks if Not Fixed:**  
- Inconsistent API errors, less predictable for users or monitoring tools.

**Suggested Fix:**  
In all controllers, always set correct status codes before throwing or handling errors.

---

## Final Notes

Since you are the only developer, and the project/repo is private and not live, these issues may be addressed later, but **absolutely must be fixed before any deployment, sharing, or going public**.

Copy this document into the root of your repo (*SecurityFix1.md*) and use it as your pre-launch security checklist.

---