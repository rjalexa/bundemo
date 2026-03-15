import { getDb } from "./connection";
import type { Note, CreateNoteInput } from "../../shared/types";
import { logger } from "../../utils/logger";

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

export const NotesRepo = {
  list(): Note[] {
    return stmts().listAll.all();
  },

  get(id: number): Note | null {
    return stmts().getById.get(id) ?? null;
  },

  create(input: CreateNoteInput): Note {
    const tags = JSON.stringify(input.tags ?? []);
    const note = stmts().insert.get(input.title, input.content, tags);
    logger.info(`Note created: #${note!.id} "${input.title}"`);
    return note!;
  },

  update(id: number, input: CreateNoteInput): Note | null {
    const tags = JSON.stringify(input.tags ?? []);
    return stmts().update.get(input.title, input.content, tags, id) ?? null;
  },

  delete(id: number): boolean {
    const result = stmts().deleteById.run(id);
    return result.changes > 0;
  },

  search(query: string): Note[] {
    return stmts().search.all(query);
  },

  count(): number {
    return stmts().count.get()?.total ?? 0;
  },

  batchCreate(notes: CreateNoteInput[]): Note[] {
    const db = getDb();
    const results: Note[] = [];

    const transaction = db.transaction(() => {
      for (const input of notes) {
        results.push(this.create(input));
      }
    });

    transaction();
    logger.success(`Batch inserted ${results.length} notes`);
    return results;
  },
};
