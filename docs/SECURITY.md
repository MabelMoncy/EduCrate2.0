# Security Policy — EduCrate 2.0

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | ✅ Active support  |
| 1.x     | ❌ No longer maintained |

## Reporting a Vulnerability

If you discover a security vulnerability in EduCrate, please report it responsibly:

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email the maintainers at the address listed in the repository
3. Include a detailed description of the vulnerability, steps to reproduce, and potential impact
4. Allow up to 48 hours for an initial response

## Security Measures

### Authentication & Authorization
- **Admin:** JWT tokens in httpOnly/Secure/SameSite=Strict cookies with 4-hour expiry
- **Students:** Firebase Authentication with email verification requirement
- **CSRF:** Double-submit cookie pattern on all state-changing endpoints
- **Token revocation:** JTI-based blacklist checked on every admin request
- **Account lockout:** Progressive IP-based lockout after 10 failed login attempts (30-min cooldown)

### File Upload Security
- MIME type validation (application/pdf only)
- Magic byte verification (%PDF- header check)
- ClamAV malware scanning (when `NODE_CLAMSCAN_ENABLED=true`)
- 10 MB file size limit (multer + controller double-check)
- Path traversal prevention via character sanitization
- NLP-based content analysis to prevent PYQ smuggling in notes uploads
- Upload rate limiting: 10 uploads per 10-minute window per IP

### Data Protection
- MongoDB query sanitization via `express-mongo-sanitize`
- HTML stripping on all user inputs before database persistence
- Regex DoS prevention with 200-char search limit + input escaping
- Signed Cloudinary URLs with short TTL for file access
- Internal Cloudinary fields (fileUrl, publicId) stripped from public API responses
- Production error messages never expose stack traces or internal details

### Infrastructure Security
- Helmet.js with strict Content-Security-Policy
- HSTS with preload enabled (2-year max-age)
- CORS restricted to explicit origin allowlist (no wildcards)
- Request/header timeouts to prevent slowloris attacks
- Rate limiting: 300 requests per 15 minutes (global), 5 login attempts per 10 minutes
- JSON body size limited to 100 KB
- Pagination capped at 100 results per page

### CI/CD Security
- **CodeQL SAST:** Static analysis on every push/PR + weekly scheduled scan
- **Gitleaks:** Historical secret scanning on every push/PR
- **Dependency Review:** Blocks PRs introducing HIGH/CRITICAL CVEs or GPL/AGPL licenses
- **Dependabot:** Weekly dependency updates with fast-tracked security patches
- **npm audit:** Both server and client audited for HIGH/CRITICAL vulnerabilities in CI
- **ESLint Security Plugin:** Server-side linting catches eval, unsafe regex, child_process injection

### Audit Trail
- AuditLog model with TTL (1-year auto-expiry) for all delete operations
- Soft-delete with 24-hour recovery grace period before permanent removal
- Structured JSON logging in production for log aggregators

## Repository Settings (Recommended)

After making the repository public, enable these GitHub settings:

### Settings → Code security and analysis
- [x] **Dependency graph** — Enabled
- [x] **Dependabot alerts** — Enabled
- [x] **Dependabot security updates** — Enabled
- [x] **CodeQL analysis** — Enabled (via workflow)
- [x] **Secret scanning** — Enabled
- [x] **Push protection** — Enabled (blocks pushes containing secrets)

### Settings → Branches → Branch protection rules (for `main`)
- [x] **Require a pull request before merging**
- [x] **Require status checks to pass before merging**
  - Required checks: `Server — lint / test / audit`, `Client — lint / test / build / audit`
- [x] **Require branches to be up to date before merging**
- [x] **Require conversation resolution before merging**
- [x] **Do not allow bypassing the above settings**

### Secrets Management
- Never commit `.env` files — use GitHub Secrets for CI and hosting provider's secret management for production
- Rotate JWT_SECRET, Cloudinary API keys, and Firebase private key if they are ever exposed
- Use environment-specific secrets (dev/staging/production) — never share across environments

## Secret Rotation Checklist

If secrets are compromised, rotate in this order:

1. **JWT_SECRET** — Immediately invalidates all admin sessions
2. **CLOUDINARY_API_SECRET** — Revoke in Cloudinary dashboard, update env
3. **FIREBASE_PRIVATE_KEY** — Generate new service account key in Firebase Console
4. **MONGODB_URI** — Change database password, update connection string
5. **ADMIN_PASSWORD** — Re-run `npm run seed:admin` with new password
