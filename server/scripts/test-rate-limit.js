import http from 'http';

const LOGIN_URL = 'http://localhost:5000/api/auth/login'; // Replace with your actual dev port if different
const TOTAL_REQUESTS = 15;
let rateLimitHit = false;

console.log(`Starting rate limit test for ${LOGIN_URL}...`);
console.log(`Sending ${TOTAL_REQUESTS} rapid requests to trigger 429 Too Many Requests.\n`);

const makeRequest = (i) => {
  return new Promise((resolve) => {
    const req = http.request(LOGIN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      console.log(`Request ${i + 1}: Status Code ${res.statusCode}`);
      if (res.statusCode === 429) {
        rateLimitHit = true;
      }
      res.on('data', () => {}); // Consume data
      res.on('end', resolve);
    });

    req.on('error', (e) => {
      console.error(`Request ${i + 1} failed: ${e.message}`);
      // Usually connection refused if server is not running
      resolve();
    });

    req.write(JSON.stringify({ email: 'test@example.com', password: 'password123' }));
    req.end();
  });
};

const runTest = async () => {
  const promises = [];
  // Send requests sequentially but rapidly, or in parallel depending on how rate limiter evaluates
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    promises.push(makeRequest(i));
  }

  await Promise.all(promises);

  console.log('\n--- Test Complete ---');
  if (rateLimitHit) {
    console.log('✅ SUCCESS: Rate limit (429) was triggered correctly.');
  } else {
    console.log('❌ FAILURE: Rate limit (429) was NOT triggered. Check express-rate-limit configuration.');
  }
};

runTest();
