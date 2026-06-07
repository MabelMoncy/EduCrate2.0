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
import { initFirebaseAdmin } from './lib/firebaseAdmin.js';

dotenv.config();

// Connect Database
connectDB();
initFirebaseAdmin();

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

// Prevent NoSQL injection by removing prohibited keys from body, params, headers, and query
app.use(mongoSanitize());

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

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
