import { NotesRepo } from "../db/notes.repo";
import type { Handler } from "../router";

export const listNotes: Handler = () => {
  const notes = NotesRepo.list();
  return Response.json({ notes, total: notes.length });
};

export const getNote: Handler = (_req, params) => {
  const note = NotesRepo.get(Number(params.id));
  if (!note) return Response.json({ error: "Note not found" }, { status: 404 });
  return Response.json(note);
};

export const createNote: Handler = async (req) => {
  const body = await req.json();
  if (!body.title) return Response.json({ error: "Title is required" }, { status: 400 });
  const note = NotesRepo.create({
    title: body.title,
    content: body.content ?? "",
    tags: body.tags ?? [],
  });
  return Response.json(note, { status: 201 });
};

export const deleteNote: Handler = (_req, params) => {
  const id = Number(params.id);
  const note = NotesRepo.get(id);
  if (!note) return Response.json({ error: "Note not found" }, { status: 404 });
  NotesRepo.delete(id);
  return Response.json({ deleted: true, id });
};
