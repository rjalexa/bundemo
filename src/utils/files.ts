/**
 * 📁 File I/O Utilities
 * Demonstrates Bun's zero-copy file operations:
 *
 *   - Bun.file()   → lazy file reference (doesn't read until you ask)
 *   - Bun.write()  → atomic file writes
 *   - file.text()   → read as UTF-8 string
 *   - file.arrayBuffer() → read as binary
 *   - file.stream() → read as ReadableStream
 *   - file.size, file.type → metadata without reading
 *   - Bun.hash()   → fast native hashing
 */

import { logger } from "./logger";

// ── Types ──────────────────────────────────────────────────────────

export interface FileInfo {
  path: string;
  exists: boolean;
  size: number;
  sizeHuman: string;
  type: string;
  hash: {
    wyhash: string;
    crc32: string;
  };
  lastModified: number;
}

export interface WriteResult {
  path: string;
  bytesWritten: number;
  timeMs: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function humanSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

// ── Public API ─────────────────────────────────────────────────────

export const Files = {
  /**
   * Get file metadata + hashes without fully reading the file.
   * Bun.file() is lazy — it creates a reference, not a buffer.
   */
  async info(path: string): Promise<FileInfo> {
    const file = Bun.file(path);
    const exists = await file.exists();

    if (!exists) {
      return {
        path,
        exists: false,
        size: 0,
        sizeHuman: "0 B",
        type: "unknown",
        hash: { wyhash: "", crc32: "" },
        lastModified: 0,
      };
    }

    // Read file content once for hashing
    const content = await file.arrayBuffer();

    // Bun.hash — extremely fast native hashing
    const wyhash = Bun.hash(content).toString(16);
    const crc32 = Bun.hash.crc32(content).toString(16);

    return {
      path,
      exists: true,
      size: file.size,
      sizeHuman: humanSize(file.size),
      type: file.type,
      hash: { wyhash, crc32 },
      lastModified: file.lastModified,
    };
  },

  /**
   * Write data to a file atomically.
   * Bun.write() is incredibly versatile — accepts string, Buffer, Blob,
   * Response, ArrayBuffer, or even another BunFile (zero-copy!).
   */
  async write(path: string, data: string | Uint8Array): Promise<WriteResult> {
    const start = Bun.nanoseconds();

    const bytesWritten = await Bun.write(path, data);

    const timeMs = (Bun.nanoseconds() - start) / 1_000_000;

    logger.debug(`Wrote ${humanSize(bytesWritten)} to ${path} in ${timeMs.toFixed(2)}ms`);

    return {
      path,
      bytesWritten,
      timeMs: Math.round(timeMs * 100) / 100,
    };
  },

  /**
   * Read a file as a UTF-8 string.
   */
  async readText(path: string): Promise<string> {
    const file = Bun.file(path);
    return file.text();
  },

  /**
   * Read a file as JSON with type inference.
   */
  async readJson<T = unknown>(path: string): Promise<T> {
    const file = Bun.file(path);
    return file.json() as Promise<T>;
  },

  /**
   * Stream a file as a ReadableStream — great for large files.
   */
  stream(path: string): ReadableStream<Uint8Array> {
    const file = Bun.file(path);
    return file.stream();
  },

  /**
   * Copy a file using zero-copy Bun.write(destination, source).
   * When both arguments are BunFile references, Bun uses the
   * fastest OS-level copy mechanism (sendfile/copy_file_range).
   */
  async copy(src: string, dest: string): Promise<WriteResult> {
    const start = Bun.nanoseconds();

    const bytesWritten = await Bun.write(dest, Bun.file(src));

    const timeMs = (Bun.nanoseconds() - start) / 1_000_000;

    logger.info(`Copied ${src} → ${dest} (${humanSize(bytesWritten)}, ${timeMs.toFixed(2)}ms)`);

    return {
      path: dest,
      bytesWritten,
      timeMs: Math.round(timeMs * 100) / 100,
    };
  },

  /**
   * Generate a temp file with random data (useful for benchmarks).
   */
  async generateRandom(path: string, sizeBytes: number): Promise<WriteResult> {
    const buffer = new Uint8Array(sizeBytes);
    crypto.getRandomValues(buffer);
    return Files.write(path, buffer);
  },
};
