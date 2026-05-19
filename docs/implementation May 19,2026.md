Implemented the admin panel from the prompt.

What was added:

Admin-only JWT login at POST /api/auth/login
User model for pre-seeded admin accounts
protectAdmin middleware with RBAC checks
Protected admin mutations:
DELETE /api/resources/:id
PATCH /api/resources/:id/pin
Public routes remain public:
browse resources
upload resources
preview/download resources
Real AuthContext with localStorage token handling
Admin login UI at /login
Protected admin routes:
/admin
/admin/resources
/admin/subjects
Admin pages:
AdminLayout.jsx
AdminOverview.jsx
ResourceManagement.jsx
SubjectConfiguration.jsx
Admin seed script:
server/scripts/seedAdmin.js
command: npm run seed:admin
Public student UI no longer shows delete/pin controls.
Important setup before login works:

Add these to server/.env:

JWT_SECRET=your_long_random_secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
Then run:

cd server
npm run seed:admin
Verification passed:

client: npm run lint
client: npm test
client: npm run build
server: npm test
Backend health check returned OK.
Servers are running:

Frontend: http://localhost:3001/
Backend: http://localhost:5000/
Port 3000 was already in use, so Vite moved to 3001.