/**
 * 🧪 Server Integration Tests
 * Tests the HTTP API endpoints using Bun's native fetch.
 *
 * Demonstrates:
 *   - Testing Bun.serve() with real HTTP requests
 *   - No test HTTP client needed — just use fetch()!
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const BASE_URL = "http://localhost:3001";
let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  // Import and start server on a test port
  process.env.PORT = "3001";
  process.env.DB_PATH = ":memory:";

  // Dynamically import to pick up env vars
  const { Router, json, jsonError } = await import("../server/router");
  const { NotesDB } = await import("../server/db");

  const router = new Router();

  router.get("/api/health", () => json({ status: "ok" }));

  router.get("/api/notes", () => {
    const notes = NotesDB.list();
    return json({ notes, total: notes.length });
  });

  router.post("/api/notes", async (req) => {
    const body = await req.json();
    if (!body.title) return jsonError("Title is required");
    const note = NotesDB.create({
      title: body.title,
      content: body.content ?? "",
      tags: body.tags ?? [],
    });
    return json(note, 201);
  });

  router.get("/api/notes/:id", (_req, params) => {
    const note = NotesDB.get(Number(params.id));
    if (!note) return jsonError("Note not found", 404);
    return json(note);
  });

  router.delete("/api/notes/:id", (_req, params) => {
    const id = Number(params.id);
    const note = NotesDB.get(id);
    if (!note) return jsonError("Note not found", 404);
    NotesDB.delete(id);
    return json({ deleted: true, id });
  });

  server = Bun.serve({
    port: 3001,
    fetch: (req) => router.handle(req),
  });
});

afterAll(() => {
  server?.stop();
});

describe("HTTP API", () => {
  describe("GET /api/health", () => {
    it("should return 200 with status ok", async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ok");
    });
  });

  describe("POST /api/notes", () => {
    it("should create a note", async () => {
      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Integration Test Note",
          content: "Created via HTTP",
          tags: ["test"],
        }),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.title).toBe("Integration Test Note");
      expect(data.id).toBeGreaterThan(0);
    });

    it("should reject notes without a title", async () => {
      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "No title" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/notes", () => {
    it("should list all notes", async () => {
      const res = await fetch(`${BASE_URL}/api/notes`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notes).toBeInstanceOf(Array);
      expect(data.total).toBeGreaterThan(0);
    });
  });

  describe("GET /api/notes/:id", () => {
    it("should return a specific note", async () => {
      // Create one first
      const createRes = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Fetch Me" }),
      });
      const created = await createRes.json();

      const res = await fetch(`${BASE_URL}/api/notes/${created.id}`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.title).toBe("Fetch Me");
    });

    it("should return 404 for non-existent notes", async () => {
      const res = await fetch(`${BASE_URL}/api/notes/99999`);
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/notes/:id", () => {
    it("should delete a note", async () => {
      const createRes = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Delete Me" }),
      });
      const created = await createRes.json();

      const res = await fetch(`${BASE_URL}/api/notes/${created.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deleted).toBe(true);

      // Verify it's gone
      const getRes = await fetch(`${BASE_URL}/api/notes/${created.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
