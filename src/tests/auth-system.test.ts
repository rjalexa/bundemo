import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const BASE_URL = "http://localhost:3002";
let server: ReturnType<typeof Bun.serve>;

const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "securepassword123",
};

beforeAll(async () => {
  process.env.PORT = "3002";
  process.env.DB_PATH = ":memory:";
  process.env.SESSION_SECRET = "test-auth-secret";

  // Dynamic imports to pick up env overrides
  const { Router } = await import("../server/router");
  const { NotesRepo } = await import("../server/db/notes.repo");
  const { withAuth } = await import("../server/middleware/auth");
  const {
    register,
    login,
    logout,
    me,
  } = await import("../server/handlers/auth");
  const {
    listNotes,
    getNote,
    createNote,
    deleteNote,
  } = await import("../server/handlers/notes");

  const router = new Router();

  // Public auth routes
  router.post("/api/auth/register", register);
  router.post("/api/auth/login", login);

  // Protected auth routes
  router.post("/api/auth/logout", withAuth(logout));
  router.get("/api/auth/me", withAuth(me));

  // Protected notes routes
  router.get("/api/notes", withAuth(listNotes));
  router.get("/api/notes/:id", withAuth(getNote));
  router.post("/api/notes", withAuth(createNote));
  router.delete("/api/notes/:id", withAuth(deleteNote));

  server = Bun.serve({
    port: 3002,
    fetch: (req) => router.handle(req),
  });
});

afterAll(() => {
  server?.stop();
});

async function registerUser(email: string, password: string) {
  return fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function loginUser(email: string, password: string) {
  return fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

describe("Auth System", () => {
  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await registerUser(TEST_USER.email, TEST_USER.password);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.user.email).toBe(TEST_USER.email);
      expect(data.user.id).toBeGreaterThan(0);
      expect(data.user.password_hash).toBeUndefined();
    });

    it("should reject duplicate email", async () => {
      const res = await registerUser(TEST_USER.email, TEST_USER.password);
      expect(res.status).toBe(409);
    });

    it("should reject invalid email", async () => {
      const res = await registerUser("not-an-email", "password123");
      expect(res.status).toBe(400);
    });

    it("should reject short password", async () => {
      const res = await registerUser("short@example.com", "short");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await loginUser(TEST_USER.email, TEST_USER.password);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(data.expiresAt).toBeDefined();
      expect(data.user.email).toBe(TEST_USER.email);
    });

    it("should reject wrong password", async () => {
      const res = await loginUser(TEST_USER.email, "wrongpassword");
      expect(res.status).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const res = await loginUser("nobody@example.com", "password123");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user info with valid token", async () => {
      const loginRes = await loginUser(TEST_USER.email, TEST_USER.password);
      const { token } = await loginRes.json();

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: authHeaders(token),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.email).toBe(TEST_USER.email);
    });

    it("should return 401 without token", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: authHeaders("invalid.token"),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Protected notes routes", () => {
    let token: string;

    beforeAll(async () => {
      const loginRes = await loginUser(TEST_USER.email, TEST_USER.password);
      const data = await loginRes.json();
      token = data.token;
    });

    it("should reject notes list without auth", async () => {
      const res = await fetch(`${BASE_URL}/api/notes`);
      expect(res.status).toBe(401);
    });

    it("should create a note with auth", async () => {
      const res = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ title: "Auth Test Note", content: "Protected" }),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.title).toBe("Auth Test Note");
    });

    it("should list notes with auth", async () => {
      const res = await fetch(`${BASE_URL}/api/notes`, {
        headers: authHeaders(token),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.notes).toBeInstanceOf(Array);
      expect(data.total).toBeGreaterThan(0);
    });

    it("should get a specific note with auth", async () => {
      // Create a note first
      const createRes = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ title: "Get Me" }),
      });
      const created = await createRes.json();

      const res = await fetch(`${BASE_URL}/api/notes/${created.id}`, {
        headers: authHeaders(token),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.title).toBe("Get Me");
    });

    it("should delete a note with auth", async () => {
      const createRes = await fetch(`${BASE_URL}/api/notes`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ title: "Delete Me" }),
      });
      const created = await createRes.json();

      const res = await fetch(`${BASE_URL}/api/notes/${created.id}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.deleted).toBe(true);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should invalidate the session", async () => {
      const loginRes = await loginUser(TEST_USER.email, TEST_USER.password);
      const { token } = await loginRes.json();

      // Verify token works
      const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: authHeaders(token),
      });
      expect(meRes.status).toBe(200);

      // Logout
      const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: authHeaders(token),
      });
      expect(logoutRes.status).toBe(200);

      // Token should no longer work
      const meRes2 = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: authHeaders(token),
      });
      expect(meRes2.status).toBe(401);
    });
  });
});
