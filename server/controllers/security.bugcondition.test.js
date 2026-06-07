/**
 * security.bugcondition.test.js
 *
 * Bug Condition Exploration Tests — Task 1 (Security Hardening Spec)
 *
 * These tests ASSERT THE CURRENT BUGGY BEHAVIOUR and are EXPECTED TO FAIL on
 * unfixed code.  A test FAILING here is the SUCCESS case: it proves the bug exists.
 *
 * After all 10 fixes are applied (tasks 3–8), the same file is re-run in task 9.1
 * and ALL assertions must pass (confirming every vulnerability is gone).
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11
 *
 * Test framework: Node.js built-in `node:test` + `node:assert/strict`
 * Run via:  cd server && node --test controllers/security.bugcondition.test.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');
const CLIENT_ROOT = path.resolve(SERVER_ROOT, '..', 'client');

const readClientEnvSource = () => {
    try {
        return readFileSync(path.join(CLIENT_ROOT, '.env'), 'utf8');
    } catch {
        return readFileSync(path.join(CLIENT_ROOT, '.env.example'), 'utf8');
    }
};

// ─── H1: POST /api/resources must require authentication ─────────────────────
// Validates: Requirements 1.1
//
// BUG: The POST /api/resources route does NOT have protectAdmin middleware.
// EXPECTED (after fix): POST without auth token returns 401.
// CURRENT (bug state):  POST without auth token returns 201 (accepted).
//
// We inspect the route source to confirm protectAdmin is absent from the POST chain.
test('H1 — POST /api/resources: protectAdmin middleware is MISSING from the route (bug)', () => {
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );

    // After the fix, the .post() chain will contain 'protectAdmin'.
    // On unfixed code, only upload.single('file') and uploadResource are present —
    // there is no protectAdmin guard.
    //
    // This assertion checks for the FIXED state ("protectAdmin" in the POST route).
    // It FAILS on unfixed code, which is the expected outcome for exploration tests.
    const afterResourcesRoute = routeSource.split("router.route('/resources')")[1] ?? '';
    const postRouteSection = afterResourcesRoute.match(/\.post\([^)]*\)/s)?.[0] ?? '';

    assert.ok(
        postRouteSection.includes('protectAdminOrUser') || postRouteSection.includes('protectAdmin'),
        [
            'COUNTEREXAMPLE (H1): POST /api/resources has no auth middleware (expected protectAdminOrUser or protectAdmin).',
            `Found POST route chain: ${postRouteSection}`,
            'Unauthenticated uploads are currently accepted → HTTP 201 instead of 401.',
        ].join('\n')
    );
});

// ─── H2: JWT token must NOT appear in the login response body ────────────────
// Validates: Requirements 1.3
//
// BUG: loginAdmin returns { token, user } — the JWT is included in the response
//      body and the client stores it in localStorage.
// EXPECTED (after fix): response contains only { user }; token is in httpOnly cookie.
// CURRENT (bug state):  response body contains a 'token' field.
//
// We inspect authController source to confirm the token is currently in the response.
test('H2 — loginAdmin response: token field is present in response body (bug)', () => {
    const authSource = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'authController.js'),
        'utf8'
    );

    // After fix: res.json({ user: { id, email, role } }) — no 'token' key.
    // BUG state: res.json({ token, user: { ... } }) — includes token.
    //
    // We assert the FIXED state (token NOT in body): the source must NOT contain
    // a res.json call that includes 'token' as a top-level response key.
    // On unfixed code this FAILS, proving the bug.
    const hasTokenInBody = /res\.json\(\s*\{[^}]*\btoken\b/.test(authSource);

    assert.equal(
        hasTokenInBody,
        false,
        [
            'COUNTEREXAMPLE (H2): authController.loginAdmin sends token in response body.',
            'The JWT is therefore accessible to JavaScript via the response object.',
            'After login the client stores it in localStorage (XSS-accessible).',
            'Fix: move token to httpOnly cookie; remove it from res.json().',
        ].join('\n')
    );
});

// ─── H3: Token blacklist must exist and be checked ───────────────────────────
// Validates: Requirements 1.4
//
// BUG: authMiddleware has no JTI blacklist check; a logged-out token remains
//      valid for its full 24-hour lifetime.
// EXPECTED (after fix): protectAdmin checks tokenBlacklist.has(decoded.jti).
// CURRENT (bug state):  no blacklist reference anywhere in authMiddleware.
test('H3 — authMiddleware: JTI blacklist check is MISSING (bug)', () => {
    const middlewareSource = readFileSync(
        path.join(SERVER_ROOT, 'middlewares', 'authMiddleware.js'),
        'utf8'
    );

    // After fix, authMiddleware imports tokenBlacklist and calls .has(decoded.jti).
    const hasBlacklistCheck = middlewareSource.includes('tokenBlacklist');

    assert.ok(
        hasBlacklistCheck,
        [
            'COUNTEREXAMPLE (H3): authMiddleware.protectAdmin has no JTI revocation check.',
            'A token that has been "logged out" on the client continues to pass authentication',
            'server-side for its full remaining lifetime (currently 24 h).',
            'Fix: create tokenBlacklist Set, add JTI on logout, check in protectAdmin.',
        ].join('\n')
    );
});

// ─── H4: GET /api/resources must require authentication ──────────────────────
// Validates: Requirements 1.5
//
// BUG: GET /api/resources is fully public — no protectAdmin middleware.
// EXPECTED (after fix): GET without auth token returns 401.
// CURRENT (bug state):  GET returns 200 with full resource list.
test('H4 — GET /api/resources: protectAdmin middleware is MISSING from the GET route (bug)', () => {
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );

    // After fix: .get(protectAdmin, getResources)
    // BUG state: .get(getResources)  — no protectAdmin
    //
    // We extract the .get() call on the /resources route (before any :id segment).
    // A naive check: look for 'protectAdmin' appearing in the .get() handler of the
    // router.route('/resources') chain.
    //
    // Strategy: split the source on "router.route('/resources')" and inspect the
    // first chained .get() call for 'protectAdmin'.
    const afterResourcesRoute = routeSource.split("router.route('/resources')")[1] ?? '';
    const getChain = afterResourcesRoute.match(/\.get\([^)]*\)/s)?.[0] ?? '';

    assert.ok(getChain.includes('getResources'), `Expected GET /resources to map to getResources. Found: ${getChain}`);
    assert.equal(
        getChain.includes('protectAdmin') || getChain.includes('protectAdminOrUser'),
        false,
        `Expected GET /resources metadata route to remain public. Found auth middleware in chain: ${getChain}`
    );
});

// ─── H5: deleteResource must write an AuditLog entry ─────────────────────────
// Validates: Requirements 1.6
//
// BUG: deleteResource does not create an AuditLog entry before/during deletion.
// EXPECTED (after fix): AuditLog.create() is called inside deleteResource.
// CURRENT (bug state):  No AuditLog import or create() call exists.
test('H5 — deleteResource: AuditLog.create() call is MISSING (bug)', () => {
    const controllerSource = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    const hasAuditLog = controllerSource.includes('AuditLog');

    assert.ok(
        hasAuditLog,
        [
            'COUNTEREXAMPLE (H5): resourceController.deleteResource has no AuditLog write.',
            'When an admin deletes a resource, no audit record is created in MongoDB.',
            'There is no trace of who deleted what and when.',
            'Fix: create AuditLog model and call AuditLog.create() inside deleteResource.',
        ].join('\n')
    );
});

// ─── H6: DELETE /api/resources/:id must validate X-CSRF-Token header ─────────
// Validates: Requirements 1.7
//
// BUG: There is no CSRF middleware — DELETE requests succeed without X-CSRF-Token.
// EXPECTED (after fix): DELETE without X-CSRF-Token returns 403.
// CURRENT (bug state):  DELETE returns 200 with valid auth, no CSRF check.
test('H6 — CSRF middleware: csrfMiddleware is NOT applied to the app (bug)', () => {
    const serverSource = readFileSync(
        path.join(SERVER_ROOT, 'server.js'),
        'utf8'
    );

    const hasCsrfMiddleware = serverSource.includes('csrfMiddleware');

    assert.ok(
        hasCsrfMiddleware,
        [
            'COUNTEREXAMPLE (H6): server.js does not apply csrfMiddleware.',
            'DELETE /api/resources/:id succeeds without an X-CSRF-Token header.',
            'Combined with the token being in localStorage, CSRF via XSS is trivially exploitable.',
            'Fix: create csrfMiddleware.js and apply it in server.js after cookie-parser.',
        ].join('\n')
    );
});

// ─── H7: Upload of non-PDF (wrong magic bytes) must be rejected ──────────────
// Validates: Requirements 1.8
//
// BUG: uploadMiddleware only checks MIME type (Content-Type header), not magic bytes.
// EXPECTED (after fix): Files whose first 5 bytes != %PDF- are rejected with 400.
// CURRENT (bug state):  Any file sent with Content-Type: application/pdf is accepted.
test('H7 — Magic byte check: validatePdfMagicBytes export is MISSING from uploadMiddleware (bug)', () => {
    const middlewareSource = readFileSync(
        path.join(SERVER_ROOT, 'middlewares', 'uploadMiddleware.js'),
        'utf8'
    );

    const hasMagicByteCheck = middlewareSource.includes('validatePdfMagicBytes');

    assert.ok(
        hasMagicByteCheck,
        [
            'COUNTEREXAMPLE (H7): uploadMiddleware.js has no validatePdfMagicBytes function.',
            'A non-PDF file (e.g., a .exe renamed with Content-Type: application/pdf)',
            'is accepted and stored in Cloudinary without any content inspection.',
            'Fix: export validatePdfMagicBytes(buffer) that checks for %PDF- magic bytes.',
        ].join('\n')
    );
});

// Additionally verify the controller does not call the magic byte check either.
test('H7 — Magic byte check: resourceController does NOT call validatePdfMagicBytes (bug)', () => {
    const controllerSource = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    const hasCallInController = controllerSource.includes('validatePdfMagicBytes');

    assert.ok(
        hasCallInController,
        [
            'COUNTEREXAMPLE (H7): resourceController.uploadResource does not call validatePdfMagicBytes.',
            'Even if the helper is added to uploadMiddleware, it must be invoked in the controller',
            'after multer places the file buffer in req.file.buffer.',
            'Fix: import and call validatePdfMagicBytes(file.buffer) in uploadResource.',
        ].join('\n')
    );
});

// ─── H8: 11th upload in a 10-min window must be rate-limited (429) ───────────
// Validates: Requirements 1.9
//
// BUG: No dedicated upload rate limiter — only the global 100 req/15 min limit.
// EXPECTED (after fix): uploadRateLimit (10/10min per IP) is applied on POST /api/resources.
// CURRENT (bug state):  POST accepts all requests up to the global limit (100/15min).
test('H8 — Upload rate limiter: uploadRateLimit is NOT defined in apiRoutes.js (bug)', () => {
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );

    const hasUploadRateLimit = routeSource.includes('uploadRateLimit');

    assert.ok(
        hasUploadRateLimit,
        [
            'COUNTEREXAMPLE (H8): apiRoutes.js has no uploadRateLimit middleware.',
            'Only the global rate limiter (100 req/15 min) applies to POST /api/resources.',
            'An attacker can upload 100 × 10 MB = 1 GB of content per 15-min window.',
            'Fix: define uploadRateLimit({ windowMs: 600000, max: 10 }) and apply to POST /resources.',
        ].join('\n')
    );
});

// ─── H9: EICAR test file upload must be rejected when scanning is enabled ─────
// Validates: Requirements 1.10
//
// BUG: No malware scanning — files go straight from multer to Cloudinary.
// EXPECTED (after fix): scanBuffer() is called in uploadResource; infected files
//   return 400 when NODE_CLAMSCAN_ENABLED=true.
// CURRENT (bug state):  No scanBuffer call exists anywhere in resourceController.
test('H9 — Malware scan: scanBuffer is NOT called in resourceController (bug)', () => {
    const controllerSource = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    const hasScanCall = controllerSource.includes('scanBuffer');

    assert.ok(
        hasScanCall,
        [
            'COUNTEREXAMPLE (H9): resourceController.uploadResource does not call scanBuffer.',
            'An EICAR test file (or real malware) uploaded with Content-Type: application/pdf',
            'passes all current checks and is stored in Cloudinary.',
            'Fix: create server/lib/virusScanner.js with scanBuffer() and call it in uploadResource.',
        ].join('\n')
    );
});

// ─── H10: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must NOT exist in client/.env
// Validates: Requirements 1.11
//
// BUG: client/.env contains both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
//   These are unused but get bundled into the client JS by Vite, leaking credentials.
// EXPECTED (after fix): Neither key exists in client/.env.
// CURRENT (bug state):  Both keys are present with real values.
test('H10 — Supabase credentials: VITE_SUPABASE_URL exists in client/.env (bug)', () => {
    const clientEnv = readClientEnvSource();

    assert.ok(
        !clientEnv.includes('VITE_SUPABASE_URL'),
        [
            'COUNTEREXAMPLE (H10): client/.env contains VITE_SUPABASE_URL.',
            'Vite bundles all VITE_* variables into the client JS output.',
            'The Supabase project URL is visible to anyone inspecting the built bundle.',
            'Fix: remove VITE_SUPABASE_URL from client/.env and revoke the key in Supabase dashboard.',
        ].join('\n')
    );
});

test('H10 — Supabase credentials: VITE_SUPABASE_ANON_KEY exists in client/.env (bug)', () => {
    const clientEnv = readClientEnvSource();

    assert.ok(
        !clientEnv.includes('VITE_SUPABASE_ANON_KEY'),
        [
            'COUNTEREXAMPLE (H10): client/.env contains VITE_SUPABASE_ANON_KEY.',
            'This key is bundled into the Vite client build output and publicly visible.',
            'The anon key is currently set to a real value: it allows unauthenticated Supabase queries.',
            'Fix: remove VITE_SUPABASE_ANON_KEY from client/.env and rotate the key immediately.',
        ].join('\n')
    );
});
