/**
 * 🔐 Authentication Utilities
 * Demonstrates Bun.password — native Argon2id / bcrypt hashing
 *
 * No need for `bcrypt` or `argon2` npm packages!
 * Bun ships these algorithms as built-in, compiled-to-native functions.
 */

import { logger } from "./logger";

// ── Types ──────────────────────────────────────────────────────────

export interface HashResult {
  hash: string;
  algorithm: string;
  timeMs: number;
}

export interface VerifyResult {
  match: boolean;
  timeMs: number;
}

// ── Password Hashing ───────────────────────────────────────────────

/**
 * Hash a password using Argon2id (Bun's default, most secure option).
 *
 * Bun.password.hash() returns a PHC-formatted string like:
 *   $argon2id$v=19$m=65536,t=2,p=1$...
 */
export async function hashPassword(password: string): Promise<HashResult> {
  const start = Bun.nanoseconds();

  const hash = await Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536, // 64 MB — OWASP recommended minimum
    timeCost: 2,       // 2 iterations
  });

  const timeMs = (Bun.nanoseconds() - start) / 1_000_000;

  logger.debug(`Password hashed in ${timeMs.toFixed(1)}ms`, { algorithm: "argon2id" });

  return {
    hash,
    algorithm: "argon2id",
    timeMs: Math.round(timeMs * 100) / 100,
  };
}

/**
 * Hash with bcrypt for comparison / compatibility.
 */
export async function hashPasswordBcrypt(password: string): Promise<HashResult> {
  const start = Bun.nanoseconds();

  const hash = await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12, // 2^12 = 4096 iterations
  });

  const timeMs = (Bun.nanoseconds() - start) / 1_000_000;

  logger.debug(`Password hashed in ${timeMs.toFixed(1)}ms`, { algorithm: "bcrypt" });

  return {
    hash,
    algorithm: "bcrypt",
    timeMs: Math.round(timeMs * 100) / 100,
  };
}

/**
 * Verify a password against a hash.
 * Bun.password.verify() auto-detects the algorithm from the hash string.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<VerifyResult> {
  const start = Bun.nanoseconds();

  const match = await Bun.password.verify(password, hash);

  const timeMs = (Bun.nanoseconds() - start) / 1_000_000;

  logger.debug(`Password verification: ${match ? "✔ match" : "✖ no match"} (${timeMs.toFixed(1)}ms)`);

  return {
    match,
    timeMs: Math.round(timeMs * 100) / 100,
  };
}

/**
 * Demonstrate both algorithms side-by-side for benchmarking.
 */
export async function compareAlgorithms(password: string) {
  const argon2 = await hashPassword(password);
  const bcrypt = await hashPasswordBcrypt(password);

  return {
    argon2id: {
      hash: argon2.hash,
      timeMs: argon2.timeMs,
    },
    bcrypt: {
      hash: bcrypt.hash,
      timeMs: bcrypt.timeMs,
    },
    recommendation:
      "Argon2id is recommended for new applications (memory-hard, resistant to GPU attacks)",
  };
}
