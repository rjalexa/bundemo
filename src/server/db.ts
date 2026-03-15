/**
 * 📦 SQLite Database Layer
 * Demonstrates bun:sqlite — Bun's built-in, zero-dependency SQLite driver
 *
 * Key features shown:
 *   - Database.open() with WAL mode for concurrency
 *   - Prepared statements with .all(), .get(), .run()
 *   - Type-safe query results via generics
 *   - Transaction support
 */

import { Database } from "bun:sqlite";
import { logger } from "../utils/logger";

// ── Types ──────────────────────────────────────────────────────────

export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string; // JSON array stored as text
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
}

// ── Database Initialization ────────────────────────────────────────

const DB_PATH = Bun.env.DB_PATH ?? "showcase.db";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new Database(DB_PATH, { create: true });

    // Enable WAL mode for better concurrent read performance
    _db.run("PRAGMA journal_mode = WAL");
    _db.run("PRAGMA synchronous = NORMAL");
    _db.run("PRAGMA foreign_keys = ON");

    // Create tables
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

    // Create full-text search index (SQLite FTS5)
    _db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, content, tags,
        content='notes',
        content_rowid='id'
      )
    `);

    // Trigger to keep FTS in sync
    _db.run(`
      CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, title, content, tags)
        VALUES (new.id, new.title, new.content, new.tags);
      END
    `);

    logger.success(`SQLite database opened: ${DB_PATH}`);
  }
  return _db;
}

// ── Prepared Statements (cached for performance) ───────────────────

function stmts() {
  const db = getDb();
  return {
    listAll: db.prepare<Note, []>(
      "SELECT * FROM notes ORDER BY created_at DESC"
    ),
    getById: db.prepare<Note, [number]>(
      "SELECT * FROM notes WHERE id = ?"
    ),
    insert: db.prepare<Note, [string, string, string]>(
      `INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)
       RETURNING *`
    ),
    update: db.prepare<Note, [string, string, string, number]>(
      `UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = datetime('now')
       WHERE id = ? RETURNING *`
    ),
    deleteById: db.prepare<{ changes: number }, [number]>(
      "DELETE FROM notes WHERE id = ?"
    ),
    search: db.prepare<Note, [string]>(
      `SELECT notes.* FROM notes_fts
       JOIN notes ON notes.id = notes_fts.rowid
       WHERE notes_fts MATCH ?
       ORDER BY rank`
    ),
    count: db.prepare<{ total: number }, []>(
      "SELECT COUNT(*) as total FROM notes"
    ),
  };
}

// ── Public API ─────────────────────────────────────────────────────

export const NotesDB = {
  /** List all notes, newest first */
  list(): Note[] {
    return stmts().listAll.all();
  },

  /** Get a single note by ID */
  get(id: number): Note | null {
    return stmts().getById.get(id) ?? null;
  },

  /** Create a new note */
  create(input: CreateNoteInput): Note {
    const tags = JSON.stringify(input.tags ?? []);
    const note = stmts().insert.get(input.title, input.content, tags);
    logger.info(`Note created: #${note!.id} "${input.title}"`);
    return note!;
  },

  /** Update an existing note */
  update(id: number, input: CreateNoteInput): Note | null {
    const tags = JSON.stringify(input.tags ?? []);
    return stmts().update.get(input.title, input.content, tags, id) ?? null;
  },

  /** Delete a note */
  delete(id: number): boolean {
    stmts().deleteById.run(id);
    const db = getDb();
    return db.query("SELECT changes() as c").get() !== null;
  },

  /** Full-text search across notes */
  search(query: string): Note[] {
    return stmts().search.all(query);
  },

  /** Get total note count */
  count(): number {
    return stmts().count.get()?.total ?? 0;
  },

  /** Batch insert using a transaction (very fast!) */
  batchCreate(notes: CreateNoteInput[]): Note[] {
    const db = getDb();
    const results: Note[] = [];

    const transaction = db.transaction(() => {
      for (const input of notes) {
        const note = NotesDB.create(input);
        results.push(note);
      }
    });

    transaction(); // Execute as a single atomic transaction
    logger.success(`Batch inserted ${results.length} notes in a transaction`);
    return results;
  },

  /** Close the database connection */
  close(): void {
    if (_db) {
      _db.close();
      _db = null;
      logger.info("Database connection closed");
    }
  },
};
