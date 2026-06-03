# Implementation Plan

## Overview

This plan fixes the 10 🔴 HIGH severity security vulnerabilities identified in the EduCrate 2.0 security audit. Tasks are ordered in three dependency-safe groups so the application remains functional at every intermediate step.

- **Group 1 (tasks 3–4)**: Foundations — isolated, non-breaking changes (H10, H8, H7, H9, H5)
- **Group 2 (tasks 5–6)**: Auth migration — breaking change, must be applied atomically (H3, H2, H6)
- **Group 3 (tasks 7–8)**: Route protection — final guard additions (H1, H4)
- **Final (tasks 9–10)**: Full re-validation of all 10 fixes and 15 preservation properties

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3.1"] },
    { "wave": 3, "tasks": ["3.2"] },
    { "wave": 4, "tasks": ["3.3"] },
    { "wave": 5, "tasks": ["3.4"] },
    { "wave": 6, "tasks": ["3.5"] },
    { "wave": 7, "tasks": ["4"] },
    { "wave": 8, "tasks": ["5.1"] },
    { "wave": 9, "tasks": ["5.2"] },
    { "wave": 10, "tasks": ["5.3"] },
    { "wave": 11, "tasks": ["6"] },
    { "wave": 12, "tasks": ["7.1"] },
    { "wave": 13, "tasks": ["8"] },
    { "wave": 14, "tasks": ["9.1", "9.2"] },
    { "wave": 15, "tasks": ["10"] }
  ]
}
```

## Tasks

<!-- ═══════════════════════════════════════════════════════════════════════════
     PROPERTY-BASED TESTS  (must run before any implementation begins)
     ═══════════════════════════════════════════════════════════════════════════ -->

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - 10 HIGH Vulnerabilities Present in Unfixed Code
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms all 10 bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples that demonstrate each vulnerability
  - **Scoped PBT Approach**: For each deterministic bug, scope the property to a concrete triggering case
  - H1: assert `POST /api/resources` without auth token returns 401 — currently returns 201 (BUG)
  - H2: assert `localStorage.getItem('educrate_admin_auth')` returns null after login — currently returns JWT (BUG)
  - H3: assert a previously logged-out JTI is rejected with 401 — currently returns 200 (BUG)
  - H4: assert `GET /api/resources` without auth token returns 401 — currently returns 200 (BUG)
  - H5: assert AuditLog collection has a new entry after DELETE — currently no entry created (BUG)
  - H6: assert DELETE without X-CSRF-Token header returns 403 — currently returns 200 (BUG)
  - H7: assert uploading a non-PDF with Content-Type: application/pdf returns 400 — currently returns 201 (BUG)
  - H8: assert the 11th upload in a 10-min window from same IP returns 429 — currently returns 201 (BUG)
  - H9: assert uploading an EICAR test file returns 400 — currently returns 201 (BUG)
  - H10: assert `grep VITE_SUPABASE client/dist/assets/*.js` returns no results — currently leaks creds (BUG)
  - Run on UNFIXED code — **EXPECTED OUTCOME**: All 10 assertions FAIL
  - Document each counterexample to confirm root cause
  - Mark task complete when tests are written, run, and all failures are documented
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_


- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Non-Buggy Paths Must Continue to Work
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code first, then encode
  - Observe: authenticated `DELETE /api/resources/:id` returns 200 and deletes from MongoDB + Cloudinary
  - Observe: authenticated `PATCH /api/resources/:id/pin` returns 200 and updates `isPinned`
  - Observe: valid PDF upload by authenticated admin returns 201 with correct metadata
  - Observe: `GET /api/resources?semester=S1` returns filtered resources in expected JSON shape
  - Observe: `GET /api/resources/:id/file-url` returns `{ url, expiresAt }` with 10-min Cloudinary URL
  - Observe: `POST /api/auth/login` with correct credentials returns `{ token, user }` + HTTP 200
  - Observe: `POST /api/auth/login` with wrong credentials returns HTTP 401 with `'Invalid credentials'`
  - Observe: 5 failed logins from same IP within 10 min triggers rate limiter
  - Observe: uploading non-PDF or file > 10 MB returns HTTP 400
  - Observe: `GET /api/health` returns `{ status: 'ok', message: 'EduCrate API is running' }`
  - Write property-based tests asserting the above for any valid input satisfying `NOT isBugCondition(input)`
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: All preservation tests PASS
  - Mark task complete when tests are written, run, and confirmed passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.14_


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 1 — FOUNDATIONS  (no breaking changes to auth or route contracts)
     ═══════════════════════════════════════════════════════════════════════════ -->

- [x] 3. Group 1 — Foundations (H10, H8, H7, H9, H5)

  - [x] 3.1 H10 — Remove exposed Supabase credentials from client/.env
    - Delete `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` lines from `client/.env`
    - Create `client/.env.example` with `VITE_API_URL=` placeholder and no real secrets
    - Verify `grep -r 'supabase' client/src` returns zero results (no Supabase import anywhere)
    - **Manual action required**: Rotate/revoke the exposed `VITE_SUPABASE_ANON_KEY` in the Supabase dashboard (Project Settings → API → Regenerate)
    - _Bug_Condition: `'VITE_SUPABASE_URL' IN client.env OR 'VITE_SUPABASE_ANON_KEY' IN client.env` (design §H10)_
    - _Expected_Behavior: `grep SUPABASE client/dist/assets/*.js` returns no results (design §H10)_
    - _Preservation: No client source file imports Supabase; no existing feature depends on these vars_
    - _Requirements: 1.11, 1.12, 2.6_

  - [x] 3.2 H8 — Add dedicated upload rate limiter to apiRoutes.js
    - In `server/routes/apiRoutes.js`, define `uploadRateLimit` alongside the existing `loginLimiter`:
      `rateLimit({ windowMs: 10*60*1000, max: 10, message: 'Too many upload attempts...', standardHeaders: true, legacyHeaders: false })`
    - Apply `uploadRateLimit` as the FIRST middleware on `POST /api/resources` (before `protectAdmin`)
    - Do NOT change the GET route or any other route in this task — that belongs to Group 3 (H1/H4)
    - _Bug_Condition: `requestCountInWindow(ip, 10min) > 10 AND NOT uploadRateLimitApplied` (design §H8)_
    - _Expected_Behavior: 11th upload from same IP within 10-min window returns HTTP 429 (design §H8)_
    - _Preservation: First 10 upload requests per IP per window continue to succeed; all other routes unaffected_
    - _Requirements: 1.9, 2.5_


  - [x] 3.3 H7 — Add magic byte PDF validation helper and integrate into upload controller
    - In `server/middlewares/uploadMiddleware.js`, export a new function `validatePdfMagicBytes(buffer)`:
      - Define `PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D])` (`%PDF-`)
      - Return `false` if `buffer` is falsy or shorter than 5 bytes
      - Return `buffer.slice(0, 5).equals(PDF_MAGIC)`
    - In `server/controllers/resourceController.js`, import `validatePdfMagicBytes` and call it after the existing MIME type check (step 5b), before the Cloudinary upload:
      `if (!validatePdfMagicBytes(file.buffer)) { res.status(400); throw new Error('File content does not match PDF format'); }`
    - _Bug_Condition: `file.mimetype == 'application/pdf' AND magicBytesOf(file.buffer) != '%PDF-'` (design §H7)_
    - _Expected_Behavior: Upload returns HTTP 400 with 'File content does not match PDF format' (design §H7)_
    - _Preservation: Genuine PDFs (first 5 bytes = `%PDF-`) continue to upload successfully (3.3)_
    - _Requirements: 1.8, 2.4_

  - [x] 3.4 H9 — Create virusScanner.js and integrate ClamAV scan into upload controller
    - Create `server/lib/virusScanner.js` with exported `scanBuffer(buffer)`:
      - Lazy-initialise a singleton `NodeClam` instance using `clamdscan` with socket from `CLAMAV_SOCKET` env var
      - If `NODE_CLAMSCAN_ENABLED !== 'true'`, return `true` immediately (disabled in dev/test)
      - If `isInfected`, log detected virus names and throw `new Error('File failed security scan and was rejected')`
    - In `server/controllers/resourceController.js`, import `scanBuffer` and call it after the magic byte check (step 5c):
      `try { await scanBuffer(file.buffer); } catch (scanErr) { res.status(400); throw new Error(scanErr.message); }`
    - Add `NODE_CLAMSCAN_ENABLED=false` and `CLAMAV_SOCKET=/var/run/clamav/clamd.ctl` to `server/.env`
    - Install: `cd server && npm install clamscan@2.2.1`
    - _Bug_Condition: `fileScan(file.buffer) == 'INFECTED' AND NOT scanPerformedBeforeCloudinary` (design §H9)_
    - _Expected_Behavior: EICAR test file upload returns HTTP 400 when `NODE_CLAMSCAN_ENABLED=true` (design §H9)_
    - _Preservation: Clean files pass through scan and continue uploading normally when enabled; scan is no-op when disabled (3.3)_
    - _Requirements: 1.10, 2.5_

  - [x] 3.5 H5 — Create AuditLog model and write audit log on deleteResource
    - Create `server/models/AuditLog.js` with Mongoose schema:
      - Fields: `action` (enum: DELETE/UPDATE/CREATE, required), `resourceId` (ObjectId, required), `resourceTitle` (String, required), `performedBy` (ObjectId ref User, required), `performedAt` (Date, default now, indexed)
      - TTL index: `{ performedAt: 1 }, { expireAfterSeconds: 31536000 }` (1 year auto-expiry)
      - Collection name: `auditlogs`
    - In `server/controllers/resourceController.js` `deleteResource`, import `AuditLog` and call `AuditLog.create({ action: 'DELETE', resourceId: resource._id, resourceTitle: resource.title, performedBy: req.user._id })` BEFORE the Cloudinary destroy call
    - _Bug_Condition: `request.method == 'DELETE' AND auditLogWritten == false` (design §H5)_
    - _Expected_Behavior: AuditLog document created with correct action/resourceId/resourceTitle/performedBy before deletion (design §H5)_
    - _Preservation: Existing delete still removes MongoDB document and Cloudinary file and returns 200 (3.1)_
    - _Requirements: 1.6, 2.1_

- [x] 4. Group 1 verification — run existing tests, confirm no regressions
  - Run server test suite: `cd server && npm test`
  - Run client test suite: `cd client && npm test -- --run`
  - Confirm all tests that passed before Group 1 still pass
  - Confirm the 5 Group 1 bug condition assertions now FAIL with the correct 4xx responses (H7, H8, H9, H10) or audit log entries (H5)
  - **Property 2: Preservation** - all Group 1 preservation tests still pass
  - _Requirements: 3.1, 3.3, 3.4, 3.9_


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 2 — AUTH MIGRATION  (breaking, must be done atomically)
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 5. Group 2 — Auth migration (H3, H2+H6 server-side, H2+H6 client-side)

  - [x] 5.1 H3 — Create tokenBlacklist.js and wire JTI into signToken + protectAdmin
    - Create `server/lib/tokenBlacklist.js` exporting `export const tokenBlacklist = new Set()`
      - Add inline comment: in-memory, clears on restart; replace with Redis SET for multi-process deployments
    - In `server/controllers/authController.js`, import `crypto` from `node:crypto`; update `signToken(userId, role)` to:
      - Generate `const jti = crypto.randomUUID()`
      - Call `jwt.sign({ id: userId, role, jti }, secret, { expiresIn: '4h' })` (reduce from 1d to 4h)
      - Return `{ token, jti }`
    - In `server/middlewares/authMiddleware.js`, import `tokenBlacklist` and after `jwt.verify()` add:
      `if (decoded.jti && tokenBlacklist.has(decoded.jti)) { res.status(401); throw new Error('Token has been revoked'); }`
    - Server still reads from `Authorization: Bearer` header at this point — client-side auth not broken yet
    - _Bug_Condition: `hasValidAdminToken(req) AND tokenBlacklist == null` (design §H3)_
    - _Expected_Behavior: Adding a JTI to the blacklist causes subsequent requests with that token to return 401 (design §H3)_
    - _Preservation: Tokens not in the blacklist continue to authenticate normally (3.1, 3.2, 3.3)_
    - _Requirements: 1.4, 2.3_

  - [ ] 5.2 H2+H6 — Server: cookie-parser, CSRF middleware, authController login/logout, authMiddleware cookie read
    - Install: `cd server && npm install cookie-parser@1.4.7`
    - In `server/server.js`:
      - Add `import cookieParser from 'cookie-parser'`
      - Register `app.use(cookieParser())` after `helmet()` and before `express.json()`
      - Create and import `csrfMiddleware` (next sub-step), register `app.use(csrfMiddleware)` after `cookieParser()`
    - Create `server/middlewares/csrfMiddleware.js`:
      - State-changing methods: POST, PATCH, PUT, DELETE; exempt path: `/api/auth/login`
      - Compare `req.cookies?.csrf_token` === `req.headers['x-csrf-token']`; mismatch → 403 CSRF token mismatch
    - In `server/controllers/authController.js` `loginAdmin`:
      - Call updated `signToken` to get `{ token }`, generate `csrfToken = crypto.randomUUID()`
      - Set `res.cookie('educrate_token', token, { httpOnly: true, secure: NODE_ENV==='production', sameSite: 'strict', maxAge: 4*60*60*1000 })`
      - Set `res.cookie('csrf_token', csrfToken, { httpOnly: false, secure: NODE_ENV==='production', sameSite: 'strict', maxAge: 4*60*60*1000 })`
      - Return `res.json({ user: { id, email, role } })` — NO token in body
    - Add `logoutAdmin` controller: decode cookie token → add jti to blacklist → clearCookie both cookies → json 200
    - Register `POST /api/auth/logout` route in `server/routes/apiRoutes.js`
    - In `server/middlewares/authMiddleware.js`, replace header read with `req.cookies?.educrate_token`
    - Remove `getTokenFromHeader` helper if it is no longer used elsewhere
    - _Bug_Condition: `systemState.jwtStorageLocation == 'localStorage'` and `csrfTokenValidated == false` (design §H2, H6)_
    - _Expected_Behavior: Login sets httpOnly cookie; subsequent requests need matching X-CSRF-Token header (design §H2, H6)_
    - _Preservation: Login with correct creds still succeeds; wrong creds still return 401; rate limiter unchanged (3.6, 3.7, 3.8)_
    - _Requirements: 1.3, 1.7, 2.2, 2.3_


  - [~] 5.3 H2+H6 — Client: remove localStorage token, add credentials:include and CSRF header
    - In `client/src/lib/api.js`:
      - Remove all `localStorage.getItem('educrate_admin_auth')` reads and `Authorization: Bearer` header injection
      - Add helper `getCsrfToken()` that reads from `document.cookie` with regex `/(?:^|;\s*)csrf_token=([^;]+)/`
      - Update `jsonHeaders({ csrf = false } = {})`: remove token logic; add `'X-CSRF-Token': getCsrfToken()` when `csrf: true`
      - Add `credentials: 'include'` to ALL `fetch()` calls
      - State-changing calls (POST, PATCH, DELETE): pass `{ csrf: true }` to `jsonHeaders()`
      - `loginAdmin`: response now returns `{ user }` not `{ token, user }` — update destructuring accordingly
      - Add `export const logoutAdmin = async () => fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: jsonHeaders({ csrf: true }), credentials: 'include' })`
    - In `client/src/context/AuthContext.jsx`:
      - Change storage key / storage from `localStorage` to `sessionStorage` (or no persistence — cookie is the real session)
      - `login({ user })`: store only `{ user }` — no `token` field
      - `logout()`: call `logoutApi()` (best-effort), then `sessionStorage.removeItem(AUTH_STORAGE_KEY)`, then `setAuth(null)`
      - Remove `token` from context value surface entirely
      - Update `isAdmin` derivation: `auth?.user?.role === 'admin'`
    - Verify no remaining `localStorage` reads for auth token anywhere in `client/src/`
    - _Bug_Condition: `systemState.jwtStorageLocation == 'localStorage'` (design §H2)_
    - _Expected_Behavior: After login, `localStorage.getItem('educrate_admin_auth')` returns null; token not in JS-accessible storage (design §H2)_
    - _Preservation: Admin panel still functions; login/logout flows work end-to-end; AdminRoute guard still redirects unauthenticated users (3.12)_
    - _Requirements: 1.3, 1.24, 2.2_

- [~] 6. Group 2 verification — run existing tests, confirm auth migration is complete
  - Run server test suite: `cd server && npm test`
  - Run client test suite: `cd client && npm test -- --run`
  - Manually verify login → cookie set (check DevTools Application → Cookies: `educrate_token` httpOnly, `csrf_token` JS-readable)
  - Manually verify logout → both cookies cleared, subsequent authenticated request returns 401
  - Manually verify `localStorage.getItem('educrate_admin_auth')` returns null after login
  - Confirm H2, H3, H6 bug condition assertions now FAIL with the expected behaviours
  - **Property 2: Preservation** - login, logout, authenticated DELETE, authenticated PATCH, and resource fetch all continue to work
  - _Requirements: 3.6, 3.7, 3.8, 3.12_


<!-- ═══════════════════════════════════════════════════════════════════════════
     GROUP 3 — ROUTE PROTECTION  (H1 + H4)
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 7. Group 3 — Route protection (H1 + H4)

  - [~] 7.1 H1+H4 — Add protectAdmin to POST /api/resources, GET /api/resources, GET /api/resources/:id/file-url
    - In `server/routes/apiRoutes.js`, update the `/resources` route chain to:
      ```
      router.route('/resources')
        .get(protectAdmin, getResources)
        .post(uploadRateLimit, protectAdmin, upload.single('file'), uploadResource);
      ```
      - `uploadRateLimit` stays as FIRST middleware on POST (throttle before auth CPU cost)
      - `protectAdmin` is added to GET (H4) and confirmed on POST (H1)
    - Add `protectAdmin` to the file-url route:
      `router.get('/resources/:id/file-url', protectAdmin, getResourceFileUrl)`
    - Confirm `protectAdmin` is already on DELETE and PATCH routes — do not remove it
    - Confirm `uploadRateLimit` was already added in task 3.2 — do not duplicate it
    - _Bug_Condition (H1): `request.method == 'POST' AND path == '/api/resources' AND NOT hasValidAdminToken(req)` (design §H1)_
    - _Bug_Condition (H4): `request.method == 'GET' AND path == '/api/resources' AND NOT hasValidAdminToken(req)` (design §H4)_
    - _Expected_Behavior: Unauthenticated POST returns 401; unauthenticated GET returns 401 (design §H1, H4)_
    - _Preservation: Authenticated admin continues to upload resources and list resources successfully (3.3, 3.4, 3.5)_
    - _Requirements: 1.1, 1.5, 2.1_

- [~] 8. Group 3 verification — run existing tests, confirm all 10 HIGH fixes are in place
  - Run server test suite: `cd server && npm test`
  - Run client test suite: `cd client && npm test -- --run`
  - Confirm `POST /api/resources` without auth cookie returns 401
  - Confirm `GET /api/resources` without auth cookie returns 401
  - Confirm `GET /api/resources/:id/file-url` without auth cookie returns 401
  - **Property 2: Preservation** - authenticated admin can still upload, list, delete, pin resources and log in/out
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


<!-- ═══════════════════════════════════════════════════════════════════════════
     FINAL VALIDATION
     ═══════════════════════════════════════════════════════════════════════════ -->

- [ ] 9. Final checkpoint — verify all 10 HIGH fixes and no regressions

  - [~] 9.1 Re-run bug condition exploration test from task 1
    - **Property 1: Expected Behavior** - All 10 HIGH Vulnerabilities Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - H1: `POST /api/resources` without auth → 401 ✓
    - H2: `localStorage` does not contain JWT after login ✓
    - H3: Blacklisted JTI rejected with 401 ✓
    - H4: `GET /api/resources` without auth → 401 ✓
    - H5: AuditLog entry created before DELETE ✓
    - H6: DELETE without `X-CSRF-Token` → 403 ✓
    - H7: Non-PDF uploaded with PDF MIME type → 400 ✓
    - H8: 11th upload in 10-min window → 429 ✓
    - H9: EICAR file upload → 400 when `NODE_CLAMSCAN_ENABLED=true` ✓
    - H10: `grep SUPABASE client/dist/assets/*.js` → no results ✓
    - **EXPECTED OUTCOME**: All 10 assertions PASS (confirms all bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [~] 9.2 Re-run preservation property tests from task 2
    - **Property 2: Preservation** - All 15 Non-Buggy Behaviors Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - All 15 preservation properties (3.1–3.15) must still pass
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15_

- [~] 10. Checkpoint — Ensure all tests pass
  - Run full test suites: `cd server && npm test` and `cd client && npm test -- --run`
  - All 10 bug condition assertions pass (bugs confirmed fixed)
  - All preservation tests pass (no regressions introduced)
  - No new TypeScript/ESLint errors in modified files
  - If any test fails or questions arise, pause and consult with the team before proceeding

## Notes

- Tasks 5.1 → 5.2 → 5.3 (Group 2) must be applied in sequence and ideally deployed atomically — the server cookie changes (5.2) must ship before the client Bearer header removal (5.3) or authenticated requests will break in production.
- H9 (ClamAV) requires `NODE_CLAMSCAN_ENABLED=true` and a running ClamAV daemon to enforce scanning in production; the flag defaults to `false` so development environments are unaffected.
- The token blacklist (H3) is in-memory — it clears on server restart. For multi-instance deployments, replace `tokenBlacklist.js` with a Redis SET before going to production scale.
- H10 requires a manual key rotation step in the Supabase dashboard — this cannot be automated via code and must be confirmed by the team.
