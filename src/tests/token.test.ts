import { describe, it, expect } from "bun:test";
import { generateTokenId, signToken, verifyToken } from "../utils/token";

const TEST_SECRET = "test-secret-key";

describe("Token Utilities", () => {
  describe("generateTokenId", () => {
    it("should generate a 64-character hex string", () => {
      const token = generateTokenId();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it("should generate unique tokens", () => {
      const token1 = generateTokenId();
      const token2 = generateTokenId();
      expect(token1).not.toBe(token2);
    });
  });

  describe("signToken / verifyToken", () => {
    it("should round-trip a payload", async () => {
      const payload = "user-session-12345";
      const signed = await signToken(payload, TEST_SECRET);
      const result = await verifyToken(signed, TEST_SECRET);
      expect(result).toBe(payload);
    });

    it("should reject a tampered payload", async () => {
      const signed = await signToken("original-payload", TEST_SECRET);
      // Tamper with the payload portion (before the dot)
      const parts = signed.split(".");
      parts[0] = parts[0] + "x";
      const tampered = parts.join(".");
      const result = await verifyToken(tampered, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("should reject a tampered signature", async () => {
      const signed = await signToken("my-payload", TEST_SECRET);
      const parts = signed.split(".");
      parts[1] = parts[1] + "x";
      const tampered = parts.join(".");
      const result = await verifyToken(tampered, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("should reject a token signed with a different secret", async () => {
      const signed = await signToken("my-payload", "secret-A");
      const result = await verifyToken(signed, "secret-B");
      expect(result).toBeNull();
    });

    it("should reject malformed tokens without a dot", async () => {
      const result = await verifyToken("nodothere", TEST_SECRET);
      expect(result).toBeNull();
    });

    it("should reject empty string", async () => {
      const result = await verifyToken("", TEST_SECRET);
      expect(result).toBeNull();
    });
  });
});
