import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'noteboard-data-v1';
const DEFAULT_COLUMNS = [
  { id: 'ideas', name: 'Ideas' },
  { id: 'doing', name: 'In progress' },
  { id: 'done', name: 'Done' },
];

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function cleanNote(value) {
  if (!value || typeof value !== 'object' || typeof value.title !== 'string' || !value.title.trim()) return null;
  return {
    id: typeof value.id === 'string' ? value.id : makeId('note'),
    title: value.title.trim(),
    description: typeof value.description === 'string' ? value.description.trim() : '',
    tags: Array.isArray(value.tags) ? value.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()) : [],
    columnId: typeof value.columnId === 'string' ? value.columnId : null,
  };
}

function readStoredData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.notes) || !Array.isArray(saved.columns)) throw new Error('Missing data');
    const columns = saved.columns.filter((column) => column && typeof column.id === 'string' && typeof column.name === 'string' && column.name.trim());
    return { notes: saved.notes.map(cleanNote).filter(Boolean), columns: columns.length ? columns : DEFAULT_COLUMNS };
  } catch {
    return { notes: [], columns: DEFAULT_COLUMNS };
  }
}

function NoteForm({ note, onSave, onCancel }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [description, setDescription] = useState(note?.description ?? '');
  const [tags, setTags] = useState(note?.tags?.join(', ') ?? '');
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  useEffect(() => titleRef.current?.focus(), []);

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) { setError('A title is required before this note can be saved.'); return; }
    onSave({ ...note, title: title.trim(), description: description.trim(), tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) });
  }
  return <form className="note-form" onSubmit={submit} noValidate>
    <div className="form-heading"><h2>{note ? 'Edit note' : 'New note'}</h2><p>Fields marked <span aria-hidden="true">*</span> are required.</p></div>
    <label htmlFor="note-title">Title <span aria-hidden="true">*</span></label>
    <input ref={titleRef} id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-describedby={error ? 'title-error' : undefined} aria-invalid={Boolean(error)} required />
    {error && <p id="title-error" className="field-error" role="alert">{error}</p>}
    <label htmlFor="note-description">Description</label>
    <textarea id="note-description" value={description} onChange={(e) => setDescription(e.target.value)} rows="4" />
    <label htmlFor="note-tags">Tags</label>
    <input id="note-tags" value={tags} onChange={(e) => setTags(e.target.value)} aria-describedby="tag-help" placeholder="e.g. research, personal" />
    <p id="tag-help" className="hint">Separate tags with commas.</p>
    <div className="form-actions"><button type="submit">{note ? 'Save changes' : 'Create note'}</button>{onCancel && <button type="button" className="button-secondary" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

function Tags({ tags }) { return tags.length ? <ul className="tags" aria-label="Tags">{tags.map((tag, i) => <li key={`${tag}-${i}`}>{tag}</li>)}</ul> : null; }

function App() {
  const initial = useMemo(readStoredData, []);
  const [notes, setNotes] = useState(initial.notes);
  const [columns, setColumns] = useState(initial.columns);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [newColumn, setNewColumn] = useState('');
  const dragNoteId = useRef(null);
  const importRef = useRef(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, columns })); }, [notes, columns]);
  const announce = (text) => { setMessage(text); window.setTimeout(() => setMessage(''), 4500); };
  const saveNote = (values) => {
    if (values.id) { setNotes((all) => all.map((note) => note.id === values.id ? { ...note, ...values } : note)); announce('Note changes saved.'); }
    else { setNotes((all) => [...all, { ...values, id: makeId('note'), columnId: null }]); announce('Note created and added to the list.'); }
    setEditing(null);
  };
  const deleteNote = (id) => { const note = notes.find((item) => item.id === id); setNotes((all) => all.filter((item) => item.id !== id)); announce(`Deleted ${note?.title ?? 'note'}.`); };
  const moveNote = (id, columnId) => { setNotes((all) => all.map((note) => note.id === id ? { ...note, columnId } : note)); announce(columnId ? 'Note moved to board column.' : 'Note returned to unassigned notes.'); };
  const startDrag = (event, id) => { dragNoteId.current = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); event.currentTarget.classList.add('dragging'); };
  const endDrag = (event) => { event.currentTarget.classList.remove('dragging'); dragNoteId.current = null; };
  const drop = (event, columnId) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || dragNoteId.current; if (id) moveNote(id, columnId); };
  const addColumn = (event) => { event.preventDefault(); const name = newColumn.trim(); if (!name) return; setColumns((all) => [...all, { id: makeId('column'), name }]); setNewColumn(''); announce(`Created ${name} column.`); };
  const exportNotes = () => { const blob = new Blob([JSON.stringify({ notes, columns }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'noteboard-export.json'; link.click(); URL.revokeObjectURL(link.href); announce('Your notes were exported as a JSON file.'); };
  const importNotes = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setImportError('');
    try {
      const payload = JSON.parse(await file.text());
      if (!payload || !Array.isArray(payload.notes) || !Array.isArray(payload.columns)) throw new Error();
      const nextColumns = payload.columns.filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim());
      const nextNotes = payload.notes.map(cleanNote); if (!nextColumns.length || nextNotes.some((note) => !note)) throw new Error();
      setColumns(nextColumns); setNotes(nextNotes); announce(`Imported ${nextNotes.length} note${nextNotes.length === 1 ? '' : 's'} successfully.`);
    } catch { setImportError('This file is not a valid NoteBoard JSON export. Nothing was imported.'); }
    event.target.value = '';
  };
  return <main className="app-shell">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <header><div><p className="eyebrow">LOCAL-FIRST WORKSPACE</p><h1>NoteBoard</h1><p className="subtitle">Capture thoughts, then move the work forward.</p></div><div className="data-actions"><button className="button-secondary" onClick={exportNotes}>Export JSON</button><button className="button-secondary" onClick={() => importRef.current?.click()}>Import JSON</button><input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importNotes} aria-label="Choose a NoteBoard JSON export to import" /></div></header>
    <p className="status" aria-live="polite">{message}</p>{importError && <p className="alert" role="alert">{importError}</p>}
    <section id="workspace" className="workspace" aria-label="Note workspace">
      <aside className="sidebar"><NoteForm note={editing} onSave={saveNote} onCancel={editing ? () => setEditing(null) : null} /><section className="note-list" aria-labelledby="notes-heading"><div className="section-title"><h2 id="notes-heading">All notes</h2><span>{notes.length}</span></div>{notes.length ? <ul>{notes.map((note) => <NoteCard key={note.id} note={note} columns={columns} onEdit={() => setEditing(note)} onDelete={() => deleteNote(note.id)} onMove={moveNote} draggable onDragStart={startDrag} onDragEnd={endDrag} />)}</ul> : <p className="empty">Create your first note to get started.</p>}</section></aside>
      <section className="board" aria-labelledby="board-heading"><div className="board-title"><div><p className="eyebrow">VISUAL WORKFLOW</p><h2 id="board-heading">Kanban board</h2></div><form onSubmit={addColumn} className="add-column"><label className="visually-hidden" htmlFor="column-name">New column name</label><input id="column-name" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} placeholder="New column name" /><button type="submit">Add column</button></form></div><div className="columns">{columns.map((column) => { const inColumn = notes.filter((note) => note.columnId === column.id); return <section key={column.id} className="column" aria-labelledby={`column-${column.id}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, column.id)}><div className="column-header"><h3 id={`column-${column.id}`}>{column.name}</h3><span>{inColumn.length}</span></div><div className="drop-zone" aria-label={`Drop notes in ${column.name}`}>{inColumn.length ? <ul>{inColumn.map((note) => <NoteCard key={note.id} note={note} columns={columns} onEdit={() => setEditing(note)} onDelete={() => deleteNote(note.id)} onMove={moveNote} draggable onDragStart={startDrag} onDragEnd={endDrag} />)}</ul> : <p className="empty">Drop a note here</p>}</div></section>; })}</div></section>
    </section>
  </main>;
}

function NoteCard({ note, columns, onEdit, onDelete, onMove, draggable, onDragStart, onDragEnd }) {
  return <li className="note-card" draggable={draggable} onDragStart={(event) => onDragStart(event, note.id)} onDragEnd={onDragEnd}><div className="card-top"><h3>{note.title}</h3><button className="icon-button" onClick={onEdit} aria-label={`Edit ${note.title}`}>Edit</button></div>{note.description && <p>{note.description}</p>}<Tags tags={note.tags} /><div className="card-actions"><label><span className="visually-hidden">Move {note.title} to</span><select value={note.columnId ?? ''} onChange={(e) => onMove(note.id, e.target.value || null)}><option value="">Unassigned</option>{columns.map((column) => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label><button className="delete" onClick={onDelete} aria-label={`Delete ${note.title}`}>Delete</button></div></li>;
}

createRoot(document.getElementById('root')).render(<App />);
