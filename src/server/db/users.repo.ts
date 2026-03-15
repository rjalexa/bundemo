import { getDb } from "./connection";
import type { User } from "../../shared/types";

function stmts() {
  const db = getDb();
  return {
    findByEmail: db.prepare<User, [string]>(
      "SELECT * FROM users WHERE email = ?"
    ),
    findById: db.prepare<User, [number]>(
      "SELECT * FROM users WHERE id = ?"
    ),
    insert: db.prepare<User, [string, string]>(
      "INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING *"
    ),
    count: db.prepare<{ total: number }, []>(
      "SELECT COUNT(*) as total FROM users"
    ),
  };
}

export const UsersRepo = {
  findByEmail(email: string): User | null {
    return stmts().findByEmail.get(email) ?? null;
  },

  findById(id: number): User | null {
    return stmts().findById.get(id) ?? null;
  },

  create(email: string, passwordHash: string): User {
    const user = stmts().insert.get(email, passwordHash);
    return user!;
  },

  count(): number {
    return stmts().count.get()?.total ?? 0;
  },
};
