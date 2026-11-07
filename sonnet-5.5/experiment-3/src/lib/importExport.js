import { PRIORITIES, isValidDate, uid } from './helpers.js';

export const FORMAT_VERSION = 1;

export function exportJSON(state, now = new Date()) {
  return JSON.stringify(
    {
      app: 'notes-kanban',
      version: FORMAT_VERSION,
      exportedAt: now.toISOString(),
      columns: state.columns.map((c) => ({ id: c.id, name: c.name, collapsed: c.collapsed, noteIds: c.noteIds })),
      notes: state.notes,
    },
    null,
    2,
  );
}

function fail(error) {
  return { ok: false, error };
}

function normaliseNote(raw, position) {
  const label = `Note ${position + 1}`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: `${label} is not an object.` };
  if (typeof raw.title !== 'string' || !raw.title.trim()) return { error: `${label} has no title.` };
  if (raw.description !== undefined && typeof raw.description !== 'string') return { error: `${label} has a description that is not text.` };
  if (raw.tags !== undefined && (!Array.isArray(raw.tags) || raw.tags.some((t) => typeof t !== 'string'))) {
    return { error: `${label} has tags that are not a list of text values.` };
  }
  if (raw.priority !== undefined && !PRIORITIES.includes(raw.priority)) return { error: `${label} has an unknown priority "${raw.priority}".` };
  if (raw.dueDate && !isValidDate(raw.dueDate)) return { error: `${label} has a due date that is not in YYYY-MM-DD form.` };
  if (raw.id !== undefined && typeof raw.id !== 'string') return { error: `${label} has an id that is not text.` };
  return {
    note: {
      id: raw.id || uid('note'),
      title: raw.title.trim(),
      description: (raw.description || '').trim(),
      tags: [...new Set((raw.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))],
      priority: raw.priority || 'medium',
      dueDate: raw.dueDate || '',
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    },
  };
}

/**
 * Reads exported text and merges it into the current state.
 * Notes with an id that already exists are replaced; columns are matched by id, then by name.
 */
export function importJSON(text, current) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('The file is not valid JSON.');
  }
  const rawNotes = Array.isArray(data) ? data : data && Array.isArray(data.notes) ? data.notes : null;
  if (!rawNotes) return fail('The file does not contain a list of notes.');
  const rawColumns = !Array.isArray(data) && Array.isArray(data.columns) ? data.columns : [];

  const notes = [];
  for (let i = 0; i < rawNotes.length; i++) {
    const { note, error } = normaliseNote(rawNotes[i], i);
    if (error) return fail(error);
    notes.push(note);
  }
  for (const c of rawColumns) {
    if (!c || typeof c.id !== 'string' || typeof c.name !== 'string' || !c.name.trim()) return fail('A column in the file has no id or name.');
    if (c.noteIds !== undefined && !Array.isArray(c.noteIds)) return fail(`Column "${c.name}" has a note list that is not a list.`);
  }

  const importedIds = new Set(notes.map((n) => n.id));
  const kept = current.notes.filter((n) => !importedIds.has(n.id));
  let columns = current.columns.map((c) => ({ ...c, noteIds: c.noteIds.filter((id) => !importedIds.has(id)) }));

  for (const rc of rawColumns) {
    let target = columns.find((c) => c.id === rc.id) || columns.find((c) => c.name.toLowerCase() === rc.name.trim().toLowerCase());
    if (!target) {
      target = { id: rc.id, name: rc.name.trim(), collapsed: Boolean(rc.collapsed), noteIds: [] };
      columns = [...columns, target];
    }
    const ids = (rc.noteIds || []).filter((id) => importedIds.has(id));
    columns = columns.map((c) => (c.id === target.id ? { ...c, noteIds: [...c.noteIds, ...ids.filter((id) => !c.noteIds.includes(id))] } : c));
  }
  // Keep a note in one column only, even if the file lists it twice.
  const seen = new Set();
  columns = columns.map((c) => ({
    ...c,
    noteIds: c.noteIds.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  }));

  return { ok: true, count: notes.length, state: { notes: [...notes, ...kept], columns } };
}
