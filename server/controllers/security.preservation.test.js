/**
 * security.preservation.test.js
 *
 * Preservation Tests — Task 2 (Security Hardening Spec)
 *
 * These tests ASSERT NON-BUGGY BEHAVIOUR that must CONTINUE TO WORK both on the
 * current (unfixed) code AND after all security fixes are applied (tasks 3–8).
 *
 * A test failing here means a REGRESSION was introduced by one of the security fixes.
 *
 * Tests 3.1–3.15 map directly to bugfix.md §3 "Unchanged Behavior (Regression Prevention)".
 *
 * Test framework: Node.js built-in `node:test` + `node:assert/strict`
 * Run via: cd server && node --test controllers/security.preservation.test.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '..');
const CLIENT_ROOT = path.resolve(SERVER_ROOT, '..', 'client');

// ─────────────────────────────────────────────────────────────────────────────
// 3.1 — Authenticated admin DELETE removes resource from MongoDB + Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
test('3.1 — deleteResource: deletes from MongoDB and calls Cloudinary destroy', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    // Must call cloudinary.uploader.destroy to remove from Cloudinary
    assert.ok(
        source.includes('cloudinary.uploader.destroy'),
        'deleteResource must call cloudinary.uploader.destroy to remove the file from Cloudinary'
    );

    // Must call Resource.findByIdAndDelete to remove from MongoDB
    assert.ok(
        source.includes('findByIdAndDelete'),
        'deleteResource must call Resource.findByIdAndDelete to remove the document from MongoDB'
    );

    // The DELETE route must still have protectAdmin on it (existing auth guard preserved)
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );
    assert.ok(
        routeSource.includes('protectAdminOrUser, deleteResource') ||
        routeSource.includes('protectAdminOrUser,deleteResource') ||
        routeSource.includes('protectAdmin, deleteResource') ||
        routeSource.includes('protectAdmin,deleteResource'),
        'DELETE /api/resources/:id must keep the protectAdmin or protectAdminOrUser guard'
    );

    // The controller must respond with a success message
    assert.ok(
        source.includes('Resource deleted successfully'),
        'deleteResource must return a "Resource deleted successfully" message on success'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.2 — Authenticated admin PATCH /pin updates isPinned
// ─────────────────────────────────────────────────────────────────────────────
test('3.2 — updateResourcePin: PATCH /pin updates isPinned field and returns updated document', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    // Must use findByIdAndUpdate with { new: true }
    assert.ok(
        source.includes('findByIdAndUpdate'),
        'updateResourcePin must call Resource.findByIdAndUpdate'
    );
    assert.ok(
        source.includes('new: true'),
        'updateResourcePin must pass { new: true } to get the updated document back'
    );
    assert.ok(
        source.includes('isPinned'),
        'updateResourcePin must update the isPinned field'
    );

    // The route must have protectAdmin
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );
    assert.ok(
        routeSource.includes("patch('/resources/:id/pin', protectAdmin") ||
        routeSource.includes("patch('/resources/:id/pin',protectAdmin"),
        'PATCH /resources/:id/pin must keep the protectAdmin guard'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3 — Valid PDF upload (≤10MB) by authenticated admin returns 201
// ─────────────────────────────────────────────────────────────────────────────
test('3.3 — uploadResource: valid PDF upload pipeline stores to Cloudinary, saves to MongoDB, returns 201', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    // Must use Cloudinary upload stream
    assert.ok(
        source.includes('upload_stream') || source.includes('uploadToCloudinary'),
        'uploadResource must upload the file buffer to Cloudinary'
    );

    // Must persist metadata in MongoDB
    assert.ok(
        source.includes('Resource.create'),
        'uploadResource must call Resource.create to persist metadata in MongoDB'
    );

    // Must respond with 201
    assert.ok(
        source.includes('res.status(201)') || source.includes('status(201)'),
        'uploadResource must return HTTP 201 on success'
    );

    // Must validate MIME type (belt-and-suspenders check preserved)
    assert.ok(
        source.includes("'application/pdf'"),
        'uploadResource must check that the MIME type is application/pdf'
    );

    // Upload middleware must still accept application/pdf and enforce 10MB limit
    const middlewareSource = readFileSync(
        path.join(SERVER_ROOT, 'middlewares', 'uploadMiddleware.js'),
        'utf8'
    );
    assert.ok(
        middlewareSource.includes("'application/pdf'"),
        'uploadMiddleware fileFilter must still accept application/pdf files'
    );
    assert.ok(
        middlewareSource.includes('10 * 1024 * 1024') || middlewareSource.includes('10485760'),
        'uploadMiddleware must still enforce the 10 MB file size limit'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.4 — GET /api/resources returns filtered JSON in expected shape
// ─────────────────────────────────────────────────────────────────────────────
test('3.4 — getResources: source code confirms correct query parameter handling for semester, type, isPinned, search, limit', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    // buildResourceQuery must handle semester as an exact filter
    assert.ok(
        source.includes('query.semester = semester') || source.includes('query.semester'),
        'buildResourceQuery must apply semester as an exact filter'
    );

    // buildResourceQuery must handle type as an exact filter
    assert.ok(
        source.includes('query.type = type') || source.includes('query.type'),
        'buildResourceQuery must apply type as an exact filter'
    );

    // buildResourceQuery must handle isPinned — normalising string 'true' to boolean
    assert.ok(
        source.includes("isPinned === 'true'") || source.includes('isPinned === true'),
        "buildResourceQuery must normalise isPinned string 'true' to boolean true"
    );

    // buildResourceQuery must support search via regex $or across 5 fields
    assert.ok(
        source.includes('$or'),
        'buildResourceQuery must construct a $or query for search terms'
    );
    assert.ok(
        source.includes('escapeRegex') || source.includes('replace(/[.*+?^${}()|'),
        'buildResourceQuery must escape regex metacharacters in search terms'
    );

    // getResources must support the limit parameter
    assert.ok(
        source.includes('.limit(') || source.includes('resourcesQuery.limit'),
        'getResources must apply the limit parameter to the MongoDB query'
    );

    // getResources must return results via res.json
    assert.ok(
        source.includes('res.json(resources)'),
        'getResources must return results via res.json(resources)'
    );

    // Results must be sorted by createdAt descending (most recent first)
    assert.ok(
        source.includes("sort({ createdAt: -1 })") || source.includes("sort({createdAt:-1})"),
        'getResources must sort results by createdAt descending'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.5 — GET /api/resources/:id/file-url returns { url, expiresAt }
// ─────────────────────────────────────────────────────────────────────────────
test('3.5 — getResourceFileUrl: generates Cloudinary signed URL and returns { url, expiresAt }', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    // Must use Cloudinary private_download_url (signed URL generation)
    assert.ok(
        source.includes('private_download_url'),
        'getResourceFileUrl must call cloudinary.utils.private_download_url to generate a signed URL'
    );

    // Must compute a 10-minute expiry (600 seconds from now)
    assert.ok(
        source.includes('10 * 60') || source.includes('600'),
        'getResourceFileUrl must set a 10-minute (600-second) expiry'
    );

    // Must return { url, expiresAt } shape
    assert.ok(
        source.includes('{ url, expiresAt }') || (source.includes('url') && source.includes('expiresAt')),
        'getResourceFileUrl must respond with { url, expiresAt }'
    );

    // Route must exist in apiRoutes.js
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );
    assert.ok(
        routeSource.includes("'/resources/:id/file-url'"),
        "GET /api/resources/:id/file-url route must still be registered"
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.6 — POST /api/auth/login with correct credentials returns { token, user }
//        NOTE: This is the CURRENT behaviour on unfixed code.
//        After fix H2 is applied (task 5.2), the response changes to { user }.
//        That is an EXPECTED contract change — post-fix tests in task 9.1 will
//        update this assertion accordingly.
// ─────────────────────────────────────────────────────────────────────────────
test('3.6 — loginAdmin: successful login returns only user in response body', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'authController.js'),
        'utf8'
    );

    // Current secure behavior: token should not be sent in response JSON.
    const hasTokenInBody = /res\.json\(\s*\{[^}]*\btoken\b/.test(source);
    assert.ok(
        !hasTokenInBody,
        'loginAdmin must not send token in the response body'
    );

    // The user object must include email and role
    assert.ok(
        source.includes('user.email') && source.includes('user.role'),
        'loginAdmin must include email and role in the user object returned'
    );

    // The login route must still be registered
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );
    assert.ok(
        routeSource.includes("'/auth/login'") || routeSource.includes('"/auth/login"'),
        'POST /api/auth/login route must still be registered'
    );

    // The rate limiter must still be applied on login
    assert.ok(
        routeSource.includes('loginLimiter'),
        'loginLimiter middleware must still be applied to POST /api/auth/login'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.7 — POST /api/auth/login with wrong credentials returns HTTP 401
// ─────────────────────────────────────────────────────────────────────────────
test("3.7 — loginAdmin: wrong credentials return HTTP 401 with 'Invalid credentials'", () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'authController.js'),
        'utf8'
    );

    // Must set status 401 on invalid credentials
    assert.ok(
        source.includes('res.status(401)'),
        'loginAdmin must set res.status(401) for invalid credentials'
    );

    // Must use the generic 'Invalid credentials' message (no user enumeration)
    const invalidCredCount = (source.match(/['"]Invalid credentials['"]/g) || []).length;
    assert.ok(
        invalidCredCount >= 2,
        "loginAdmin must use 'Invalid credentials' for both 'user not found' and 'wrong password' cases (no user enumeration)"
    );

    // Must reject non-admin role with the same message
    assert.ok(
        source.includes("user.role !== 'admin'"),
        'loginAdmin must reject non-admin roles with the same Invalid credentials message'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.8 — After 5 failed logins from same IP in 10 min, 6th attempt returns 429
// ─────────────────────────────────────────────────────────────────────────────
test('3.8 — loginLimiter: rate limit of 5 attempts per 10 min is configured', () => {
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );

    // loginLimiter must exist and be applied to the login route
    assert.ok(
        routeSource.includes('loginLimiter'),
        'loginLimiter must be defined and applied to POST /api/auth/login'
    );

    // windowMs must be 10 minutes (600000 ms)
    assert.ok(
        routeSource.includes('10 * 60 * 1000') || routeSource.includes('600000'),
        'loginLimiter windowMs must be set to 10 minutes (10 * 60 * 1000 ms)'
    );

    // max must be 5
    assert.ok(
        /max:\s*5[^0-9]/.test(routeSource),
        'loginLimiter max must be set to 5 attempts'
    );

    // standardHeaders must be true so clients receive RateLimit-* headers and 429 status
    assert.ok(
        routeSource.includes('standardHeaders: true'),
        'loginLimiter must set standardHeaders: true so clients receive RateLimit-* headers'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.9 — Non-PDF or >10MB file upload returns HTTP 400
// ─────────────────────────────────────────────────────────────────────────────
test('3.9 — upload validation: non-PDF MIME type and oversized files are rejected with HTTP 400', () => {
    const middlewareSource = readFileSync(
        path.join(SERVER_ROOT, 'middlewares', 'uploadMiddleware.js'),
        'utf8'
    );

    // fileFilter must reject non-application/pdf files
    assert.ok(
        middlewareSource.includes("'application/pdf'"),
        'uploadMiddleware fileFilter must check mimetype === application/pdf'
    );
    assert.ok(
        middlewareSource.includes('Only PDF files are allowed'),
        'uploadMiddleware fileFilter must call back with an error for non-PDF files'
    );

    // 10 MB limit must still be in place
    assert.ok(
        middlewareSource.includes('10 * 1024 * 1024') || middlewareSource.includes('10485760'),
        'uploadMiddleware limits.fileSize must still be 10 MB'
    );

    // Controller must also check MIME type and file size independently
    const controllerSource = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );
    assert.ok(
        controllerSource.includes("'application/pdf'") || controllerSource.includes('"application/pdf"'),
        'uploadResource must double-check MIME type is application/pdf'
    );
    assert.ok(
        controllerSource.includes('10 * 1024 * 1024') || controllerSource.includes('10485760'),
        'uploadResource must check that file.size does not exceed 10 MB'
    );
    assert.ok(
        controllerSource.includes('res.status(400)'),
        'uploadResource must call res.status(400) when validation fails'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.10 — Invalid semester string in upload returns HTTP 400
// ─────────────────────────────────────────────────────────────────────────────
test('3.10 — uploadResource: invalid semester value is rejected with HTTP 400', () => {
    const source = readFileSync(
        path.join(SERVER_ROOT, 'controllers', 'resourceController.js'),
        'utf8'
    );

    // VALID_SEMESTERS allowlist must still cover S1 to S8
    assert.ok(
        source.includes("'S1'") && source.includes("'S8'"),
        'uploadResource must maintain a VALID_SEMESTERS allowlist from S1 to S8'
    );
    assert.ok(
        source.includes('VALID_SEMESTERS'),
        'uploadResource must validate semester against the VALID_SEMESTERS allowlist'
    );

    // Must reject with 400 and an 'Invalid semester' message
    assert.ok(
        source.includes('Invalid semester'),
        "uploadResource must return 'Invalid semester' error message for invalid semester values"
    );

    // Must use allowlist.includes() check
    assert.ok(
        source.includes('VALID_SEMESTERS.includes(semester)') ||
        source.includes('!VALID_SEMESTERS.includes(semester)'),
        'uploadResource must use VALID_SEMESTERS.includes() to validate the semester parameter'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.11 — mongoSanitize strips $ keys from req.body before query
// ─────────────────────────────────────────────────────────────────────────────
test('3.11 — mongoSanitize: express-mongo-sanitize is applied as middleware in server.js', () => {
    const serverSource = readFileSync(
        path.join(SERVER_ROOT, 'server.js'),
        'utf8'
    );

    // mongoSanitize must be imported
    assert.ok(
        serverSource.includes('mongoSanitize') || serverSource.includes('express-mongo-sanitize'),
        'server.js must import express-mongo-sanitize'
    );

    // mongoSanitize() must be registered as middleware
    assert.ok(
        serverSource.includes('app.use(mongoSanitize())') ||
        serverSource.includes('app.use(mongoSanitize('),
        'server.js must register mongoSanitize() as an app-level middleware with app.use()'
    );

    // Confirm the middleware is registered BEFORE the route mounting
    const sanitizeIdx = serverSource.indexOf('mongoSanitize');
    const routeIdx = serverSource.indexOf("app.use('/api'");
    assert.ok(
        sanitizeIdx < routeIdx,
        'mongoSanitize middleware must be registered BEFORE the /api routes are mounted'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.12 — AdminRoute redirects unauthenticated users to /login (static code check)
// ─────────────────────────────────────────────────────────────────────────────
test('3.12 — AdminRoute: client-side guard redirects unauthenticated users to /login', () => {
    const appSource = readFileSync(
        path.join(CLIENT_ROOT, 'src', 'App.jsx'),
        'utf8'
    );

    // AdminRoute component must exist
    assert.ok(
        appSource.includes('function AdminRoute') || appSource.includes('const AdminRoute'),
        'App.jsx must define an AdminRoute component'
    );

    // AdminRoute must check isAdmin
    assert.ok(
        appSource.includes('isAdmin'),
        'AdminRoute must check the isAdmin flag from auth context'
    );

    // AdminRoute must redirect to /login when not authenticated
    assert.ok(
        appSource.includes('"/login"') || appSource.includes("'/login'"),
        'AdminRoute must redirect unauthenticated users to /login'
    );

    // AdminRoute must use React Router's Navigate component for the redirect
    assert.ok(
        appSource.includes('<Navigate') && appSource.includes('replace'),
        'AdminRoute must use <Navigate replace ...> to redirect unauthenticated users'
    );

    // AdminRoute must wrap the /admin paths
    assert.ok(
        appSource.includes('path="/admin"') || appSource.includes("path='/admin'"),
        'The /admin route must be wrapped with AdminRoute in App.jsx'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.13 — window.open sets opener=null on Cloudinary URLs (static code check)
// ─────────────────────────────────────────────────────────────────────────────
test('3.13 — window.open: nextTab.opener = null is set to prevent reverse tabnapping', () => {
    // Check in PDFPreviewModal (primary usage)
    const modalSource = readFileSync(
        path.join(CLIENT_ROOT, 'src', 'components', 'PDFPreviewModal.jsx'),
        'utf8'
    );

    assert.ok(
        modalSource.includes("window.open('', '_blank')"),
        "PDFPreviewModal must open a blank tab using window.open('', '_blank')"
    );
    assert.ok(
        modalSource.includes('nextTab.opener = null') || modalSource.includes('nextTab.opener=null'),
        'PDFPreviewModal must set nextTab.opener = null immediately after window.open to prevent reverse tabnapping'
    );

    // Check in Semester.jsx (download handler)
    const semesterSource = readFileSync(
        path.join(CLIENT_ROOT, 'src', 'pages', 'Semester.jsx'),
        'utf8'
    );
    assert.ok(
        semesterSource.includes('nextTab.opener = null') || semesterSource.includes('nextTab.opener=null'),
        'Semester.jsx handleDownload must set nextTab.opener = null to prevent reverse tabnapping'
    );

});

// ─────────────────────────────────────────────────────────────────────────────
// 3.14 — GET /api/health returns { status: 'ok', message: 'EduCrate API is running' }
// ─────────────────────────────────────────────────────────────────────────────
test("3.14 — health endpoint: GET /api/health returns { status: 'ok', message: 'EduCrate API is running' }", () => {
    const routeSource = readFileSync(
        path.join(SERVER_ROOT, 'routes', 'apiRoutes.js'),
        'utf8'
    );

    // Health route must still be registered
    assert.ok(
        routeSource.includes("'/health'") || routeSource.includes('"/health"'),
        "GET /api/health route must still be registered in apiRoutes.js"
    );

    // Must return the exact expected response shape
    assert.ok(
        routeSource.includes("status: 'ok'") || routeSource.includes('status: "ok"'),
        "Health endpoint must return { status: 'ok', ... }"
    );
    assert.ok(
        routeSource.includes('EduCrate API is running'),
        "Health endpoint must include 'EduCrate API is running' in the message field"
    );

    // Confirm handler calls res.json (not res.send or res.end)
    const healthIdx = routeSource.indexOf("'/health'");
    const healthSection = routeSource.slice(healthIdx, healthIdx + 200);
    assert.ok(
        healthSection.includes('res.json'),
        'Health endpoint must use res.json() to return the JSON response'
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.15 — Helmet security headers are emitted
// ─────────────────────────────────────────────────────────────────────────────
test('3.15 — Helmet: helmet() middleware is applied so security headers are emitted', () => {
    const serverSource = readFileSync(
        path.join(SERVER_ROOT, 'server.js'),
        'utf8'
    );

    // Helmet must be imported
    assert.ok(
        serverSource.includes("from 'helmet'") || serverSource.includes('require("helmet")'),
        'server.js must import the helmet package'
    );

    // helmet() must be registered as middleware
    assert.ok(
        serverSource.includes('app.use(helmet())') || serverSource.includes('app.use(helmet('),
        'server.js must register helmet() as an app-level middleware with app.use()'
    );

    // Helmet must be registered BEFORE route mounting (all API responses get headers)
    const helmetIdx = serverSource.indexOf('app.use(helmet');
    const routeIdx = serverSource.indexOf("app.use('/api'");
    assert.ok(
        helmetIdx < routeIdx,
        'helmet middleware must be registered BEFORE the /api routes are mounted so all responses include security headers'
    );

    // Helmet package must be in the dependencies
    const pkgJson = JSON.parse(
        readFileSync(path.join(SERVER_ROOT, 'package.json'), 'utf8')
    );
    assert.ok(
        pkgJson.dependencies?.helmet,
        'helmet must be listed in server/package.json dependencies'
    );
});
