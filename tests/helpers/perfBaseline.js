/**
 * Performance Baseline Measurement Utility.
 *
 * Designed to measure and record baseline latency, throughput, and error rates
 * across repeated calls without asserting arbitrary pass/fail thresholds.
 */
export const measureBaseline = async (fn, { iterations = 50, concurrency = 1 } = {}) => {
  const timings = [];
  let errorCount = 0;
  const startTime = performance.now();

  const runWorker = async (count) => {
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      try {
        await fn(i);
        timings.push(performance.now() - start);
      } catch (err) {
        errorCount++;
        timings.push(performance.now() - start);
      }
    }
  };

  const tasks = [];
  const perWorker = Math.ceil(iterations / concurrency);
  for (let c = 0; c < concurrency; c++) {
    const workerIterations = Math.min(perWorker, iterations - c * perWorker);
    if (workerIterations > 0) {
      tasks.push(runWorker(workerIterations));
    }
  }

  await Promise.all(tasks);
  const totalDurationMs = performance.now() - startTime;

  timings.sort((a, b) => a - b);
  const sum = timings.reduce((acc, t) => acc + t, 0);
  const mean = timings.length ? sum / timings.length : 0;
  const p50 = timings[Math.floor(timings.length * 0.5)] || 0;
  const p95 = timings[Math.floor(timings.length * 0.95)] || 0;
  const p99 = timings[Math.floor(timings.length * 0.99)] || 0;
  const min = timings[0] || 0;
  const max = timings[timings.length - 1] || 0;
  const throughputRps = totalDurationMs > 0 ? (timings.length / (totalDurationMs / 1000)) : 0;

  return {
    totalRequests: timings.length,
    successfulRequests: timings.length - errorCount,
    errorCount,
    totalDurationMs: Number(totalDurationMs.toFixed(2)),
    throughputRps: Number(throughputRps.toFixed(2)),
    latencyMs: {
      min: Number(min.toFixed(2)),
      mean: Number(mean.toFixed(2)),
      p50: Number(p50.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      p99: Number(p99.toFixed(2)),
      max: Number(max.toFixed(2)),
    },
  };
};

