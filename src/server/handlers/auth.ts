import { hashPassword, verifyPassword, compareAlgorithms } from "../../utils/auth";
import { generateTokenId, signToken, verifyToken } from "../../utils/token";
import { UsersRepo } from "../db/users.repo";
import { SessionsRepo } from "../db/sessions.repo";
import { getUser } from "../middleware/auth";
import { config } from "../../config";
import type { Handler } from "../router";
import type { UserPublic } from "../../shared/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function toPublicUser(user: { id: number; email: string; created_at: string }): UserPublic {
  return { id: user.id, email: user.email, created_at: user.created_at };
}

function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  return req.json().then((body) => {
    if (typeof body !== "object" || body === null) return null;
    return body as Record<string, unknown>;
  }).catch(() => null);
}

// ── Registration & Login ────────────────────────────────────────────

export const register: Handler = async (req) => {
  const body = await parseJsonBody(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const { email, password } = body;

  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    );
  }

  const existing = UsersRepo.findByEmail(email);
  if (existing) {
    return Response.json({ error: "Email already registered" }, { status: 409 });
  }

  const { hash } = await hashPassword(password);
  const user = UsersRepo.create(email, hash);

  return Response.json({ user: toPublicUser(user) }, { status: 201 });
};

export const login: Handler = async (req) => {
  const body = await parseJsonBody(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const { email, password } = body;

  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = UsersRepo.findByEmail(email);
  if (!user) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { match } = await verifyPassword(password, user.password_hash);
  if (!match) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Clean up expired sessions lazily
  SessionsRepo.deleteExpired();

  const tokenId = generateTokenId();
  const signedToken = await signToken(tokenId, config.SESSION_SECRET);
  const expiresAt = new Date(
    Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  SessionsRepo.create(user.id, tokenId, expiresAt);

  return Response.json({
    token: signedToken,
    expiresAt,
    user: toPublicUser(user),
  });
};

export const logout: Handler = async (req) => {
  const user = getUser(req);
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Delete only the specific session used for this request
  const authHeader = req.headers.get("Authorization");
  const signedToken = authHeader?.slice(7) ?? "";
  const payload = await verifyToken(signedToken, config.SESSION_SECRET);
  if (payload) {
    SessionsRepo.deleteByToken(payload);
  }

  return Response.json({ success: true });
};

export const me: Handler = async (req) => {
  const user = getUser(req);
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  return Response.json({ user });
};

// ── Legacy password demo endpoints ──────────────────────────────────

export const hashPw: Handler = async (req) => {
  const body = await parseJsonBody(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  const { password } = body;
  if (typeof password !== "string" || !password) {
    return Response.json({ error: "Password is required" }, { status: 400 });
  }
  const result = await hashPassword(password);
  return Response.json(result);
};

export const verifyPw: Handler = async (req) => {
  const body = await parseJsonBody(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  const { password, hash } = body;
  if (typeof password !== "string" || typeof hash !== "string") {
    return Response.json({ error: "Password and hash are required" }, { status: 400 });
  }
  const result = await verifyPassword(password, hash);
  return Response.json(result);
};

export const comparePw: Handler = async (req) => {
  const body = await parseJsonBody(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  const { password } = body;
  if (typeof password !== "string" || !password) {
    return Response.json({ error: "Password is required" }, { status: 400 });
  }
  const result = await compareAlgorithms(password);
  return Response.json(result);
};
