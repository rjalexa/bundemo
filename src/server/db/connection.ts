import { Database } from "bun:sqlite";
import { logger } from "../../utils/logger";
import { config } from "../../config";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new Database(config.DB_PATH, { create: true });

    // Enable WAL mode for better concurrent performance
    _db.run("PRAGMA journal_mode = WAL");
    _db.run("PRAGMA synchronous = NORMAL");
    _db.run("PRAGMA foreign_keys = ON");

    // Initialize tables
    _db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT NOT NULL,
        content    TEXT NOT NULL DEFAULT '',
        tags       TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    _db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, content, tags,
        content='notes',
        content_rowid='id'
      )
    `);

    _db.run(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content, tags)
        VALUES (new.id, new.title, new.content, new.tags);
      END
    `);

    logger.success(`SQLite database opened: ${config.DB_PATH}`);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
    logger.info("Database connection closed");
  }
}
