/**
 * ⚙️ Application Configuration
 * Centralized environment variable management.
 */

export const config = {
  PORT: Number(Bun.env.PORT ?? 3000),
  DB_PATH: Bun.env.DB_PATH ?? "showcase.db",
  IS_DEV: Bun.env.NODE_ENV !== "production",
};
