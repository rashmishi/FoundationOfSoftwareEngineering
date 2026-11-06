import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

type Note = { id: string; title: string; description: string; tags: string[]; columnId: string | null }
type Column = { id: string; name: string }
type Data = { notes: Note[]; columns: Column[] }
const STORAGE = 'noteflow-accessible-board-v1'
const defaults: Data = { notes: [], columns: [{ id: 'backlog', name: 'Backlog' }, { id: 'working', name: 'In progress' }, { id: 'done', name: 'Done' }] }
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const read = (): Data => { try { const value = JSON.parse(localStorage.getItem(STORAGE) || ''); return Array.isArray(value.notes) && Array.isArray(value.columns) ? value : defaults } catch { return defaults } }

function App() {
  const [data, setData] = useState<Data>(read)
  const [form, setForm] = useState({ title: '', description: '', tags: '' })
  const [titleError, setTitleError] = useState('')
  const [message, setMessage] = useState('Ready.')
  const [editing, setEditing] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
  const [dragged, setDragged] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  useEffect(() => { localStorage.setItem(STORAGE, JSON.stringify(data)) }, [data])
  const announce = (text: string) => setMessage(text)
  const tags = (value: string) => value.split(',').map(x => x.trim()).filter(Boolean)
  const addNote = (event: React.FormEvent) => {
    event.preventDefault()
    const title = form.title.trim()
    if (!title) { setTitleError('A title is required before a note can be saved.'); return }
    setData(d => ({ ...d, notes: [...d.notes, { id: uid(), title, description: form.description.trim(), tags: tags(form.tags), columnId: null }] }))
    setForm({ title: '', description: '', tags: '' }); setTitleError(''); announce(`Note “${title}” was created and added to the note list.`)
  }
  const saveEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const note = data.notes.find(n => n.id === editing); const fd = new FormData(event.currentTarget); const title = String(fd.get('title') || '').trim()
    if (!note || !title) { setTitleError('A title is required.'); return }
    setData(d => ({ ...d, notes: d.notes.map(n => n.id === note.id ? { ...n, title, description: String(fd.get('description') || '').trim(), tags: tags(String(fd.get('tags') || '')) } : n) }))
    setEditing(null); setTitleError(''); announce(`Note “${title}” was updated.`)
  }
  const remove = (note: Note) => { if (confirm(`Delete “${note.title}”? This cannot be undone.`)) { setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== note.id) })); announce(`Note “${note.title}” was deleted.`) } }
  const move = (id: string, columnId: string | null) => { const n = data.notes.find(x => x.id === id); if (!n) return; setData(d => ({ ...d, notes: d.notes.map(x => x.id === id ? { ...x, columnId } : x) })); announce(`Note “${n.title}” moved to ${columnId ? data.columns.find(c => c.id === columnId)?.name : 'the note list'}.`) }
  const addColumn = (event: React.FormEvent) => { event.preventDefault(); const name = columnName.trim(); if (!name) return; setData(d => ({ ...d, columns: [...d.columns, { id: uid(), name }] })); setColumnName(''); announce(`Column “${name}” was added.`) }
  const exportNotes = () => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'noteflow-notes.json'; link.click(); URL.revokeObjectURL(link.href); announce('Your notes were exported as a JSON file.') }
  const importNotes = async (file?: File) => { if (!file) return; try { const incoming = JSON.parse(await file.text()); if (!incoming || !Array.isArray(incoming.notes) || !Array.isArray(incoming.columns) || !incoming.notes.every((n: unknown) => typeof n === 'object' && n !== null && 'title' in n)) throw new Error(); setData({ notes: incoming.notes.map((n: Note) => ({ ...n, id: n.id || uid(), description: n.description || '', tags: Array.isArray(n.tags) ? n.tags : [], columnId: n.columnId || null })), columns: incoming.columns }); announce(`${incoming.notes.length} notes were imported successfully.`) } catch { announce('Import failed: choose a valid NoteFlow JSON export file.') } finally { if (importRef.current) importRef.current.value = '' } }
  const visibleNotes = data.notes
  const NoteCard = ({ note }: { note: Note }) => <article className="note-card" draggable onDragStart={() => { setDragged(note.id); announce(`Moving “${note.title}”. Drop it on a board column.`) }} onDragEnd={() => setDragged(null)} aria-label={`Note: ${note.title}`}>
    <h3>{note.title}</h3>{note.description && <p>{note.description}</p>}{note.tags.length > 0 && <ul className="tags" aria-label="Tags">{note.tags.map(t => <li key={t}>{t}</li>)}</ul>}
    <div className="card-actions"><button onClick={() => { setEditing(note.id); setTitleError('') }}>Edit</button><button className="danger" onClick={() => remove(note)}>Delete</button></div>
    <label className="move-label">Move to <select value={note.columnId ?? ''} onChange={e => move(note.id, e.target.value || null)}><option value="">Note list</option>{data.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  </article>
  return <main><a className="skip" href="#workspace">Skip to workspace</a><header><div><p className="eyebrow">PERSONAL KNOWLEDGE SPACE</p><h1>NoteFlow</h1><p className="subhead">Capture thoughts, then move them into focus.</p></div><div className="file-actions"><button onClick={exportNotes}>Export JSON</button><button onClick={() => importRef.current?.click()}>Import JSON</button><input ref={importRef} onChange={e => importNotes(e.target.files?.[0])} type="file" accept="application/json,.json" hidden /></div></header>
  <p className="sr-only" role="status" aria-live="polite">{message}</p><div id="workspace" className="workspace">
    <section className="panel composer" aria-labelledby="create-title"><h2 id="create-title">Create a note</h2><form onSubmit={addNote} noValidate><label>Title <span aria-hidden="true">*</span><input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); setTitleError('') }} aria-invalid={!!titleError} aria-describedby={titleError ? 'title-error' : undefined} required /></label>{titleError && <p className="field-error" id="title-error">{titleError}</p>}<label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></label><label>Tags <span className="hint">(comma separated)</span><input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></label><button className="primary" type="submit">Save note</button></form></section>
    <section className="panel notes" aria-labelledby="list-title"><h2 id="list-title">Note list <span>{visibleNotes.length}</span></h2><p className="hint">All notes are shown here. Drag a card onto a column, or use its Move to menu.</p>{visibleNotes.length ? <div className="note-stack">{visibleNotes.map(n => <NoteCard key={n.id} note={n} />)}</div> : <p className="empty">No notes yet.</p>}</section>
  </div><section className="board-section" aria-labelledby="board-title"><div className="board-heading"><div><p className="eyebrow">WORKFLOW</p><h2 id="board-title">Kanban board</h2></div><form onSubmit={addColumn} className="add-column"><label htmlFor="column">New column</label><input id="column" value={columnName} onChange={e => setColumnName(e.target.value)} /><button type="submit">Add column</button></form></div><div className="board">{data.columns.map(column => { const notes = data.notes.filter(n => n.columnId === column.id); return <section key={column.id} className={'column ' + (dragged ? 'drop-ready' : '')} aria-labelledby={`column-${column.id}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragged) move(dragged, column.id); setDragged(null) }}><h3 id={`column-${column.id}`}>{column.name} <span>{notes.length}</span></h3><div className="column-notes">{notes.map(n => <NoteCard key={n.id} note={n} />)}{!notes.length && <p className="empty">Drop notes here</p>}</div></section> })}</div></section>
  {editing && (() => { const note = data.notes.find(n => n.id === editing)!; return <div className="dialog-backdrop" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="edit-title" className="dialog"><h2 id="edit-title">Edit note</h2><form onSubmit={saveEdit}><label>Title <input name="title" defaultValue={note.title} autoFocus required aria-invalid={!!titleError} /></label>{titleError && <p className="field-error">{titleError}</p>}<label>Description<textarea name="description" defaultValue={note.description} rows={4}/></label><label>Tags <input name="tags" defaultValue={note.tags.join(', ')} /></label><div className="dialog-actions"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary" type="submit">Save changes</button></div></form></section></div> })()}</main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
