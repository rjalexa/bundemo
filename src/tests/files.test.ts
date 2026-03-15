/**
 * 🧪 File I/O Tests
 * Tests for Bun.file(), Bun.write(), and Bun.hash() utilities.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Files } from "../utils/files";
import { unlinkSync } from "node:fs";

const TEST_DIR = "/tmp/bun-showcase-test";
const TEST_FILE = `${TEST_DIR}/test.txt`;
const TEST_JSON = `${TEST_DIR}/test.json`;

beforeAll(async () => {
  await Bun.spawn(["mkdir", "-p", TEST_DIR]).exited;
});

afterAll(async () => {
  await Bun.spawn(["rm", "-rf", TEST_DIR]).exited;
});

describe("Files", () => {
  describe("write & readText", () => {
    it("should write and read a text file", async () => {
      const content = "Hello from Bun file I/O test!";
      const result = await Files.write(TEST_FILE, content);

      expect(result.bytesWritten).toBe(content.length);
      expect(result.timeMs).toBeGreaterThanOrEqual(0);

      const readBack = await Files.readText(TEST_FILE);
      expect(readBack).toBe(content);
    });

    it("should report bytes written accurately", async () => {
      const data = "🥖".repeat(100); // Multi-byte characters
      const result = await Files.write(`${TEST_DIR}/emoji.txt`, data);

      // Each 🥖 is 4 bytes in UTF-8
      expect(result.bytesWritten).toBe(400);
    });
  });

  describe("readJson", () => {
    it("should read and parse a JSON file", async () => {
      const obj = { name: "Bun", version: 1, features: ["fast", "typescript"] };
      await Bun.write(TEST_JSON, JSON.stringify(obj));

      const parsed = await Files.readJson<typeof obj>(TEST_JSON);
      expect(parsed).toEqual(obj);
    });
  });

  describe("info", () => {
    it("should return metadata for an existing file", async () => {
      await Bun.write(TEST_FILE, "file info test data");
      const info = await Files.info(TEST_FILE);

      expect(info.exists).toBe(true);
      expect(info.size).toBeGreaterThan(0);
      expect(info.sizeHuman).toContain("B");
      expect(info.hash.wyhash).toBeTruthy();
      expect(info.hash.crc32).toBeTruthy();
    });

    it("should report non-existent files", async () => {
      const info = await Files.info("/tmp/definitely-does-not-exist.txt");

      expect(info.exists).toBe(false);
      expect(info.size).toBe(0);
    });
  });

  describe("copy", () => {
    it("should copy a file using zero-copy I/O", async () => {
      const src = `${TEST_DIR}/copy-src.txt`;
      const dest = `${TEST_DIR}/copy-dest.txt`;

      await Bun.write(src, "data to copy");
      const result = await Files.copy(src, dest);

      expect(result.bytesWritten).toBe(12);
      const destContent = await Files.readText(dest);
      expect(destContent).toBe("data to copy");
    });
  });

  describe("generateRandom", () => {
    it("should generate a file of the specified size", async () => {
      const path = `${TEST_DIR}/random.bin`;
      const result = await Files.generateRandom(path, 1024);

      expect(result.bytesWritten).toBe(1024);

      const info = await Files.info(path);
      expect(info.size).toBe(1024);
    });
  });

  describe("stream", () => {
    it("should return a ReadableStream", async () => {
      await Bun.write(TEST_FILE, "streamable content");
      const stream = Files.stream(TEST_FILE);

      expect(stream).toBeInstanceOf(ReadableStream);

      // Read the stream
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const text = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, c) => [...acc, ...c], [] as number[]))
      );
      expect(text).toBe("streamable content");
    });
  });
});
