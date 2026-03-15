/**
 * ⚙️ Application Configuration
 * Centralized environment variable management.
 */

const IS_DEV = Bun.env.NODE_ENV !== "production";

function getSessionSecret(): string {
  const secret = Bun.env.SESSION_SECRET;
  if (secret) return secret;
  if (!IS_DEV) {
    throw new Error("SESSION_SECRET environment variable is required in production");
  }
  return "dev-secret-do-not-use-in-production";
}

export const config = {
  PORT: Number(Bun.env.PORT ?? 3000),
  DB_PATH: Bun.env.DB_PATH ?? "showcase.db",
  IS_DEV,
  SESSION_SECRET: getSessionSecret(),
  SESSION_TTL_HOURS: Number(Bun.env.SESSION_TTL_HOURS ?? 24),
};
