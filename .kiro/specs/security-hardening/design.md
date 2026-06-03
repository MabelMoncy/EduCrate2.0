# EduCrate 2.0 Security Hardening — Bugfix Design

## Overview

EduCrate 2.0 has ten HIGH-severity security vulnerabilities identified during a full-codebase audit.
This design document specifies the exact technical changes required to fix all ten, using the bug
condition methodology to ensure every fix is targeted, minimal, and regression-safe.

The ten issues fall into five categories:

| Category | Issues |
|---|---|
| Authentication / Token Storage | H2 (localStorage → httpOnly cookie), H3 (no revocation) |
| Authorization gaps | H1 (POST unprotected), H4 (GET unprotected) |
| Destructive operation safety | H5 (no audit log), H6 (no CSRF guard) |
| File upload security | H7 (magic bytes), H8 (rate limit), H9 (malware scan) |
| Secrets management | H10 (Supabase creds in client bundle) |

The guiding constraint is **surgical minimalism**: every change targets the exact line(s) that
constitute the defect, and no unrelated behaviour is altered.

---

## Glossary

- **Bug_Condition (C)**: The precise input or system state that triggers one of the ten vulnerabilities.
- **Property (P)**: The observable, correct system response that must hold after the fix.
- **Preservation**: All currently-passing behaviour listed in bugfix.md §3 (3.1–3.15) that must not regress.
- **protectAdmin**: The Express middleware in `server/middlewares/authMiddleware.js` that validates the admin JWT and attaches `req.user`.
- **httpOnly cookie**: A `Set-Cookie` response attribute that hides the cookie value from JavaScript (`document.cookie`), eliminating XSS-based token theft.
- **JTI (JWT ID)**: A unique identifier claim embedded in each JWT, used as a revocation handle.
- **Token blacklist**: An in-memory `Set<string>` (server process lifetime) storing revoked JTIs; scoped to the 4-hour token window.
- **Magic bytes**: The first 5 bytes of a real PDF file, always `%PDF-` (hex `25 50 44 46 2D`).
- **AuditLog**: A MongoDB collection that records every admin DELETE action before the deletion executes.
- **CSRF double-submit**: A pattern where a non-httpOnly CSRF cookie is issued on login and must be echoed as an `X-CSRF-Token` request header on every state-changing request.
- **uploadRateLimit**: A dedicated `express-rate-limit` instance applied only to `POST /api/resources`.
- **ClamAV / clamscan**: An open-source antivirus engine, accessed via the `clamscan` npm package, that scans a file buffer before it is forwarded to Cloudinary.

---

## Bug Details

### Bug Condition

The ten HIGH vulnerabilities each define a distinct bug condition. The master predicate below is the
union — the system is in a defective state when ANY of the following hold:

```
FUNCTION isBugCondition(request, systemState)
  INPUT:  HTTP request + server runtime state
  OUTPUT: boolean — true if any HIGH vulnerability can be exploited

  // H1 — unauthenticated upload
  IF request.method == 'POST' AND request.path == '/api/resources'
     AND NOT hasValidAdminToken(request)
     THEN RETURN true   -- server currently accepts it

  // H2 — token in localStorage
  IF systemState.jwtStorageLocation == 'localStorage'
     THEN RETURN true   -- any XSS payload can call localStorage.getItem()

  // H3 — no revocation
  IF hasValidAdminToken(request)
     AND systemState.tokenBlacklist == null
     THEN RETURN true   -- stolen token valid for full 24 h window

  // H4 — unauthenticated GET
  IF request.method == 'GET' AND request.path == '/api/resources'
     AND NOT hasValidAdminToken(request)
     THEN RETURN true   -- returns full resource catalogue

  // H5 — no audit log on DELETE
  IF request.method == 'DELETE' AND request.path MATCHES '/api/resources/:id'
     AND hasValidAdminToken(request)
     AND systemState.auditLogWritten == false
     THEN RETURN true

  // H6 — no CSRF guard
  IF request.method == 'DELETE' AND request.path MATCHES '/api/resources/:id'
     AND systemState.csrfTokenValidated == false
     THEN RETURN true

  // H7 — MIME spoofing
  IF request.method == 'POST' AND request.path == '/api/resources'
     AND request.file.mimetype == 'application/pdf'
     AND magicBytesOf(request.file.buffer) != '%PDF-'
     THEN RETURN true   -- malicious file accepted

  // H8 — no upload rate limit
  IF request.method == 'POST' AND request.path == '/api/resources'
     AND requestCountInWindow(request.ip, windowMs=10min) > 10
     AND NOT uploadRateLimitApplied
     THEN RETURN true

  // H9 — no malware scan
  IF request.method == 'POST' AND request.path == '/api/resources'
     AND fileScan(request.file.buffer) == 'INFECTED'
     AND NOT scanPerformedBeforeCloudinary
     THEN RETURN true

  // H10 — credentials in bundle
  IF 'VITE_SUPABASE_URL' IN client.env
     OR 'VITE_SUPABASE_ANON_KEY' IN client.env
     THEN RETURN true

  RETURN false
END FUNCTION
```

### Examples of Defective Behaviour (Before Fix)

- **H1**: `curl -X POST http://localhost:5000/api/resources -F file=@legit.pdf -F title=hack -F semester=S1 -F subject=Mathematics -F description=x` → HTTP 201 with no auth token.
- **H2**: In browser console: `JSON.parse(localStorage.getItem('educrate_admin_auth')).token` → full JWT printed to console.
- **H3**: Admin logs out; previously issued token still authenticates against `DELETE /api/resources/:id` for 24 hours.
- **H4**: `curl http://localhost:5000/api/resources` → full resource list, no credentials required.
- **H5**: Admin deletes a resource; MongoDB document and Cloudinary file are gone with no trace of who did it or when.
- **H6**: A cross-origin form auto-submitting to `DELETE /api/resources/:id` succeeds because the Bearer token is readable from localStorage via XSS.
- **H7**: `curl -X POST ... -H 'Content-Type: application/pdf' --data-binary @malware.exe` → HTTP 201, malware stored in Cloudinary.
- **H8**: `for i in $(seq 1 101); do curl -X POST ... ; done` → all 101 requests succeed (only global 100/15min limit applies).
- **H9**: `curl -X POST ... --data-binary @eicar.pdf` (EICAR test file wrapped as PDF) → HTTP 201, stored and served to students.
- **H10**: `grep SUPABASE client/dist/assets/*.js` → Supabase URL and anon key visible in built JS bundle.

---

## Architecture Overview

### Security Layer Stack

Every inbound request passes through the following layers in order. Each HIGH fix is annotated
with where it intercepts the lifecycle.

```
Browser / API Client
        │
        ▼
  CORS + Helmet                 ← existing (credentials: true re-evaluated at H2)
        │
        ▼
  cookie-parser                 ← NEW (H2) — parses educrate_token httpOnly cookie
        │
        ▼
  Global rate limiter           ← existing (100 req / 15 min on /api)
        │
        ▼
  Upload rate limiter           ← NEW (H8) — 10 uploads / 10 min (POST /resources only)
        │
        ▼
  protectAdmin                  ← existing on some routes; added to POST+GET /resources (H1, H4)
  (reads cookie → verifies JWT → checks JTI blacklist → attaches req.user)
                                   ↑ H3 blacklist check added here
        │
        ▼
  CSRF token validation         ← NEW (H6) — csrfMiddleware checks X-CSRF-Token header
        │
        ▼
  multer (memoryStorage)        ← existing — stores file in req.file.buffer
        │
        ▼
  Magic byte check              ← NEW (H7) — validatePdfMagicBytes() in uploadMiddleware.js
        │
        ▼
  ClamAV scan                   ← NEW (H9) — scanWithClamAV() before Cloudinary
        │
        ▼
  Controller logic              ← resourceController / authController
  (audit log write on DELETE)   ← NEW (H5) — AuditLog.create() before deletion
        │
        ▼
  MongoDB / Cloudinary
```

### Token Flow Diagram (After H2 + H3)

```
POST /api/auth/login  ──────────────────────────────────────────────────────►
  Server:
    1. Validate credentials (bcrypt compare)
    2. Generate JTI = crypto.randomUUID()
    3. jwt.sign({ id, role, jti }, JWT_SECRET, { expiresIn: '4h' })
    4. res.cookie('educrate_token', token, {
         httpOnly: true, secure: true, sameSite: 'strict', maxAge: 4*60*60*1000
       })
    5. res.cookie('csrf_token', csrfToken, {
         httpOnly: false, secure: true, sameSite: 'strict', maxAge: 4*60*60*1000
       })
    6. res.json({ user: { id, email, role } })   ← NO token in body
◄──────────────────────────────────────────────────────────────────────────

Subsequent authenticated request (e.g., DELETE /api/resources/:id):
  Browser automatically sends:
    Cookie: educrate_token=<JWT>      ← inaccessible to JavaScript
    X-CSRF-Token: <csrf_token value>  ← client reads from csrf_token cookie

  protectAdmin middleware:
    1. token = req.cookies.educrate_token
    2. decoded = jwt.verify(token, JWT_SECRET)
    3. IF tokenBlacklist.has(decoded.jti) → 401
    4. user = await User.findById(decoded.id)
    5. req.user = user → next()

POST /api/auth/logout:
    1. decoded = jwt.verify(req.cookies.educrate_token, JWT_SECRET)
    2. tokenBlacklist.add(decoded.jti)
    3. res.clearCookie('educrate_token')
    4. res.clearCookie('csrf_token')
    5. res.json({ message: 'Logged out' })
```

---

## Fix-by-Fix Technical Design

### Fix H1 — Protect POST /api/resources

**File**: `server/routes/apiRoutes.js`

The `POST /api/resources` route is missing `protectAdmin` in its middleware chain.
The fix is a single-line insertion.

```js
// BEFORE (line 23–24)
router.route('/resources')
  .get(getResources)
  .post(upload.single('file'), uploadResource);

// AFTER
router.route('/resources')
  .get(protectAdmin, getResources)           // also applies H4
  .post(uploadRateLimit, protectAdmin, upload.single('file'), uploadResource);
  //     ↑ H8             ↑ H1
```

`protectAdmin` must appear **before** `upload.single('file')` so that unauthenticated requests
are rejected before multer parses the multipart body (saving memory and Cloudinary quota).

---

### Fix H2 + H3 — httpOnly Cookie + JWT Revocation

#### Server — `server/server.js`

Add `cookie-parser` import and middleware registration:

```js
import cookieParser from 'cookie-parser';

// After helmet(), before express.json():
app.use(cookieParser());
```

#### Server — `server/controllers/authController.js`

```js
import crypto from 'node:crypto';

// Replace signToken():
const signToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured on the server');
  const jti = crypto.randomUUID();
  return { token: jwt.sign({ id: userId, role, jti }, secret, { expiresIn: '4h' }), jti };
};

// Replace res.json() at end of loginAdmin():
const csrfToken = crypto.randomUUID();
const { token } = signToken(user._id, user.role);

res.cookie('educrate_token', token, {
  httpOnly:  true,
  secure:    process.env.NODE_ENV === 'production',
  sameSite:  'strict',
  maxAge:    4 * 60 * 60 * 1000,   // 4 hours in ms
});
res.cookie('csrf_token', csrfToken, {
  httpOnly:  false,                 // must be JS-readable for the client to send as a header
  secure:    process.env.NODE_ENV === 'production',
  sameSite:  'strict',
  maxAge:    4 * 60 * 60 * 1000,
});
res.json({ user: { id: user._id, email: user.email, role: user.role } });
// NOTE: token is NOT included in the response body
```

Add `logoutAdmin` controller and the in-memory blacklist:

```js
// tokenBlacklist.js  (new file in server/lib/)
export const tokenBlacklist = new Set();
// Note: in-memory — clears on process restart. For multi-instance deployments use Redis.

// logoutAdmin in authController.js
import { tokenBlacklist } from '../lib/tokenBlacklist.js';

export const logoutAdmin = (req, res, next) => {
  try {
    const token = req.cookies?.educrate_token;
    if (token) {
      const decoded = jwt.decode(token);   // decode without verify (already logged out)
      if (decoded?.jti) tokenBlacklist.add(decoded.jti);
    }
    res.clearCookie('educrate_token', { httpOnly: true, sameSite: 'strict', secure: true });
    res.clearCookie('csrf_token',     { sameSite: 'strict', secure: true });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
```

#### Server — `server/middlewares/authMiddleware.js`

```js
// BEFORE
const token = getTokenFromHeader(req.headers.authorization);

// AFTER — read from httpOnly cookie; also check JTI blacklist
import { tokenBlacklist } from '../lib/tokenBlacklist.js';

const protectAdmin = async (req, res, next) => {
  try {
    const token = req.cookies?.educrate_token;

    if (!token) {
      res.status(401);
      throw new Error('Admin authorization token is required');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500);
      throw new Error('JWT_SECRET is not configured on the server');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (_error) {
      res.status(401);
      throw new Error('Invalid or expired admin token');
    }

    // H3 — JTI revocation check
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      res.status(401);
      throw new Error('Token has been revoked');
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) { res.status(401); throw new Error('Admin account no longer exists'); }
    if (user.role !== 'admin') { res.status(403); throw new Error('Admin role is required'); }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
```

#### Server — `server/routes/apiRoutes.js` (new logout route)

```js
import { loginAdmin, logoutAdmin } from '../controllers/authController.js';

router.post('/auth/login',  loginLimiter, loginAdmin);
router.post('/auth/logout', logoutAdmin);
```

#### Client — `client/src/context/AuthContext.jsx`

```js
// BEFORE: stores { token, user } in localStorage
// AFTER: stores ONLY { user } — token lives in httpOnly cookie, not JS

const readStoredAuth = () => {
  try {
    const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);  // session-scoped, no token
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
};

const login = ({ user }) => {                      // ← no 'token' arg
  const nextAuth = { user };
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));
  setAuth(nextAuth);
};

const logout = async () => {
  try { await logoutApi(); } catch (_e) { /* best-effort */ }
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  setAuth(null);
};

// value: remove token from context surface
const value = useMemo(() => ({
  user:    auth?.user || null,
  isAdmin: auth?.user?.role === 'admin',
  login,
  logout,
}), [auth]);
```

#### Client — `client/src/lib/api.js`

```js
// BEFORE: manually attaches Authorization: Bearer <token>
// AFTER: cookies are sent automatically via credentials: 'include'
//        CSRF token is read from the csrf_token cookie

const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

// Replace jsonHeaders() — no more localStorage reads:
const jsonHeaders = ({ csrf = false } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = getCsrfToken();
  return headers;
};

// All fetch() calls:  add credentials: 'include'
// State-changing calls (DELETE, PATCH, POST):  pass { csrf: true }

// Example — deleteResource:
export const deleteResource = async (id) => {
  const response = await fetch(`${API_URL}/resources/${id}`, {
    method:      'DELETE',
    headers:     jsonHeaders({ csrf: true }),
    credentials: 'include',
  });
  ...
};

// loginAdmin response no longer includes token — only { user }:
export const loginAdmin = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method:      'POST',
    headers:     jsonHeaders(),
    credentials: 'include',
    body:        JSON.stringify({ email, password }),
  });
  ...
};

export const logoutAdmin = async () => {
  await fetch(`${API_URL}/auth/logout`, {
    method:      'POST',
    headers:     jsonHeaders({ csrf: true }),
    credentials: 'include',
  });
};
```

---

### Fix H4 — Protect GET /api/resources

**File**: `server/routes/apiRoutes.js`

Already shown in Fix H1. Add `protectAdmin` to the `.get()` chain.

`GET /api/resources/:id/file-url` also needs protection — it currently has no auth guard:

```js
// BEFORE
router.get('/resources/:id/file-url', getResourceFileUrl);

// AFTER
router.get('/resources/:id/file-url', protectAdmin, getResourceFileUrl);
```

Note: If a future student-facing public route is needed, create a separate
`/api/public/resources` endpoint with intentional and explicit public access — do not remove
the guard from the admin route.

---

### Fix H5 — Audit Log for DELETE

**New file**: `server/models/AuditLog.js`

```js
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action:         { type: String, required: true, enum: ['DELETE', 'UPDATE', 'CREATE'] },
  resourceId:     { type: mongoose.Schema.Types.ObjectId, required: true },
  resourceTitle:  { type: String, required: true },
  performedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedAt:    { type: Date, default: Date.now, index: true },
}, { collection: 'auditlogs' });

// Automatically expire records after 1 year
auditLogSchema.index({ performedAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
```

**File**: `server/controllers/resourceController.js` — `deleteResource` function

```js
import AuditLog from '../models/AuditLog.js';

const deleteResource = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) { res.status(404); throw new Error('Resource not found'); }

    // H5 — write audit log BEFORE deletion
    await AuditLog.create({
      action:        'DELETE',
      resourceId:    resource._id,
      resourceTitle: resource.title,
      performedBy:   req.user._id,   // req.user set by protectAdmin
    });

    if (resource.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(resource.cloudinaryPublicId, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr.message);
      }
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    next(error);
  }
};
```

---

### Fix H6 — CSRF Protection on DELETE / state-changing routes

The migration to `SameSite=Strict` httpOnly cookies (Fix H2) already blocks cross-site form
submission attacks. The CSRF double-submit layer provides defence-in-depth for any scenario
where `SameSite` is insufficient (e.g., old browser quirks, subdomain attacks).

**New file**: `server/middlewares/csrfMiddleware.js`

```js
// Double-submit cookie pattern:
// Server issues csrf_token (non-httpOnly cookie) on login.
// Client reads it from document.cookie and echoes it as X-CSRF-Token header.
// Server compares header value against cookie value.

export const csrfMiddleware = (req, res, next) => {
  const METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];
  // Skip CSRF check on the login route (no session yet)
  const EXEMPT  = ['/api/auth/login'];

  if (!METHODS.includes(req.method) || EXEMPT.includes(req.path)) {
    return next();
  }

  const cookieToken  = req.cookies?.csrf_token;
  const headerToken  = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403);
    return next(new Error('CSRF token mismatch'));
  }

  next();
};
```

**File**: `server/server.js` — apply after `cookie-parser`:

```js
import { csrfMiddleware } from './middlewares/csrfMiddleware.js';

app.use(cookieParser());
app.use(csrfMiddleware);   // before route mounting
```

---

### Fix H7 — Magic Byte PDF Validation

The current `uploadMiddleware.js` `fileFilter` checks only `file.mimetype`, which is the
`Content-Type` header value supplied by the client — trivially spoofable.

**File**: `server/middlewares/uploadMiddleware.js`

Add a new exported helper that is called inside the controller **after** multer stores the
buffer but **before** the Cloudinary upload:

```js
// PDF magic bytes: %PDF-  (hex: 25 50 44 46 2D)
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]);

export const validatePdfMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).equals(PDF_MAGIC);
};
```

**File**: `server/controllers/resourceController.js` — `uploadResource`, after step 5 (MIME check):

```js
import { validatePdfMagicBytes } from '../middlewares/uploadMiddleware.js';

// ── Step 5b. Magic byte check (H7) ───────────────────────────────────────────
if (!validatePdfMagicBytes(file.buffer)) {
  res.status(400);
  throw new Error('File content does not match PDF format');
}
// Step 6 (file size guard) follows unchanged...
```

This check runs after multer has the buffer in memory and before the Cloudinary upload,
ensuring malicious files are never forwarded to Cloudinary storage.

---

### Fix H8 — Dedicated Upload Rate Limiter

**File**: `server/routes/apiRoutes.js`

```js
// Add alongside existing loginLimiter:
const uploadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 10,                    // 10 upload attempts per IP per window
  message: 'Too many upload attempts from this IP. Please try again in 10 minutes.',
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.ip,  // explicit: one counter per IP
});

// Applied before protectAdmin on the POST route:
router.route('/resources')
  .get(protectAdmin, getResources)
  .post(uploadRateLimit, protectAdmin, upload.single('file'), uploadResource);
```

`uploadRateLimit` is positioned before `protectAdmin` so that unauthenticated flood attempts
are also throttled, preventing CPU waste on JWT validation during an attack.

---

### Fix H9 — Malware Scanning

**Approach**: Use the `clamscan` npm package to connect to a local ClamAV daemon before
forwarding the file buffer to Cloudinary. A `NODE_CLAMSCAN_ENABLED` flag allows the scan
to be disabled in development environments where ClamAV is not installed.

**Installation**: `npm install clamscan@2.x` (server only)

**New file**: `server/lib/virusScanner.js`

```js
import NodeClam from 'clamscan';

let clamInstance = null;

const getClamInstance = async () => {
  if (clamInstance) return clamInstance;
  clamInstance = await new NodeClam().init({
    clamdscan: {
      active: true,
      socket: process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.ctl',
      timeout: 60000,    // 60 s scan timeout
    },
    preference: 'clamdscan',
  });
  return clamInstance;
};

/**
 * Scans a Buffer for malware using ClamAV.
 * Returns true if clean, throws an error if infected or scan fails.
 */
export const scanBuffer = async (buffer) => {
  if (process.env.NODE_CLAMSCAN_ENABLED !== 'true') {
    // Skip scan in dev/test environments
    return true;
  }

  const clam = await getClamInstance();
  const { isInfected, viruses } = await clam.scanBuffer(buffer);

  if (isInfected) {
    const virusNames = viruses.join(', ') || 'unknown';
    console.warn(`[SECURITY] Infected upload rejected. Threats: ${virusNames}`);
    throw new Error('File failed security scan and was rejected');
  }

  return true;
};
```

**File**: `server/controllers/resourceController.js` — `uploadResource`, after magic byte check:

```js
import { scanBuffer } from '../lib/virusScanner.js';

// ── Step 5c. Malware scan (H9) ────────────────────────────────────────────────
try {
  await scanBuffer(file.buffer);
} catch (scanErr) {
  res.status(400);
  throw new Error(scanErr.message);
}
// Step 6 (file size guard) follows unchanged...
```

**Environment variables** to add to `server/.env`:

```
NODE_CLAMSCAN_ENABLED=false   # set to true in production
CLAMAV_SOCKET=/var/run/clamav/clamd.ctl
```

---

### Fix H10 — Remove Exposed Supabase Credentials

**File**: `client/.env`

Remove the two unused lines:

```
# REMOVE these lines:
VITE_SUPABASE_URL=<value>
VITE_SUPABASE_ANON_KEY=<value>
```

**Action required outside code**: Revoke and rotate `VITE_SUPABASE_ANON_KEY` immediately in
the Supabase dashboard (Project Settings → API → Reveal → Regenerate). The old key is
compromised if the built JS bundle was ever deployed to a publicly accessible host.

**New file**: `client/.env.example`

```
# EduCrate Client — Environment Variables
# Copy this file to .env and fill in real values. Never commit .env.

# API base URL (required)
# Development: leave empty to use Vite's proxy to localhost:5000
# Production: set to your deployed API origin, e.g. https://api.educrate.app
VITE_API_URL=
```

Verify no Supabase import exists anywhere in client source:

```bash
grep -r 'supabase' client/src   # should return no results after H10
```

---

## Data Models

### AuditLog (MongoDB / Mongoose)

```js
{
  _id:           ObjectId,          // auto-generated
  action:        String,            // enum: ['DELETE', 'UPDATE', 'CREATE']
  resourceId:    ObjectId,          // reference — resource may be gone; keep the ID
  resourceTitle: String,            // snapshot of title at deletion time
  performedBy:   ObjectId,          // ref: 'User' — the admin who acted
  performedAt:   Date,              // defaults to now(); indexed for TTL + queries
}
```

TTL index: records auto-expire after 365 days (`expireAfterSeconds: 31536000`).

Query examples:

```js
// All deletes in last 7 days
AuditLog.find({ action: 'DELETE', performedAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } })

// All actions by a specific admin
AuditLog.find({ performedBy: adminId }).sort({ performedAt: -1 })
```

### Token Blacklist (In-Memory)

```js
// server/lib/tokenBlacklist.js
export const tokenBlacklist = new Set();
//
// Structure: Set<string>  where each string is a UUID jti claim value
// Lifecycle: lasts for the server process lifetime
// Behaviour: check on every protectAdmin call; cleared on server restart
// Capacity:  at 4-hour token expiry and 1 logout/minute, max ~240 entries at steady state
//
// Production note: For horizontally-scaled deployments (multiple Node processes),
// replace with a Redis SET with 4-hour TTL:
//   await redis.set(`blacklist:${jti}`, '1', 'EX', 14400)
//   const revoked = await redis.exists(`blacklist:${jti}`)
```

---

## Middleware Chain Diagrams

### POST /api/resources (upload)

```
Request
  │
  ├─ CORS + Helmet
  ├─ cookie-parser                       ← NEW
  ├─ mongoSanitize
  ├─ Global rate limit (100/15min)
  ├─ uploadRateLimit (10/10min per IP)   ← NEW (H8)
  ├─ protectAdmin                        ← MOVED HERE (H1)
  │    ├─ read educrate_token cookie
  │    ├─ jwt.verify()
  │    ├─ tokenBlacklist.has(jti)        ← NEW (H3)
  │    └─ req.user = user
  ├─ csrfMiddleware                      ← NEW (H6)
  ├─ multer (memoryStorage, 10 MB limit)
  ├─ uploadResource controller
  │    ├─ field validation
  │    ├─ MIME type check (existing)
  │    ├─ validatePdfMagicBytes()        ← NEW (H7)
  │    ├─ scanBuffer() [ClamAV]          ← NEW (H9)
  │    ├─ uploadToCloudinary()
  │    └─ Resource.create()
  └─ Response
```

### DELETE /api/resources/:id

```
Request
  │
  ├─ CORS + Helmet
  ├─ cookie-parser
  ├─ mongoSanitize
  ├─ Global rate limit
  ├─ protectAdmin                        ← existing
  │    └─ tokenBlacklist.has(jti)        ← NEW (H3)
  ├─ csrfMiddleware                      ← NEW (H6)
  ├─ deleteResource controller
  │    ├─ Resource.findById()
  │    ├─ AuditLog.create()              ← NEW (H5)
  │    ├─ cloudinary.uploader.destroy()
  │    └─ Resource.findByIdAndDelete()
  └─ Response
```

### GET /api/resources

```
Request
  │
  ├─ CORS + Helmet
  ├─ cookie-parser
  ├─ mongoSanitize
  ├─ Global rate limit
  ├─ protectAdmin                        ← NEW (H4)
  │    └─ tokenBlacklist.has(jti)        ← NEW (H3)
  ├─ getResources controller
  └─ Response
```

### POST /api/auth/login

```
Request
  │
  ├─ CORS + Helmet
  ├─ cookie-parser
  ├─ mongoSanitize
  ├─ Global rate limit
  ├─ loginLimiter (5/10min per IP)       ← existing
  ├─ csrfMiddleware (EXEMPT on this route)
  ├─ loginAdmin controller
  │    ├─ bcrypt.compare()
  │    ├─ signToken() → jti = UUID       ← NEW (H3)
  │    ├─ res.cookie('educrate_token')   ← NEW (H2)
  │    ├─ res.cookie('csrf_token')       ← NEW (H6)
  │    └─ res.json({ user })             ← token NOT in body (H2)
  └─ Response
```

### POST /api/auth/logout (new route)

```
Request
  │
  ├─ CORS + Helmet
  ├─ cookie-parser
  ├─ mongoSanitize
  ├─ Global rate limit
  ├─ csrfMiddleware                      ← validates X-CSRF-Token
  ├─ logoutAdmin controller
  │    ├─ jwt.decode(req.cookies.educrate_token)
  │    ├─ tokenBlacklist.add(jti)        ← NEW (H3)
  │    ├─ res.clearCookie('educrate_token')
  │    └─ res.clearCookie('csrf_token')
  └─ Response
```

---

## New Dependencies Required

| Package | Side | Version | Purpose |
|---|---|---|---|
| `cookie-parser` | server | `1.4.7` | Parse httpOnly and CSRF cookies from incoming requests |
| `file-type` | server | `19.x` | Optional: magic byte detection via npm (alternative to manual buffer check) |
| `clamscan` | server | `2.x` | ClamAV Node.js wrapper for malware scanning (optional; disabled in dev via env flag) |

No new client-side packages are required. The `fetch` API with `credentials: 'include'` handles
cookie transmission natively. The `axios` dependency listed in `client/package.json` is not
currently used — the codebase uses `fetch`. No change needed there.

**Install commands**:

```bash
# Required
cd server && npm install cookie-parser@1.4.7

# Optional (malware scanning)
cd server && npm install clamscan@2.2.1

# Optional (magic bytes via npm instead of manual Buffer check)
cd server && npm install file-type@19.6.0
```

---

## Expected Behavior

### Preservation Requirements

The following behaviours are explicitly defined in bugfix.md §3 and MUST NOT change after any fix:

**Unchanged Behaviours:**
- An authenticated admin with valid cookie token can DELETE a resource (3.1)
- An authenticated admin can PATCH pin status (3.2)
- A valid PDF (≤10 MB, genuine magic bytes) uploaded by an authenticated admin returns HTTP 201 (3.3)
- GET /api/resources with valid query parameters returns filtered JSON results (3.4) — now requires auth
- GET /api/resources/:id/file-url returns `{ url, expiresAt }` with a 10-min Cloudinary URL (3.5)
- POST /api/auth/login with correct credentials returns `{ user }` and sets the cookie (3.6, updated contract)
- POST /api/auth/login with incorrect credentials returns HTTP 401 with no user enumeration (3.7)
- Login rate limiter continues to block after 5 failed attempts per IP per 10 minutes (3.8)
- Non-PDF or >10 MB files continue to be rejected with HTTP 400 (3.9)
- Invalid semester strings continue to be rejected with HTTP 400 (3.10)
- mongoSanitize continues stripping `$` keys from req.body and req.params (3.11)
- Client-side AdminRoute guard continues to redirect unauthenticated users to /login (3.12)
- New tab opener nullification on Cloudinary URL open is unchanged (3.13)
- GET /api/health continues to return `{ status: 'ok', message: 'EduCrate API is running' }` (3.14)
- Helmet security headers continue to be emitted (3.15)

**Scope of non-buggy inputs:**
All requests that do NOT match any of the ten bug conditions are completely unaffected by these
fixes. Specifically:
- Mouse/keyboard interactions with the UI unrelated to authentication
- PDF resources with genuine `%PDF-` magic bytes from authenticated admins
- GET requests to public informational endpoints (/api/health)
- All requests that already pass `protectAdmin` with a valid, non-revoked token

---

## Hypothesized Root Cause

Each vulnerability has a distinct root cause:

1. **H1 — Missing middleware** (`POST /api/resources`): Route was added with `upload.single` but
   `protectAdmin` was inadvertently omitted. The DELETE and PATCH routes on the same file were
   protected, suggesting a copy-paste gap.

2. **H2 — localStorage token storage** (`AuthContext.jsx`): Standard JWT-in-localStorage pattern
   used during development, never migrated to cookies before deployment.

3. **H3 — No JTI / revocation**: The original `signToken` function omits a `jti` claim and no
   server-side session state is maintained, meaning logout is purely client-side.

4. **H4 — Unprotected GET**: The resource listing endpoint was treated as "read-only therefore
   safe", overlooking that the resource catalogue is private admin data.

5. **H5 — No audit trail**: Destructive operation implemented without audit logging — common
   omission when audit requirements aren't part of the initial spec.

6. **H6 — CSRF gap**: The use of `Authorization: Bearer` header with localStorage-stored tokens
   was assumed to be CSRF-safe (headers can't be set by cross-site forms), but this assumption
   breaks when the token is exfiltrable via XSS and the attack is token re-use rather than
   classic CSRF.

7. **H7 — MIME-only check**: The `fileFilter` in `uploadMiddleware.js` and the belt-and-braces
   check in `resourceController.js` both read `file.mimetype`, which comes from the request
   `Content-Type` header — not from the file content itself.

8. **H8 — No upload-specific rate limit**: The global rate limiter was applied to all `/api`
   routes. The upload endpoint, which has much higher per-request cost (Cloudinary + MongoDB),
   was not given a tighter dedicated limit.

9. **H9 — No malware scan**: Cloudinary upload was implemented without a scan step. ClamAV
   integration was not in the original project scope.

10. **H10 — Orphaned env vars**: Supabase was likely evaluated as an alternative storage or
    auth backend and abandoned, but the credentials were left in `client/.env` and committed
    to version control.

---

## Correctness Properties

Property 1: Bug Condition — Unauthenticated upload is rejected

_For any_ HTTP request to `POST /api/resources` where no valid `educrate_token` httpOnly cookie
is present (or the cookie contains an expired, invalid, or revoked JWT), the fixed server SHALL
return HTTP 401 and SHALL NOT parse the multipart body, invoke multer, or write any data to
MongoDB or Cloudinary.

**Validates: Requirements 2.1**

---

Property 2: Bug Condition — JWT is not accessible to JavaScript

_For any_ successful login response from `POST /api/auth/login`, the fixed server SHALL NOT
include the JWT string in the response body, in any readable response header, or in any
JavaScript-accessible storage mechanism. The token SHALL reside exclusively in an `httpOnly`
cookie attribute, meaning `document.cookie` and all JavaScript storage APIs return no token value.

**Validates: Requirements 2.2**

---

Property 3: Bug Condition — Revoked JTI is rejected

_For any_ request that presents a JWT whose `jti` claim is present in the server's token
blacklist (added there by a prior call to `POST /api/auth/logout`), the fixed `protectAdmin`
middleware SHALL return HTTP 401 regardless of the token's cryptographic validity or expiry time.

**Validates: Requirements 2.3**

---

Property 4: Bug Condition — Non-PDF magic bytes are rejected before Cloudinary

_For any_ file upload request where the file buffer's first 5 bytes do NOT equal `%PDF-`
(`0x25 0x50 0x44 0x46 0x2D`), the fixed upload pipeline SHALL return HTTP 400 and SHALL NOT
invoke `uploadToCloudinary()`, regardless of the `Content-Type` / `mimetype` value.

**Validates: Requirements 2.4**

---

Property 5: Bug Condition — Upload rate limit enforced per IP

_For any_ IP address that has made 10 or more requests to `POST /api/resources` within a
10-minute sliding window, the fixed server SHALL return HTTP 429 on the 11th and subsequent
requests within that window, regardless of authentication status.

**Validates: Requirements 2.5**

---

Property 6: Bug Condition — AuditLog entry written before deletion

_For any_ authenticated admin DELETE request to `/api/resources/:id` where the resource exists,
the fixed `deleteResource` controller SHALL create an `AuditLog` document with the correct
`resourceId`, `resourceTitle`, and `performedBy` fields **before** calling
`Resource.findByIdAndDelete()`. If `AuditLog.create()` throws, the deletion SHALL NOT proceed.

**Validates: Requirements** (bugfix.md §2 — implied by H5 fix)

---

Property 7: Preservation — Non-buggy requests are unaffected

_For any_ request that does NOT match any of the ten bug conditions (i.e., `isBugCondition`
returns false), the fixed server SHALL produce the same HTTP status code, response body shape,
and side effects (MongoDB writes, Cloudinary calls) as the original unfixed server, preserving
all behaviour specified in bugfix.md §3.1–3.15.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15**

---

## Testing Strategy

### Validation Approach

Testing follows the bug condition methodology in two phases:

**Phase 1 — Exploratory (pre-fix)**: Run tests against unfixed code to confirm the bugs are
reproducible and validate root cause analysis. Tests should fail in specific, predictable ways.

**Phase 2 — Fix + Preservation checking**: Run the same tests against fixed code. Bug condition
tests must pass; preservation tests must continue to pass.

---

### Exploratory Bug Condition Checking

**Goal**: Surface concrete counterexamples on unfixed code, confirming each root cause.

**Test cases (will fail on unfixed code):**

1. **H1 Exploration**: Send `POST /api/resources` with no `Authorization` header and a valid
   multipart PDF body → expect HTTP 201 on unfixed code (confirms bug), expect HTTP 401 after fix.

2. **H2 Exploration**: After login, inspect `localStorage.getItem('educrate_admin_auth')` →
   expect a JSON string containing the JWT on unfixed code, expect `null` or no token after fix.

3. **H3 Exploration**: Login, call logout (client-side only), then immediately use the old token
   in a `DELETE` request → expect HTTP 200 (token still valid) on unfixed code, expect HTTP 401
   after fix (JTI blacklisted).

4. **H4 Exploration**: Send `GET /api/resources` with no credentials → expect HTTP 200 with
   resource data on unfixed code, expect HTTP 401 after fix.

5. **H7 Exploration**: Upload a file with `Content-Type: application/pdf` whose first 5 bytes
   are `<html` → expect HTTP 201 on unfixed code, expect HTTP 400 after fix.

6. **H8 Exploration**: Send 11 rapid `POST /api/resources` requests from one IP → expect all
   succeed (up to global limit) on unfixed code, expect HTTP 429 on 11th after fix.

**Expected counterexamples on unfixed code:**
- H1: Returns 201 with no auth token — upload accepted anonymously.
- H4: Returns 200 with full resource list — no credentials required.
- H7: Returns 201 — HTML/binary file stored in Cloudinary as "PDF".

---

### Fix Checking

**Goal**: For all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedHandler(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Concrete assertions:**

```
isBugCondition(POST /api/resources, no cookie)   → fixedHandler MUST return 401
isBugCondition(JWT in JS context after login)     → fixedHandler sets httpOnly cookie, no body token
isBugCondition(request with blacklisted JTI)      → fixedHandler MUST return 401
isBugCondition(GET /api/resources, no cookie)     → fixedHandler MUST return 401
isBugCondition(DELETE with no AuditLog)           → fixedHandler writes AuditLog.create() first
isBugCondition(DELETE with no CSRF token)         → csrfMiddleware MUST return 403
isBugCondition(file with non-PDF magic bytes)     → fixedHandler MUST return 400, no Cloudinary call
isBugCondition(11th upload from same IP/10min)    → uploadRateLimit MUST return 429
isBugCondition(EICAR test file in buffer)         → scanBuffer MUST return 400, no Cloudinary call
isBugCondition(VITE_SUPABASE_* in client bundle)  → grep dist/*.js returns no Supabase strings
```

---

### Preservation Checking

**Goal**: For all inputs where the bug condition does NOT hold, fixed code produces the same
result as original code.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalHandler(input) == fixedHandler(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended because:
- It generates large numbers of valid-input scenarios automatically.
- It catches off-by-one errors in middleware ordering (e.g., rate limiter runs before auth).
- It provides coverage across many valid PDF sizes, semester values, and admin users.

**Preservation test cases:**

1. **Upload preservation (3.3)**: Generate random valid PDF buffers (first 5 bytes = `%PDF-`,
   random content, valid size), with valid auth cookie and form fields → assert HTTP 201 and
   MongoDB document created.

2. **Delete preservation (3.1)**: Authenticated admin with valid non-revoked cookie sends DELETE
   with correct CSRF header → assert HTTP 200, resource removed from MongoDB and Cloudinary.

3. **Login contract (3.6)**: Correct credentials → assert HTTP 200 with `{ user: { id, email, role } }`
   shape. Assert `Set-Cookie` header contains `educrate_token` with `HttpOnly` attribute.
   Assert response body contains no JWT string.

4. **Rate limit preservation (3.8)**: 5 failed logins from same IP within 10 minutes → 6th attempt
   returns 429.

5. **Search/filter preservation (3.4)**: GET /api/resources with valid auth cookie and query params
   → same JSON shape as before, same sorting.

6. **File URL preservation (3.5)**: GET /api/resources/:id/file-url with valid auth cookie →
   returns `{ url, expiresAt }`.

---

### Unit Tests

- `validatePdfMagicBytes(buffer)` — test with genuine PDF buffer, HTML buffer, empty buffer, 4-byte buffer (too short), binary executable.
- `tokenBlacklist` — add JTI, check has(), verify it blocks in `protectAdmin` mock.
- `csrfMiddleware` — matching tokens pass, mismatched tokens return 403, exempt route (login) passes without header.
- `AuditLog.create()` called before `Resource.findByIdAndDelete()` — verify call order with spies.
- `scanBuffer()` with `NODE_CLAMSCAN_ENABLED=false` — always returns true (skips scan).
- `signToken()` — returned JWT payload includes `jti` (UUID) and `role` claims.
- `logoutAdmin` — after calling logout, JTI is in `tokenBlacklist`.

---

### Property-Based Tests

- **P1 PBT**: Generate arbitrary `Buffer` values. For any buffer where first 5 bytes ≠ `%PDF-`,
  `validatePdfMagicBytes` MUST return false. For any buffer with first 5 bytes = `%PDF-`, MUST
  return true.

- **P5 PBT**: Simulate N upload requests from the same IP with a mocked rate limiter.
  FOR ALL N > 10, the (N+1)th request MUST be rejected with 429.

- **P6 PBT**: Generate random valid resource documents. FOR ALL admin DELETE operations,
  `AuditLog.create` spy MUST be called exactly once before `findByIdAndDelete` spy.

- **Preservation PBT**: Generate random valid multipart uploads (valid PDF magic bytes, valid
  semester/subject/type from allowlists, ≤10 MB). FOR ALL such inputs WITH valid auth cookie,
  the response MUST be HTTP 201 with a MongoDB ObjectId in the body.

---

### Integration Tests

- **Full auth flow**: Login → verify httpOnly cookie set → make authenticated GET /api/resources →
  verify 200 → call logout → verify cookie cleared → retry GET → verify 401.
- **CSRF enforcement**: Login → make DELETE without X-CSRF-Token → verify 403 → retry with correct
  X-CSRF-Token → verify 200.
- **Upload chain**: Authenticated admin uploads genuine PDF → verify magic bytes pass → verify
  Cloudinary mock called → verify HTTP 201. Then upload non-PDF with spoofed Content-Type →
  verify HTTP 400, Cloudinary mock NOT called.
- **Audit log integration**: Authenticated admin deletes a resource → query AuditLog collection →
  verify exactly one entry with correct resourceId, performedBy, and timestamp within 1 second.
- **Rate limit integration**: Fire 11 upload requests with valid auth from same IP → assert first
  10 return 201 (or valid responses) and 11th returns 429.

---

## Regression Safety

### Breaking Changes

The migration from `Authorization: Bearer` header to httpOnly cookies (Fix H2) is a **breaking
change** in the API authentication contract. All clients must be updated simultaneously:

| Before | After |
|---|---|
| `Authorization: Bearer <token>` header on all requests | `Cookie: educrate_token=<JWT>` sent automatically |
| Token stored in `localStorage` | Token in httpOnly cookie — no JS access |
| Login returns `{ token, user }` | Login returns `{ user }` only; cookie set via `Set-Cookie` header |
| No logout endpoint | `POST /api/auth/logout` added; must be called to invalidate token |

**Migration note**: The old `getTokenFromHeader` function and `localStorage`-based token reads
in `api.js` must be removed in the same commit that deploys the cookie-based server. A partial
deployment where the server still reads the `Authorization` header would keep the vulnerability
open.

### Non-Breaking Changes

All other fixes (H1, H4, H5, H6, H7, H8, H9, H10) are additive — they add new rejections,
new data writes, or remove unused configuration. They do not change the response format for
any currently-valid request.

### Preserved Regression Checklist

| Requirement | How it is preserved |
|---|---|
| 3.1 — Authenticated DELETE works | `protectAdmin` still validates token; only source changes (cookie vs header) |
| 3.2 — Authenticated PATCH pin works | Same — cookie-based auth, same validation logic |
| 3.3 — Valid PDF upload returns 201 | Magic byte check passes for genuine PDFs; scan disabled in dev by default |
| 3.4 — GET filtered results | Same query logic; now gated by auth (new requirement from H4 fix) |
| 3.5 — File URL signed response | No change to `getResourceFileUrl` logic; adds auth gate |
| 3.6 — Login returns user object | `{ user }` still returned; token moves to cookie |
| 3.7 — Invalid credentials → 401 | `loginAdmin` logic unchanged |
| 3.8 — Login rate limiter | `loginLimiter` middleware unchanged |
| 3.9 — Non-PDF/oversized rejected | `fileFilter` + size limit in multer unchanged; magic byte check is additive |
| 3.10 — Invalid semester rejected | Allowlist validation in controller unchanged |
| 3.11 — mongoSanitize active | Unchanged |
| 3.12 — AdminRoute redirect | Client-side guard unchanged; now checks `user` presence (no token in context) |
| 3.13 — opener nullification | Unchanged |
| 3.14 — /api/health response | Unchanged |
| 3.15 — Helmet headers | Unchanged |
