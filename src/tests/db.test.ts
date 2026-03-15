/**
 * 🧪 Database Tests
 * Demonstrates bun test — Bun's built-in Jest-compatible test runner.
 *
 * Features shown:
 *   - describe / it / expect
 *   - beforeAll / afterAll lifecycle hooks
 *   - toEqual, toBe, toBeGreaterThan matchers
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { NotesDB, getDb } from "../server/db";
import type { CreateNoteInput } from "../server/db";

// Use an in-memory database for tests
beforeAll(() => {
  process.env.DB_PATH = ":memory:";
});

afterAll(() => {
  NotesDB.close();
});

describe("NotesDB", () => {
  describe("create", () => {
    it("should create a note with required fields", () => {
      const input: CreateNoteInput = {
        title: "Test Note",
        content: "This is a test note",
        tags: ["test", "demo"],
      };

      const note = NotesDB.create(input);

      expect(note.id).toBeGreaterThan(0);
      expect(note.title).toBe("Test Note");
      expect(note.content).toBe("This is a test note");
      expect(JSON.parse(note.tags)).toEqual(["test", "demo"]);
      expect(note.created_at).toBeDefined();
    });

    it("should auto-increment IDs", () => {
      const note1 = NotesDB.create({ title: "Note 1", content: "" });
      const note2 = NotesDB.create({ title: "Note 2", content: "" });

      expect(note2.id).toBe(note1.id + 1);
    });

    it("should default tags to empty array", () => {
      const note = NotesDB.create({ title: "No Tags", content: "" });
      expect(JSON.parse(note.tags)).toEqual([]);
    });
  });

  describe("get", () => {
    it("should retrieve a note by ID", () => {
      const created = NotesDB.create({ title: "Findable", content: "Find me" });
      const found = NotesDB.get(created.id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe("Findable");
    });

    it("should return null for non-existent ID", () => {
      const found = NotesDB.get(99999);
      expect(found).toBeNull();
    });
  });

  describe("list", () => {
    it("should return all notes", () => {
      const notes = NotesDB.list();
      expect(notes.length).toBeGreaterThan(0);
    });

    it("should return notes in reverse chronological order", () => {
      const notes = NotesDB.list();
      for (let i = 1; i < notes.length; i++) {
        expect(notes[i - 1].created_at >= notes[i].created_at).toBe(true);
      }
    });
  });

  describe("update", () => {
    it("should update a note's fields", () => {
      const note = NotesDB.create({ title: "Original", content: "Before" });
      const updated = NotesDB.update(note.id, {
        title: "Updated",
        content: "After",
        tags: ["updated"],
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("Updated");
      expect(updated!.content).toBe("After");
    });
  });

  describe("delete", () => {
    it("should delete a note", () => {
      const note = NotesDB.create({ title: "Delete Me", content: "" });
      NotesDB.delete(note.id);
      const found = NotesDB.get(note.id);
      expect(found).toBeNull();
    });
  });

  describe("count", () => {
    it("should return the total number of notes", () => {
      const count = NotesDB.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  describe("batchCreate", () => {
    it("should insert multiple notes atomically", () => {
      const countBefore = NotesDB.count();
      const inputs = Array.from({ length: 5 }, (_, i) => ({
        title: `Batch Note ${i}`,
        content: `Batch content ${i}`,
        tags: ["batch"],
      }));

      const results = NotesDB.batchCreate(inputs);

      expect(results.length).toBe(5);
      expect(NotesDB.count()).toBe(countBefore + 5);
    });
  });
});
