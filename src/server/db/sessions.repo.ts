import { getDb } from "./connection";
import type { Session } from "../../shared/types";

function stmts() {
  const db = getDb();
  return {
    insert: db.prepare<Session, [number, string, string]>(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?) RETURNING *"
    ),
    findByToken: db.prepare<Session, [string]>(
      "SELECT * FROM sessions WHERE token = ?"
    ),
    deleteByToken: db.prepare<{ changes: number }, [string]>(
      "DELETE FROM sessions WHERE token = ?"
    ),
    deleteByUserId: db.prepare<{ changes: number }, [number]>(
      "DELETE FROM sessions WHERE user_id = ?"
    ),
    deleteExpired: db.prepare<{ changes: number }, []>(
      "DELETE FROM sessions WHERE expires_at < datetime('now')"
    ),
  };
}

export const SessionsRepo = {
  create(userId: number, token: string, expiresAt: string): Session {
    const session = stmts().insert.get(userId, token, expiresAt);
    return session!;
  },

  findByToken(token: string): Session | null {
    return stmts().findByToken.get(token) ?? null;
  },

  deleteByToken(token: string): boolean {
    const result = stmts().deleteByToken.run(token);
    return result.changes > 0;
  },

  deleteByUserId(userId: number): number {
    const result = stmts().deleteByUserId.run(userId);
    return result.changes;
  },

  deleteExpired(): number {
    const result = stmts().deleteExpired.run();
    return result.changes;
  },
};
