/**
 * ⏱️ Performance Benchmarks
 *
 * Demonstrates:
 *   - Bun.nanoseconds() for precise timing
 *   - Bun.build() — the bundler API
 *   - Bun.spawn() — child process spawning
 *   - Bun.hash() — fast native hashing
 *   - Bun.file() — file I/O performance
 */

import { logger } from "../src/utils/logger";

// ── Helpers ────────────────────────────────────────────────────────

function bench(name: string, fn: () => void, iterations = 10_000): { name: string; opsPerSec: string; avgNs: string } {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = Bun.nanoseconds() - start;

  const avgNs = elapsed / iterations;
  const opsPerSec = (1_000_000_000 / avgNs).toFixed(0);

  return {
    name,
    opsPerSec: Number(opsPerSec).toLocaleString() + " ops/sec",
    avgNs: avgNs.toFixed(0) + " ns/op",
  };
}

async function benchAsync(name: string, fn: () => Promise<void>, iterations = 100): Promise<{ name: string; opsPerSec: string; avgMs: string }> {
  // Warmup
  for (let i = 0; i < 5; i++) await fn();

  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) await fn();
  const elapsed = Bun.nanoseconds() - start;

  const avgMs = (elapsed / iterations / 1_000_000).toFixed(3);
  const opsPerSec = (1_000_000_000 / (elapsed / iterations)).toFixed(0);

  return {
    name,
    opsPerSec: Number(opsPerSec).toLocaleString() + " ops/sec",
    avgMs: avgMs + " ms/op",
  };
}

// ── Benchmarks ─────────────────────────────────────────────────────

logger.banner("Bun Performance Benchmarks");

// 1. Hashing
logger.info("Running hashing benchmarks...");
const hashData = new TextEncoder().encode("The quick brown fox jumps over the lazy dog");

const hashResults = [
  bench("Bun.hash (Wyhash)", () => Bun.hash(hashData)),
  bench("Bun.hash.crc32", () => Bun.hash.crc32(hashData)),
  bench("Bun.hash.adler32", () => Bun.hash.adler32(hashData)),
  bench("Bun.hash.cityHash32", () => Bun.hash.cityHash32(hashData)),
  bench("Bun.hash.cityHash64", () => Bun.hash.cityHash64(hashData)),
  bench("Bun.hash.murmur32v3", () => Bun.hash.murmur32v3(hashData)),
  bench("Bun.hash.murmur64v2", () => Bun.hash.murmur64v2(hashData)),
];

console.log("\n  🔢 Hashing Benchmarks:");
console.log("  " + "─".repeat(60));
for (const r of hashResults) {
  console.log(`  ${r.name.padEnd(30)} ${r.opsPerSec.padStart(20)}  ${r.avgNs.padStart(12)}`);
}

// 2. File I/O
logger.info("\nRunning file I/O benchmarks...");

// Create a test file
const testData = "Hello, Bun! ".repeat(1000); // ~12 KB
await Bun.write("/tmp/bench-test.txt", testData);

const fileResults = await Promise.all([
  benchAsync("Bun.file().text()", async () => {
    await Bun.file("/tmp/bench-test.txt").text();
  }),
  benchAsync("Bun.file().arrayBuffer()", async () => {
    await Bun.file("/tmp/bench-test.txt").arrayBuffer();
  }),
  benchAsync("Bun.write() 12KB", async () => {
    await Bun.write("/tmp/bench-write.txt", testData);
  }),
]);

console.log("\n  📁 File I/O Benchmarks:");
console.log("  " + "─".repeat(60));
for (const r of fileResults) {
  console.log(`  ${r.name.padEnd(30)} ${r.opsPerSec.padStart(20)}  ${r.avgMs.padStart(12)}`);
}

// 3. JSON parsing
logger.info("\nRunning JSON benchmarks...");
const jsonObj = {
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    active: i % 3 !== 0,
    score: Math.random() * 100,
  })),
};
const jsonStr = JSON.stringify(jsonObj);

const jsonResults = [
  bench("JSON.parse (100 users)", () => JSON.parse(jsonStr)),
  bench("JSON.stringify (100 users)", () => JSON.stringify(jsonObj)),
];

console.log("\n  📋 JSON Benchmarks:");
console.log("  " + "─".repeat(60));
for (const r of jsonResults) {
  console.log(`  ${r.name.padEnd(30)} ${r.opsPerSec.padStart(20)}  ${r.avgNs.padStart(12)}`);
}

// 4. Bun.build() — Bundler
logger.info("\nRunning bundler benchmark...");

const buildStart = Bun.nanoseconds();
const buildResult = await Bun.build({
  entrypoints: ["./src/server/index.ts"],
  outdir: "/tmp/bun-bench-build",
  target: "bun",
  minify: true,
});
const buildTime = (Bun.nanoseconds() - buildStart) / 1_000_000;

console.log("\n  📦 Bun.build() Bundler:");
console.log("  " + "─".repeat(60));
console.log(`  ${"Entrypoint".padEnd(30)} src/server/index.ts`);
console.log(`  ${"Build Time".padEnd(30)} ${buildTime.toFixed(1)}ms`);
console.log(`  ${"Success".padEnd(30)} ${buildResult.success}`);
console.log(`  ${"Output Files".padEnd(30)} ${buildResult.outputs.length}`);
for (const output of buildResult.outputs) {
  const size = (output.size / 1024).toFixed(1);
  console.log(`  ${"  → " + output.path.split("/").pop()?.padEnd(26)} ${size} KB`);
}

// 5. Bun.spawn()
logger.info("\nRunning Bun.spawn() benchmark...");

const spawnStart = Bun.nanoseconds();
const proc = Bun.spawn(["echo", "hello from spawned process"]);
const spawnOutput = await new Response(proc.stdout).text();
const spawnTime = (Bun.nanoseconds() - spawnStart) / 1_000_000;

console.log("\n  🐚 Bun.spawn():");
console.log("  " + "─".repeat(60));
console.log(`  ${"Command".padEnd(30)} echo "hello from spawned process"`);
console.log(`  ${"Output".padEnd(30)} ${spawnOutput.trim()}`);
console.log(`  ${"Time".padEnd(30)} ${spawnTime.toFixed(2)}ms`);

// Cleanup
await Bun.spawn(["rm", "-rf", "/tmp/bench-test.txt", "/tmp/bench-write.txt", "/tmp/bun-bench-build"]).exited;

logger.success("\nAll benchmarks complete!");
