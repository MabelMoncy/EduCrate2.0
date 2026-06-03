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

dotenv.config();

// Connect Database
connectDB();

const app = express();

// If behind a reverse proxy (Render/Heroku/Nginx), set TRUST_PROXY=true
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Security Middlewares
app.use(helmet());
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
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Prevent NoSQL injection by removing prohibited keys from body, params, headers, and query
app.use(mongoSanitize());

// CSRF double-submit cookie protection (H6)
app.use(csrfMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

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
