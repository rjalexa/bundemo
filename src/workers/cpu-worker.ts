/**
 * ⚙️ CPU Worker
 * Demonstrates Bun.Worker — multi-threaded workers with structured cloning.
 *
 * This worker runs in a separate thread and communicates via postMessage.
 * Unlike Node.js worker_threads, Bun workers:
 *   - Support ES modules natively (import/export)
 *   - Run TypeScript directly (no build step)
 *   - Use structured cloning for fast data transfer
 */

import type { WorkerRequest } from "../shared/types";

declare var self: Worker;

// ── Task Handlers ──────────────────────────────────────────────────

/** Compute the Nth Fibonacci number (CPU-intensive for large N) */
function fibonacci(n: number): bigint {
  if (n <= 1) return BigInt(n);
  let a = 0n;
  let b = 1n;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/** Find all primes up to N using Sieve of Eratosthenes */
function sievePrimes(limit: number): number[] {
  const sieve = new Uint8Array(limit + 1);
  const primes: number[] = [];

  for (let i = 2; i <= limit; i++) {
    if (sieve[i] === 0) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) {
        sieve[j] = 1;
      }
    }
  }

  return primes;
}

/** Monte Carlo estimation of Pi */
function estimatePi(iterations: number): { pi: number; iterations: number } {
  let inside = 0;
  for (let i = 0; i < iterations; i++) {
    const x = Math.random();
    const y = Math.random();
    if (x * x + y * y <= 1) inside++;
  }
  return {
    pi: (4 * inside) / iterations,
    iterations,
  };
}

// ── Message Handler ────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, task, payload } = event.data;
  const start = performance.now();

  let result: unknown;

  switch (task) {
    case "fibonacci":
      const fib = fibonacci(payload);
      result = {
        n: payload,
        // Convert BigInt to string for JSON serialization
        value: fib.toString(),
        digits: fib.toString().length,
      };
      break;

    case "primes":
      const primes = sievePrimes(payload);
      result = {
        limit: payload,
        count: primes.length,
        largest: primes[primes.length - 1],
        first10: primes.slice(0, 10),
        last10: primes.slice(-10),
      };
      break;

    case "pi":
      result = estimatePi(payload);
      break;

    default:
      self.postMessage({
        id,
        error: `Unknown task: ${task}`,
      });
      return;
  }

  const timeMs = performance.now() - start;

  self.postMessage({
    id,
    task,
    result,
    timeMs: Math.round(timeMs * 100) / 100,
    thread: "worker",
  });
};

// Signal that the worker is ready
self.postMessage({ type: "ready" });
