# Bugfix Requirements Document

## Introduction

EduCrate 2.0 is a production-bound MERN stack web application that was built with a focus on UI and functionality, with security treated as a secondary concern. A comprehensive security audit of the full codebase — server and client — has revealed a set of vulnerabilities spanning authentication, authorization, input validation, API security, file handling, secrets management, and client-side storage.

This document captures all identified security defects using the bug condition methodology, organized by priority (🔴 HIGH → 🟡 MEDIUM → 🟢 LOW). Each finding documents the exact conditions that trigger the vulnerability (Current Behavior), what must happen instead (Expected Behavior), and what existing behavior must be preserved (Unchanged Behavior).

---

## Bug Analysis

### Current Behavior (Defect)

---

#### 🔴 HIGH — Authentication & Authorization

**1.1 Unprotected Upload Endpoint — Unauthenticated Write Access**

File: `server/routes/apiRoutes.js` (line 23)

```
router.route('/resources')
  .get(getResources)
  .post(upload.single('file'), uploadResource);  // No protectAdmin middleware
```

WHEN any unauthenticated HTTP client sends a `POST /api/resources` request with a valid multipart form body, THEN the system accepts and stores the uploaded resource without verifying any identity or authorization token — allowing anonymous users to pollute the database with arbitrary content.

**1.2 Unprotected Pin Endpoint — Privilege Escalation via PATCH**

File: `server/routes/apiRoutes.js` (line 27)

```
router.patch('/resources/:id/pin', protectAdmin, updateResourcePin);
```

Wait — on re-examination `protectAdmin` IS applied here. However:

WHEN the client `api.js` calls `updateResourcePin`, it attaches the Bearer token from `localStorage` (line 13–16, `api.js`). WHEN a non-admin user clears or manipulates the `educrate_admin_auth` key in localStorage and replaces it with a spoofed JSON payload with `role: 'admin'`, THEN the client-side `isAdmin` check passes and admin UI is rendered, revealing admin functionality. The real guard is server-side, but the attack surface exists because the token is stored in mutable, script-accessible `localStorage`.

**1.3 JWT Stored in localStorage — XSS Token Theft**

File: `client/src/context/AuthContext.jsx` (lines 19–27), `client/src/lib/api.js` (lines 5–10)

WHEN JavaScript executes in the browser context (e.g., via a stored XSS payload injected through any unsanitized field rendered in the admin panel), THEN the system exposes the JWT token stored under `localStorage.getItem('educrate_admin_auth')` to the attacker's script, enabling full admin session hijacking without the user's knowledge.

**1.4 No JWT Expiry Validation Beyond Server Decode**

File: `server/controllers/authController.js` (line 10): `expiresIn: '1d'`

WHEN a valid admin JWT is stolen (e.g., via XSS from finding 1.3), THEN the system allows that token to be used for up to 24 hours with no ability to revoke it server-side, because there is no token blacklist, no token rotation, and no session invalidation mechanism.

**1.5 Admin Route Guard Is Client-Only for Non-Protected Endpoints**

File: `client/src/App.jsx` (lines 16–24) — `AdminRoute` component

WHEN an attacker directly navigates to `/admin`, `/admin/resources`, or `/admin/subjects` in a browser that has cleared the auth context but retained network access, THEN the client-side guard redirects to `/login` correctly. However, `GET /api/resources` (used by `AdminOverview` and `ResourceManagement`) has NO server-side authentication — so the same data is accessible directly via `curl` or Postman without any credentials.

---

#### 🔴 HIGH — Unauthenticated Destructive Operations

**1.6 DELETE Endpoint Requires Auth But No Ownership Check**

File: `server/routes/apiRoutes.js` (line 26), `server/controllers/resourceController.js` (lines ~180–200)

WHEN an authenticated admin sends `DELETE /api/resources/:id` with any valid MongoDB ObjectId — including IDs belonging to resources the admin did not create — THEN the system permanently deletes both the MongoDB document and the Cloudinary file with no ownership, audit log, or confirmation beyond the client-side `window.confirm()`.

**1.7 `window.confirm()` as the Sole Deletion Guard on the Client**

File: `client/src/pages/admin/ResourceManagement.jsx` (line 49)

WHEN an attacker crafts an HTML page with an auto-submitting form or CSRF request targeting `DELETE /api/resources/:id`, THEN the client's `window.confirm()` dialog is irrelevant — the server accepts the request purely on a valid JWT, which is already exposed in `localStorage` (finding 1.3). The system has no CSRF token, SameSite cookie, or double-submit protection because auth is handled by Bearer tokens in headers (not cookies), but the exposure of tokens in `localStorage` makes CSRF via XSS trivially exploitable.

---

#### 🔴 HIGH — File Upload Security

**1.8 MIME Type Spoofing on Upload — Content-Type Bypass**

File: `server/middlewares/uploadMiddleware.js` (lines 7–11)

WHEN an attacker uploads a file with a disguised MIME type — for example, a JavaScript file renamed to `payload.pdf` sent with `Content-Type: application/pdf` — THEN the system's `fileFilter` checks only `file.mimetype`, which is derived entirely from the `Content-Type` header supplied by the client and NOT from inspecting the actual file bytes (magic bytes / file signature). The backend double-check in `resourceController.js` line ~148 also only rechecks `file.mimetype`, providing no additional protection. This allows upload of non-PDF malicious files that are then stored in Cloudinary.

**1.9 No Rate Limiting on File Upload Endpoint**

File: `server/routes/apiRoutes.js`, `server/server.js` (lines 46–51)

WHEN an attacker sends a flood of `POST /api/resources` requests at the maximum allowed file size (10 MB), THEN the system applies only the global rate limiter (100 requests per 15 minutes) rather than a stricter per-IP upload limit. At 100 requests × 10 MB = up to 1 GB of Cloudinary storage consumed per 15-minute window per IP before throttling triggers. The upload endpoint has no dedicated tighter rate limit.

**1.10 No Virus/Malware Scanning on Uploaded Files**

File: `server/controllers/resourceController.js` (lines ~160–185)

WHEN a user uploads a PDF file containing embedded malicious JavaScript, macro exploits, or known malware signatures, THEN the system stores the file directly to Cloudinary and serves it to all students without any content scanning step, enabling distribution of malicious academic-looking documents to the student user base.

---

#### 🔴 HIGH — Secrets & Environment Variables

**1.11 Supabase Credentials Exposed in Client `.env` File**

File: `client/.env` (lines 1–2)

WHEN Vite builds the client application, THEN the values of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are bundled into the JavaScript output and become visible to anyone who inspects the browser's network traffic or the built JS bundle. More critically — these variables are not used anywhere in the current codebase (no Supabase client is imported or instantiated in any client file), meaning they are orphaned leftover credentials that serve no purpose but expose a live Supabase project. If this is a real Supabase project key, it is effectively public.

**1.12 `.env` Files Are Correctly in `.gitignore` But No `.env.example` Exists**

File: `.gitignore` (line referencing `.env`), repository root

WHEN a new developer clones the repository, THEN no `.env.example` template exists to guide them in creating their own `.env`, increasing the risk that they will request or share actual secret values through insecure channels (Slack, email, issue comments).

---

#### 🟡 MEDIUM — Input Validation & NoSQL Injection

**1.13 Search Query Parameter Allows Regex-Based DoS**

File: `server/controllers/resourceController.js` (lines ~65–78)

WHEN an attacker sends `GET /api/resources?search=^(a+)+$` (a catastrophic backtracking regex pattern), THEN the system constructs `new RegExp(term, 'i')` directly from user input and passes it to MongoDB's `$or` operator across five fields. Although `escapeRegex()` is present and correctly escapes special regex characters, the escape function itself could be bypassed in future versions or misconfigured. The more immediate issue is that extremely long search strings are not length-capped, enabling large regex objects that degrade MongoDB query performance. WHEN a search string of 10,000+ characters is submitted, THEN no length validation rejects it before the regex is constructed.

**1.14 `limit` Query Parameter Has No Maximum Cap**

File: `server/controllers/resourceController.js` (line ~88)

```js
if (limit) resourcesQuery = resourcesQuery.limit(parseInt(limit, 10));
```

WHEN an attacker sends `GET /api/resources?limit=1000000`, THEN the system passes `1000000` directly to MongoDB's `.limit()` call, returning all documents in the collection in a single response. This enables data exfiltration of the entire resource catalogue in one API call and places unnecessary memory and processing load on the server.

**1.15 `isPinned` Query Parameter Accepts Arbitrary String Values**

File: `server/controllers/resourceController.js` (line ~60)

```js
if (isPinned === 'true' || isPinned === true) query.isPinned = true;
```

WHEN an attacker sends `isPinned[$ne]=false` or other NoSQL operator-style query strings, THEN `express-mongo-sanitize` handles the `$` stripping from `req.body` and `req.params`, but the behavior against query params containing operator strings like `[ne]` (without `$`) in `req.query` is not guaranteed. WHEN `mongoSanitize()` is configured without `allowDots: false`, nested dot-notation keys in query strings may bypass sanitization.

**1.16 File Upload `title` and `description` Fields Have No Server-Side HTML/Script Sanitization**

File: `server/controllers/resourceController.js` (lines ~104, ~108)

WHEN a user submits a title containing `<script>alert(1)</script>` or similar XSS payloads, THEN the server stores this raw string to MongoDB (after only `.trim().substring(0, 200)` normalization). WHEN the admin panel's `ResourceManagement.jsx` renders `{resource.title}` and `{resource.description}` inside JSX, React's built-in escaping prevents DOM-based XSS in the standard rendering path. However, WHEN `dangerouslySetInnerHTML` or a markdown renderer is added later, the stored XSS payload would activate. The data is unsanitized at rest, making it a latent stored XSS risk.

---

#### 🟡 MEDIUM — API Security

**1.17 HTTP Security Headers Are Incomplete Despite Helmet**

File: `server/server.js` (line 27): `app.use(helmet());`

WHEN `helmet()` is used with default settings, THEN the `Content-Security-Policy` (CSP) header is NOT set by default in Helmet v7+ for APIs (it only configures it for HTML responses with certain configurations). WHEN the Express app responds to API routes, the `Cross-Origin-Resource-Policy`, `Permissions-Policy`, and `Referrer-Policy` headers are set by Helmet defaults but no CSP is explicitly configured to restrict what origins can load resources. This means the app lacks a meaningful CSP that would prevent XSS escalation on the frontend if the React app were served by Express.

**1.18 Health Check Endpoint Exposes Server Status Publicly**

File: `server/routes/apiRoutes.js` (lines 30–33)

```js
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCrate API is running' });
});
```

WHEN an attacker probes `GET /api/health`, THEN the system confirms the API is live, confirms the technology stack name ("EduCrate"), and provides a recon endpoint. While minor, this aids attacker reconnaissance and the endpoint has no rate limiting or authentication.

**1.19 Express `json()` Body Parser Limit Set to 10 MB**

File: `server/server.js` (line 34): `app.use(express.json({ limit: '10mb' }));`

WHEN an attacker sends a `POST /api/auth/login` request with a 10 MB JSON body, THEN the body parser accepts and parses the entire payload before the login rate limiter logic runs in the controller. This enables a memory-exhaustion vector where large JSON bodies are parsed for every request up to the 10 MB limit. The JSON body limit should be much lower (1–2 KB is sufficient for login; 50 KB for most API payloads).

**1.20 CORS `credentials: true` Without Cookie-Based Authentication**

File: `server/server.js` (lines 37–54)

WHEN `credentials: true` is set in CORS options but the application uses Bearer token auth (not cookies), THEN this configuration is unnecessarily permissive. The `credentials: true` flag instructs browsers to include cookies and HTTP auth headers in cross-origin requests — which serves no functional purpose for this app but widens the attack surface if cookies are introduced later without reviewing this setting.

---

#### 🟡 MEDIUM — Information Disclosure

**1.21 Cloudinary Error Details Leaked in Upload Failure Response**

File: `server/controllers/resourceController.js` (lines ~170–175)

```js
throw new Error(`Failed to upload file to Cloudinary: ${cloudErr.message}`);
```

WHEN a Cloudinary upload fails (e.g., invalid credentials, quota exceeded, API error), THEN the internal Cloudinary error message is included verbatim in the HTTP response. Cloudinary error messages can contain API endpoint details, account information, and internal service state that should not be exposed to clients.

**1.22 Stack Traces Conditionally Exposed Based on Environment Variables**

File: `server/middlewares/errorMiddleware.js` (lines 13–18)

WHEN `SHOW_STACKTRACE=true` is set in the environment (even in production), THEN the system exposes full stack traces in error responses. This env variable provides a convenient but dangerous override that could accidentally be left `true` in a production deployment, exposing internal file paths, module names, and line numbers to attackers.

**1.23 `xss-clean` Package Is Listed as a Dependency But Never Used**

File: `server/package.json` (line in dependencies): `"xss-clean": "^0.1.4"`

WHEN this package is listed as a dependency but never imported or applied as middleware in `server.js` or any route file, THEN it provides zero security benefit while adding unnecessary dependency surface area. It also creates a false sense of security if a developer assumes XSS cleaning is active.

---

#### 🟡 MEDIUM — Client-Side Security

**1.24 Admin JWT Token Stored in `localStorage` — Accessible to Any Script**

File: `client/src/context/AuthContext.jsx` (lines 19–27)

WHEN the admin logs in, THEN the JWT token is serialized as JSON and stored in `localStorage` under the key `educrate_admin_auth`. Any JavaScript running on the same origin — including injected third-party scripts, browser extensions in lax configurations, or XSS payloads — can read this token with `localStorage.getItem('educrate_admin_auth')` and use it to make authenticated API requests.

**1.25 No Login Attempt Feedback Throttling on the Client**

File: `client/src/pages/Login.jsx` (lines 32–44)

WHEN a user submits the login form repeatedly, THEN the client places no delay, cooldown, or attempt counter before allowing successive login submissions. The server-side rate limiter (5 attempts per 10 minutes) provides the real protection, but the client gives no feedback about how many attempts remain or how long to wait, degrading UX and potentially masking brute-force attempts from legitimate users.

**1.26 `window.opener` Nullified Inconsistently**

File: `client/src/pages/Dashboard.jsx` (line ~59), `client/src/pages/Semester.jsx` (line ~72), `client/src/components/PDFPreviewModal.jsx` (line ~18)

WHEN `window.open('', '_blank')` is used to open Cloudinary URLs, THEN the code correctly sets `nextTab.opener = null` to prevent the opened tab from accessing the parent window via `window.opener`. This is correctly implemented. No defect here — noted as compliant.

---

#### 🟢 LOW — Best Practices & Hardening

**1.27 No `helmet` CSP Configured for the Express API**

File: `server/server.js` (line 27)

WHEN `helmet()` is used without explicit CSP configuration, THEN no `Content-Security-Policy` response header is emitted for API responses. For an API-only Express server this is low risk, but if static files or HTML is ever served directly, the lack of CSP becomes immediately exploitable.

**1.28 MongoDB Connection String Logged in Non-Production Mode**

File: `server/config/db.js` (lines 6–8)

WHEN `NODE_ENV` is not `production`, THEN the system logs `MongoDB Connected: ${conn.connection.host}`, revealing the database hostname (which could be a MongoDB Atlas cluster hostname containing account-identifiable information) to any log aggregation service, terminal session recording, or CI/CD log output.

**1.29 Dependency Versions Use `^` (Caret) Ranges — Supply Chain Risk**

File: `server/package.json`, `client/package.json`

WHEN dependencies are specified with `^` prefix (e.g., `"express": "^4.19.2"`), THEN `npm install` may resolve to any compatible minor or patch version, including versions that introduce security vulnerabilities between pinned version and latest compatible. This is especially risky for security-critical packages like `jsonwebtoken`, `bcryptjs`, `helmet`, and `multer`.

**1.30 No `npm audit` Step in CI Pipeline**

File: `.github/workflows/ci.yml`

WHEN the CI pipeline runs on push or pull request to `main`, THEN it installs dependencies, builds the client, and runs no security audit step. Known CVEs in installed packages go undetected until manually noticed.

**1.31 `seedAdmin.js` Script Accepts ADMIN_PASSWORD From `.env` Without Password Strength Enforcement**

File: `server/scripts/seedAdmin.js` (lines 8–9)

WHEN the admin seeding script runs with `ADMIN_PASSWORD=admin123` or any weak password set in `.env`, THEN the system hashes and stores it without any minimum length, complexity, or entropy check. A weak admin password combined with the admin login endpoint being publicly accessible makes the account trivially brute-forceable (within the 5-attempt rate limit window — which resets every 10 minutes, allowing 720 attempts per day).

**1.32 No `Content-Type` Validation on JSON API Endpoints**

File: `server/server.js`, `server/routes/apiRoutes.js`

WHEN a request is sent to a JSON endpoint (e.g., `POST /api/auth/login`) with `Content-Type: text/plain` or no content type, THEN Express's `json()` body parser silently ignores the body, resulting in `req.body` being `undefined` or `{}`. The auth controller handles this (it checks for missing email/password), but the pattern is fragile — no middleware explicitly enforces `Content-Type: application/json` for JSON endpoints.

**1.33 `index.html` Has No Security Meta Tags**

File: `client/index.html`

WHEN the React application is served, THEN the HTML document contains no `<meta http-equiv="Content-Security-Policy">` tag, no `<meta name="referrer">` tag, and no `X-UA-Compatible` hardening. While HTTP headers from the server are the authoritative CSP mechanism, the absence of meta-level fallback means that if the app is served from a CDN or static host that doesn't set security headers, there is no client-side safety net.

**1.34 File `originalname` Used Directly in Cloudinary Public ID After Sanitization**

File: `server/controllers/resourceController.js` (lines ~186–189)

```js
const safeName = sanitise(file.originalname.replace(/\.pdf$/i, ''));
const publicId = `${Date.now()}_${safeName}`;
```

WHEN `sanitise()` replaces non-alphanumeric characters with underscores, THEN a filename like `../../../../etc/passwd` becomes `____________etc_passwd`, which is safe for Cloudinary. However, WHEN filenames are extremely long (e.g., 10,000+ character filenames), THEN no length cap is applied before building the public ID, potentially exceeding Cloudinary's public ID length limits and causing an unhandled error path.

---

### Expected Behavior (Correct)

---

#### 🔴 HIGH Fixes

**2.1 WHEN any unauthenticated HTTP client sends `POST /api/resources`, THEN the system SHALL reject the request with HTTP 401 and require a valid admin JWT Bearer token before accepting any file upload — the `protectAdmin` middleware SHALL be applied to the upload route.**

**2.2 WHEN an admin JWT is stored client-side, THEN the system SHALL store the token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie instead of `localStorage`, making it inaccessible to JavaScript and immune to XSS-based token theft.**

**2.3 WHEN an admin session token is issued, THEN the system SHALL use a shorter expiry (e.g., 4 hours or 8 hours) and SHALL implement a server-side token revocation mechanism (token blacklist or refresh token rotation) so stolen tokens can be invalidated.**

**2.4 WHEN a file is uploaded to `POST /api/resources`, THEN the system SHALL verify the actual file magic bytes (first 4–5 bytes: `%PDF-`) in addition to the MIME type header to confirm the file is a genuine PDF, rejecting disguised non-PDF files even when `Content-Type: application/pdf` is set.**

**2.5 WHEN an upload request is received, THEN the system SHALL apply a dedicated upload rate limiter stricter than the global limiter — for example, maximum 10 uploads per IP per 10-minute window — to prevent storage abuse.**

**2.6 WHEN the client `.env` file is audited, THEN all unused environment variables (specifically `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) SHALL be removed from the file and the referenced Supabase API key SHALL be rotated/revoked in the Supabase dashboard immediately.**

---

#### 🟡 MEDIUM Fixes

**2.7 WHEN a `search` query parameter is received, THEN the system SHALL enforce a maximum length of 200 characters, rejecting longer strings with HTTP 400 before constructing any regex object.**

**2.8 WHEN a `limit` query parameter is received, THEN the system SHALL cap the parsed integer at a maximum of 100 (or a configurable `MAX_LIMIT` constant), returning at most that many documents per request.**

**2.9 WHEN `title` or `description` fields are submitted, THEN the system SHALL sanitize HTML entities using a library like `xss` or `sanitize-html` before storing them in MongoDB, ensuring no raw HTML or script tags are persisted.**

**2.10 WHEN Cloudinary upload fails, THEN the system SHALL log the full Cloudinary error internally and return only a generic error message to the client (e.g., "File upload failed. Please try again.") without exposing Cloudinary error details.**

**2.11 WHEN `SHOW_STACKTRACE` environment variable is checked in the error middleware, THEN the system SHALL remove this override entirely — stack traces SHALL only be shown when `NODE_ENV === 'development'` AND the request originates from localhost, with no runtime override possible.**

**2.12 WHEN `xss-clean` is listed as a dependency but not used, THEN the package SHALL be removed from `package.json` and `package-lock.json`, and if XSS sanitization is desired it SHALL be replaced with an actively imported and applied package.**

**2.13 WHEN `express.json()` body parser limit is configured, THEN the system SHALL set a limit appropriate to each route's actual payload size — the default API body limit SHALL be `100kb`, not `10mb`.**

**2.14 WHEN `credentials: true` is set in CORS, THEN the system SHALL only enable this if cookie-based auth is actually implemented; until then the `credentials` option SHALL be removed or set to `false`.**

---

#### 🟢 LOW Fixes

**2.15 WHEN the CI pipeline runs, THEN a `npm audit --audit-level=high` step SHALL be added for both `server` and `client` dependency trees to automatically surface known CVEs.**

**2.16 WHEN `seedAdmin.js` runs, THEN the system SHALL enforce a minimum password length of 12 characters and reject the seeding operation if the provided `ADMIN_PASSWORD` is shorter, preventing weak admin credentials from being stored.**

**2.17 WHEN dependencies are pinned, THEN all security-critical packages (`jsonwebtoken`, `bcryptjs`, `helmet`, `multer`, `express`) SHALL use exact versions (no `^` or `~` prefix) or at minimum be locked via `package-lock.json` with `npm ci` enforced in CI.**

**2.18 WHEN the MongoDB connection is established in production, THEN the system SHALL NOT log the database hostname — the production log line SHALL contain only a generic success message with no infrastructure details.**

**2.19 WHEN a Cloudinary public ID is generated from the uploaded filename, THEN the system SHALL cap `safeName` to a maximum of 100 characters before constructing the public ID to prevent edge-case failures with extremely long filenames.**

**2.20 WHEN the `index.html` is built and served, THEN a `Content-Security-Policy` meta tag or server-sent CSP header SHALL be configured to restrict script sources to `'self'` and block inline scripts except those explicitly nonce-tagged.**

**2.21 WHEN an `.env.example` file does not exist in the repository, THEN one SHALL be created at both `server/.env.example` and `client/.env.example` listing all required environment variable keys with placeholder values and no real secrets, to support safe onboarding.**

---

### Unchanged Behavior (Regression Prevention)

**3.1 WHEN an authenticated admin with a valid JWT Bearer token sends `DELETE /api/resources/:id`, THEN the system SHALL CONTINUE TO delete the resource from both MongoDB and Cloudinary as currently implemented.**

**3.2 WHEN an authenticated admin with a valid JWT sends `PATCH /api/resources/:id/pin`, THEN the system SHALL CONTINUE TO update the `isPinned` field and return the updated resource document.**

**3.3 WHEN a valid PDF file (genuine PDF magic bytes, ≤10 MB, `application/pdf` MIME type) is uploaded to `POST /api/resources` by an authenticated admin, THEN the system SHALL CONTINUE TO store the file to Cloudinary and save metadata to MongoDB and return HTTP 201.**

**3.4 WHEN `GET /api/resources` is called with valid query parameters (`semester`, `subject`, `type`, `isPinned`, `limit`, `search`), THEN the system SHALL CONTINUE TO return filtered, sorted resource results in the same JSON format.**

**3.5 WHEN `GET /api/resources/:id/file-url` is called with a valid resource ID, THEN the system SHALL CONTINUE TO generate a 10-minute expiring Cloudinary signed URL and return it in the `{ url, expiresAt }` response format.**

**3.6 WHEN `POST /api/auth/login` is called with correct admin email and password, THEN the system SHALL CONTINUE TO return a valid JWT and user object in the `{ token, user }` response format.**

**3.7 WHEN `POST /api/auth/login` is called with incorrect credentials, THEN the system SHALL CONTINUE TO return HTTP 401 with the generic `'Invalid credentials'` message (no user enumeration).**

**3.8 WHEN the login rate limiter is active and 5 failed attempts are made from the same IP within 10 minutes, THEN the system SHALL CONTINUE TO block subsequent attempts with the rate limit message.**

**3.9 WHEN a non-PDF file or a file exceeding 10 MB is uploaded, THEN the system SHALL CONTINUE TO reject the upload with HTTP 400 and an appropriate error message.**

**3.10 WHEN semester validation runs against an invalid semester string, THEN the system SHALL CONTINUE TO reject the upload with HTTP 400.**

**3.11 WHEN `mongoSanitize()` is active, THEN the system SHALL CONTINUE TO strip `$`-prefixed keys from `req.body` and `req.params` before any database query.**

**3.12 WHEN the admin panel is accessed without a valid admin session, THEN the client-side `AdminRoute` guard SHALL CONTINUE TO redirect unauthenticated users to `/login`.**

**3.13 WHEN a new tab opens a Cloudinary PDF URL, THEN `nextTab.opener = null` SHALL CONTINUE TO be set to prevent reverse tabnapping.**

**3.14 WHEN `GET /api/health` is called, THEN the system SHALL CONTINUE TO return `{ status: 'ok', message: 'EduCrate API is running' }` for uptime monitoring purposes (though its response scope may be narrowed).**

**3.15 WHEN `helmet()` is active, THEN existing security headers already emitted (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`) SHALL CONTINUE TO be set.**
