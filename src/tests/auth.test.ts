/**
 * 🧪 Auth Tests
 * Tests for Bun.password hashing and verification.
 */

import { describe, it, expect } from "bun:test";
import { hashPassword, hashPasswordBcrypt, verifyPassword } from "../utils/auth";

describe("Password Hashing", () => {
  describe("Argon2id", () => {
    it("should hash a password", async () => {
      const result = await hashPassword("my-secure-password");

      expect(result.hash).toStartWith("$argon2id$");
      expect(result.algorithm).toBe("argon2id");
      expect(result.timeMs).toBeGreaterThan(0);
    });

    it("should produce different hashes for same password", async () => {
      const hash1 = await hashPassword("same-password");
      const hash2 = await hashPassword("same-password");

      expect(hash1.hash).not.toBe(hash2.hash); // Different salts
    });

    it("should verify a correct password", async () => {
      const { hash } = await hashPassword("correct-password");
      const result = await verifyPassword("correct-password", hash);

      expect(result.match).toBe(true);
    });

    it("should reject an incorrect password", async () => {
      const { hash } = await hashPassword("correct-password");
      const result = await verifyPassword("wrong-password", hash);

      expect(result.match).toBe(false);
    });
  });

  describe("bcrypt", () => {
    it("should hash with bcrypt", async () => {
      const result = await hashPasswordBcrypt("bcrypt-password");

      expect(result.hash).toStartWith("$2");
      expect(result.algorithm).toBe("bcrypt");
    });

    it("should verify bcrypt hashes", async () => {
      const { hash } = await hashPasswordBcrypt("bcrypt-password");
      const result = await verifyPassword("bcrypt-password", hash);

      expect(result.match).toBe(true);
    });
  });
});
