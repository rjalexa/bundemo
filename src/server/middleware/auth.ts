import type { Handler } from "../router";
import type { UserPublic } from "../../shared/types";
import { verifyToken } from "../../utils/token";
import { SessionsRepo } from "../db/sessions.repo";
import { UsersRepo } from "../db/users.repo";
import { config } from "../../config";

const userContext = new WeakMap<Request, UserPublic>();

/**
 * Retrieve the authenticated user attached to a request.
 */
export function getUser(req: Request): UserPublic | null {
  return userContext.get(req) ?? null;
}

/**
 * Higher-order function that wraps a handler with token-based authentication.
 * Extracts `Authorization: Bearer <token>`, validates it, and injects user context.
 */
export function withAuth(handler: Handler): Handler {
  return async (req, params) => {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token, config.SESSION_SECRET);
    if (!payload) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const session = SessionsRepo.findByToken(payload);
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 401 });
    }

    if (new Date(session.expires_at) < new Date()) {
      SessionsRepo.deleteByToken(payload);
      return Response.json({ error: "Session expired" }, { status: 401 });
    }

    const user = UsersRepo.findById(session.user_id);
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 401 });
    }

    userContext.set(req, {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
    return handler(req, params);
  };
}
