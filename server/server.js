import app from './app.js';
import connectDB from './config/db.js';
import { initFirebaseAdmin, isFirebaseAdminReady } from './lib/firebaseAdmin.js';
import { initCronJobs } from './cron/cleanup.js';

// Connect Database
connectDB();
initFirebaseAdmin();
initCronJobs();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
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
