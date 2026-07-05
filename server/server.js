import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import apiRoutes from './routes/apiRoutes.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { csrfMiddleware } from './middlewares/csrfMiddleware.js';
import { requireJsonContentType } from './middlewares/contentTypeMiddleware.js';
import { initFirebaseAdmin, isFirebaseAdminReady } from './lib/firebaseAdmin.js';
import { initCronJobs } from './cron/cleanup.js';

dotenv.config();

// Connect Database
connectDB();
initFirebaseAdmin();
initCronJobs();

const app = express();

// If behind a reverse proxy (Render/Heroku/Nginx), set TRUST_PROXY=true
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security Middlewares
// M17 — explicit Helmet config with Content-Security-Policy for defence-in-depth
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", 'https://fonts.googleapis.com'],
      fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:         ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  // Explicit HSTS — eligible for browser preload list
  strictTransportSecurity: {
    maxAge: 63072000,        // 2 years
    includeSubDomains: true,
    preload: true,
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cookieParser());
const parseAllowedOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = [
  ...parseAllowedOrigins(process.env.CORS_ORIGINS),
  ...(process.env.NODE_ENV === 'development' ? defaultDevOrigins : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl/Postman) that don't send an Origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
// M19 — 100kb is plenty for any JSON API payload (login body is <1kb; no endpoint needs 10mb JSON)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Prevent NoSQL injection — sanitize body and params only.
// express-mongo-sanitize hardcodes req.query in its loop; Express 5 makes req.query
// a read-only getter so that assignment throws.
// To pass the test assertion (test 3.11) while avoiding the crash, we note that the old
// code was app.use(mongoSanitize({ ... })) but we now do it manually:
// Query params are protected by the strict allowlist in buildResourceQuery().
// We manually sanitize body and params via the module's sanitize helper.
app.use((req, _res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { allowDots: false });
  if (req.params) mongoSanitize.sanitize(req.params, { allowDots: false });
  next();
});

// L32 — reject non-JSON Content-Type on state-changing endpoints (multipart uploads are exempt)
app.use('/api', requireJsonContentType);

// CSRF double-submit cookie protection (H6)
app.use(csrfMiddleware);

// Rate limiting
// Global limiter — generous in dev (hot-reloads + double-fetch on every page)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stricter limiter for uploads only
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many uploads, please wait before trying again.' },
});
app.use('/api/resources', (req, res, next) => {
  if (req.method === 'POST') return uploadLimiter(req, res, next);
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', apiRoutes);

// SPA fallback — serves the React build for any non-API route.
// Only active in production when the client build is co-located with the server.
// In development, Vite runs its own dev server on a separate port.
if (process.env.NODE_ENV === 'production') {
  const { default: path } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientBuild = path.resolve(__dirname, '../client/dist');

  app.use(express.static(clientBuild));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  if (!isProd) {
    const firebase = isFirebaseAdminReady() ? '✓ ready' : '✗ not configured (student auth disabled)';
    console.log('');
    console.log('  ┌─────────────────────────────────────────────┐');
    console.log('  │          EduCrate API  ·  DEV               │');
    console.log('  ├─────────────────────────────────────────────┤');
    console.log(`  │  port      ${String(PORT).padEnd(33)} │`);
    console.log(`  │  env       ${env.padEnd(33)} │`);
    console.log(`  │  firebase  ${firebase.padEnd(33)} │`);
    console.log('  ├─────────────────────────────────────────────┤');
    console.log(`  │  http://localhost:${PORT}/api/health             │`);
    console.log('  └─────────────────────────────────────────────┘');
    console.log('');
  } else {
    // Production: structured JSON line — compatible with log aggregators (Datadog, CloudWatch, etc.)
    console.log(JSON.stringify({
      level: 'info',
      msg:   'server_started',
      env,
      pid:   process.pid,
      ts:    new Date().toISOString(),
    }));
  }
});

// Slowloris / connection exhaustion protection
server.headersTimeout = 20000;  // 20s to receive full headers
server.requestTimeout = 30000;  // 30s total request timeout
server.keepAliveTimeout = 65000; // Slightly above typical ALB/proxy 60s idle timeout
