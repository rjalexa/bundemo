/**
 * 🌱 Database Seeder
 * Demonstrates bun:sqlite batch transactions and Bun.nanoseconds() timing.
 */

import { NotesDB } from "../src/server/db";
import { logger } from "../src/utils/logger";

const sampleNotes = [
  {
    title: "Getting Started with Bun",
    content: "Bun is an all-in-one JavaScript runtime & toolkit designed for speed. It includes a bundler, test runner, and Node.js-compatible package manager.",
    tags: ["bun", "getting-started", "javascript"],
  },
  {
    title: "Bun.serve() vs Express",
    content: "Bun's built-in HTTP server is significantly faster than Express. It handles ~100k requests/sec on a single thread, compared to Express's ~15k.",
    tags: ["bun", "performance", "http"],
  },
  {
    title: "SQLite in Bun",
    content: "bun:sqlite is a built-in, high-performance SQLite3 module. No native addons, no npm install — it just works. Supports WAL mode, prepared statements, and transactions.",
    tags: ["bun", "sqlite", "database"],
  },
  {
    title: "Password Hashing with Bun.password",
    content: "Bun includes native Argon2id and bcrypt implementations. No need for the argon2 or bcrypt npm packages — Bun.password.hash() and Bun.password.verify() handle everything.",
    tags: ["bun", "security", "auth"],
  },
  {
    title: "File I/O: Bun.file() and Bun.write()",
    content: "Bun.file() creates a lazy reference to a file. It doesn't read anything until you call .text(), .json(), .arrayBuffer(), or .stream(). Bun.write() handles atomic writes.",
    tags: ["bun", "file-io", "performance"],
  },
  {
    title: "Bun Workers for CPU Tasks",
    content: "Use `new Worker()` with TypeScript files directly — no build step required. Workers run in separate threads and communicate via structured cloning.",
    tags: ["bun", "workers", "concurrency"],
  },
  {
    title: "Testing with bun test",
    content: "Bun's built-in test runner is Jest-compatible. It supports describe/it/expect, beforeAll/afterAll, mocking, and snapshot testing — all without installing anything.",
    tags: ["bun", "testing", "jest"],
  },
  {
    title: "Bun's TypeScript Support",
    content: "Bun runs TypeScript natively. No tsc, no ts-node, no build step. Just `bun run file.ts` and it works. The transpiler is written in Zig for maximum speed.",
    tags: ["bun", "typescript", "dx"],
  },
];

// ── Run Seeder ─────────────────────────────────────────────────────

logger.banner("Database Seeder");

const start = Bun.nanoseconds();
const notes = NotesDB.batchCreate(sampleNotes);
const elapsed = (Bun.nanoseconds() - start) / 1_000_000;

logger.table("Seed Results", {
  "Notes Created": notes.length,
  "Time": `${elapsed.toFixed(2)}ms`,
  "Avg per Note": `${(elapsed / notes.length).toFixed(2)}ms`,
  "Total in DB": NotesDB.count(),
});

logger.success("Database seeded successfully!");
