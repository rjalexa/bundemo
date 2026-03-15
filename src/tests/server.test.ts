import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const BASE_URL = "http://localhost:3001";
let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  process.env.PORT = "3001";
  process.env.DB_PATH = ":memory:";

  const { Router } = await import("../server/router");
  const { NotesRepo } = await import("../server/db/notes.repo");

  const router = new Router();

  router.get("/api/health", () => Response.json({ status: "ok" }));

  router.get("/api/notes", () => {
    const notes = NotesRepo.list();
    return Response.json({ notes, total: notes.length });
  });

  router.post("/api/notes", async (req) => {
    const body = await req.json();
    if (!body.title) return Response.json({ error: "Title is required" }, { status: 400 });
    const note = NotesRepo.create({
      title: body.title,
      content: body.content ?? "",
      tags: body.tags ?? [],
    });
    return Response.json(note, { status: 201 });
  });

  router.get("/api/notes/:id", (_req, params) => {
    const note = NotesRepo.get(Number(params.id));
    if (!note) return Response.json({ error: "Note not found" }, { status: 404 });
    return Response.json(note);
  });

  router.delete("/api/notes/:id", (_req, params) => {
    const id = Number(params.id);
    const note = NotesRepo.get(id);
    if (!note) return Response.json({ error: "Note not found" }, { status: 404 });
    NotesRepo.delete(id);
    return Response.json({ deleted: true, id });
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

      const getRes = await fetch(`${BASE_URL}/api/notes/${created.id}`);
      expect(getRes.status).toBe(404);
    });
  });
});
