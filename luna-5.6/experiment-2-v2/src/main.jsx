import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Archive, ArrowDownToLine, ArrowUpFromLine, Check, ChevronDown, GripVertical,
  LayoutGrid, MoreHorizontal, Pencil, Plus, Search, Sparkles, Tag, Trash2, X
} from 'lucide-react'
import './styles.css'

const initialColumns = [
  { id: 'inbox', name: 'Inbox', color: 'coral' },
  { id: 'doing', name: 'In progress', color: 'amber' },
  { id: 'done', name: 'Done', color: 'mint' },
]

const starterNotes = [
  { id: 'welcome', title: 'Welcome to Notebox', description: 'Capture the loose thoughts, plans, and ideas that deserve a place to land.', tags: ['Getting started', 'Ideas'], columnId: 'inbox', createdAt: Date.now() - 1000 * 60 * 60 * 2 },
  { id: 'ritual', title: 'A better weekly ritual', description: 'Review open loops on Friday afternoon, then choose three things for next week.', tags: ['Planning'], columnId: 'doing', createdAt: Date.now() - 1000 * 60 * 60 * 24 },
]

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback } }

function App() {
  const [notes, setNotes] = useState(() => read('notebox-notes', starterNotes))
  const [columns, setColumns] = useState(() => read('notebox-columns', initialColumns))
  const [activeColumn, setActiveColumn] = useState('all')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(null)
  const importRef = useRef(null)

  useEffect(() => localStorage.setItem('notebox-notes', JSON.stringify(notes)), [notes])
  useEffect(() => localStorage.setItem('notebox-columns', JSON.stringify(columns)), [columns])
  useEffect(() => { if (notice) { const id = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(id) } }, [notice])

  const visibleNotes = notes.filter(note => {
    const matchesColumn = activeColumn === 'all' || note.columnId === activeColumn
    const needle = query.trim().toLowerCase()
    return matchesColumn && (!needle || [note.title, note.description, ...note.tags].join(' ').toLowerCase().includes(needle))
  })

  const saveNote = (values) => {
    if (!values.title.trim()) return
    if (modal?.note) {
      setNotes(current => current.map(note => note.id === modal.note.id ? { ...note, ...values, title: values.title.trim() } : note))
      setNotice('Note updated successfully.')
    } else {
      setNotes(current => [{ ...values, id: uid('note'), title: values.title.trim(), columnId: columns[0]?.id || 'inbox', createdAt: Date.now() }, ...current])
      setNotice('Note created and added to your inbox.')
    }
    setModal(null)
  }

  const deleteNote = (note) => { setNotes(current => current.filter(item => item.id !== note.id)); setNotice(`“${note.title}” was deleted.`) }
  const addColumn = (name) => { const column = { id: uid('column'), name: name.trim(), color: ['violet', 'blue', 'rose'][columns.length % 3] }; setColumns(current => [...current, column]); setNotice(`“${column.name}” column added.`); setModal(null) }
  const moveNote = (noteId, columnId) => { setNotes(current => current.map(note => note.id === noteId ? { ...note, columnId } : note)) }

  const exportNotes = () => {
    const blob = new Blob([JSON.stringify({ version: 1, notes, columns }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'notebox-notes.json'; link.click(); URL.revokeObjectURL(url); setNotice('Your notes were exported as JSON.')
  }

  const importNotes = (event) => {
    const file = event.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { try { const payload = JSON.parse(reader.result); if (!Array.isArray(payload.notes) || payload.notes.some(note => !note.id || !note.title)) throw new Error('invalid'); setNotes(payload.notes); if (Array.isArray(payload.columns) && payload.columns.length) setColumns(payload.columns); setNotice(`${payload.notes.length} notes imported successfully.`) } catch { setNotice('Import failed. Choose a valid Notebox JSON file.') } }
    reader.readAsText(file); event.target.value = ''
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#main" aria-label="Notebox home"><span className="brand-mark"><Sparkles size={17} aria-hidden="true" /></span><span>notebox</span></a>
      <nav aria-label="Primary navigation"><a className="nav-link active" href="#notes">Workspace</a><a className="nav-link" href="#about">How it works</a></nav>
      <div className="top-actions"><button className="icon-button" aria-label="Search notes" onClick={() => document.querySelector('#note-search')?.focus()}><Search size={18} aria-hidden="true" /></button><button className="avatar" aria-label="Your profile">JD</button></div>
    </header>
    <main id="main" className="main-content">
      <section className="intro" aria-labelledby="page-title"><div><p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true" /> Personal workspace</p><h1 id="page-title">Make space<br /><em>for good ideas.</em></h1><p className="intro-copy">A calm place to capture what matters, then move it forward.</p></div><div className="intro-stats" aria-label="Workspace summary"><div><strong>{notes.length}</strong><span>notes</span></div><div><strong>{columns.length}</strong><span>columns</span></div></div></section>

      <section id="notes" className="workspace" aria-label="Notes workspace">
        <aside className="sidebar" aria-label="Notes filters"><div className="sidebar-heading"><span className="section-label">Your notes</span><button className="small-icon" aria-label="Create a note" onClick={() => setModal({ type: 'note' })}><Plus size={17} aria-hidden="true" /></button></div><button className={`filter-item ${activeColumn === 'all' ? 'selected' : ''}`} onClick={() => setActiveColumn('all')}><span className="filter-icon"><LayoutGrid size={16} aria-hidden="true" /></span>All notes<span className="count">{notes.length}</span></button><div className="sidebar-heading columns-heading"><span className="section-label">Board columns</span><button className="small-icon" aria-label="Add a board column" onClick={() => setModal({ type: 'column' })}><Plus size={17} aria-hidden="true" /></button></div>{columns.map(column => <button key={column.id} className={`filter-item ${activeColumn === column.id ? 'selected' : ''}`} onClick={() => setActiveColumn(column.id)}><span className={`status-dot ${column.color}`} aria-hidden="true" />{column.name}<span className="count">{notes.filter(note => note.columnId === column.id).length}</span></button>)}<div className="sidebar-bottom"><button className="utility-button" onClick={exportNotes}><ArrowDownToLine size={16} aria-hidden="true" />Export JSON</button><button className="utility-button" onClick={() => importRef.current?.click()}><ArrowUpFromLine size={16} aria-hidden="true" />Import JSON</button><input ref={importRef} type="file" accept="application/json,.json" onChange={importNotes} hidden /></div></aside>

        <div className="board-area"><div className="toolbar"><div><h2>{activeColumn === 'all' ? 'All notes' : columns.find(c => c.id === activeColumn)?.name}</h2><p>{visibleNotes.length} {visibleNotes.length === 1 ? 'note' : 'notes'} · Updated just now</p></div><div className="toolbar-actions"><label className="search-field"><Search size={16} aria-hidden="true" /><span className="sr-only">Search notes</span><input id="note-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search notes" /></label><button className="button-primary" onClick={() => setModal({ type: 'note' })}><Plus size={17} aria-hidden="true" />New note</button></div></div>
          <div className="board" role="region" aria-label="Kanban board"><div className="board-header"><span className="board-hint"><GripVertical size={15} aria-hidden="true" />Drag notes between columns · use Move for keyboard access</span><button className="add-column-button" onClick={() => setModal({ type: 'column' })}><Plus size={15} aria-hidden="true" />Add column</button></div><div className="columns-grid">{columns.map(column => <BoardColumn key={column.id} column={column} columns={columns} notes={visibleNotes.filter(note => note.columnId === column.id)} onEdit={note => setModal({ type: 'note', note })} onDelete={deleteNote} onMove={(noteId, nextColumnId) => { moveNote(noteId, nextColumnId); setNotice('Note moved.') }} onDragStart={note => setDragging(note)} onDragEnd={() => setDragging(null)} onDrop={noteId => { moveNote(noteId, column.id); setDragging(null); setNotice('Note moved to ' + column.name + '.') }} dragging={dragging} />)}</div></div>
        </div>
      </section>
    </main>
    <footer className="footer"><span>Notebox <span className="footer-dot">·</span> a little room for your thinking</span><span>Everything is saved on this device</span></footer>
    {notice && <div className="toast" role="status"><span className="toast-check"><Check size={15} aria-hidden="true" /></span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {modal?.type === 'note' && <NoteModal note={modal.note} onClose={() => setModal(null)} onSave={saveNote} />}
    {modal?.type === 'column' && <ColumnModal onClose={() => setModal(null)} onSave={addColumn} />}
  </div>
}

function BoardColumn({ column, columns, notes, onEdit, onDelete, onMove, onDragStart, onDragEnd, onDrop, dragging }) {
  const [over, setOver] = useState(false)
  return <section className={`board-column ${over ? 'drag-over' : ''}`} onDragOver={event => { event.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={event => { event.preventDefault(); setOver(false); if (dragging) onDrop(dragging.id) }} aria-labelledby={`column-${column.id}`}><div className="column-title"><div><span className={`status-dot ${column.color}`} aria-hidden="true" /><h3 id={`column-${column.id}`}>{column.name}</h3><span className="column-count">{notes.length}</span></div><button className="column-menu" aria-label={`${column.name} options`}><MoreHorizontal size={18} aria-hidden="true" /></button></div><div className="note-stack">{notes.map(note => <NoteCard key={note.id} note={note} columns={columns} onMove={onMove} onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} onDragEnd={onDragEnd} />)}{notes.length === 0 && <div className="empty-column">Drop a note here</div>}</div></section>
}

function NoteCard({ note, columns, onMove, onEdit, onDelete, onDragStart, onDragEnd }) {
  return <article className="note-card" draggable onDragStart={() => onDragStart(note)} onDragEnd={onDragEnd} tabIndex="0" aria-label={`${note.title}. Draggable note`}><div className="card-top"><span className="drag-handle" aria-hidden="true"><GripVertical size={16} /></span><button className="card-menu" aria-label={`Actions for ${note.title}`} onClick={() => onEdit(note)}><MoreHorizontal size={18} /></button></div><button className="card-content" onClick={() => onEdit(note)}><h4>{note.title}</h4><p>{note.description || 'No description yet.'}</p></button><div className="tag-list">{note.tags.map(tag => <span className="tag" key={tag}><Tag size={12} aria-hidden="true" />{tag}</span>)}</div><div className="card-footer"><label className="move-control">Move<select aria-label={`Move ${note.title} to another column`} value={note.columnId} onChange={event => onMove(note.id, event.target.value)}>{columns.map(column => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label><button className="delete-button" aria-label={`Delete ${note.title}`} onClick={() => onDelete(note)}><Trash2 size={15} aria-hidden="true" /></button></div></article>
}

function NoteModal({ note, onClose, onSave }) {
  const [title, setTitle] = useState(note?.title || ''), [description, setDescription] = useState(note?.description || ''), [tags, setTags] = useState(note?.tags?.join(', ') || ''), [error, setError] = useState('')
  const submit = event => { event.preventDefault(); if (!title.trim()) { setError('Add a title before saving this note.'); return } onSave({ title, description, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean) }) }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="note-modal-title"><div className="modal-heading"><div><p className="eyebrow">{note ? 'Edit note' : 'New note'}</p><h2 id="note-modal-title">{note ? 'Shape the thought.' : 'What’s on your mind?'}</h2></div><button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={submit}><label>Title <span aria-hidden="true">*</span><input autoFocus value={title} onChange={event => { setTitle(event.target.value); setError('') }} placeholder="Give your note a name" aria-invalid={Boolean(error)} aria-describedby={error ? 'title-error' : undefined} />{error && <span className="field-error" id="title-error" role="alert">{error}</span>}</label><label>Description <span className="optional">Optional</span><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Add a little context…" rows="4" /></label><label>Tags <span className="optional">Separate with commas</span><input value={tags} onChange={event => setTags(event.target.value)} placeholder="e.g. work, reading, someday" /></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" type="submit">{note ? 'Save changes' : 'Create note'}<Check size={16} aria-hidden="true" /></button></div></form></div></div>
}

function ColumnModal({ onClose, onSave }) { const [name, setName] = useState(''); const submit = event => { event.preventDefault(); if (name.trim()) onSave(name) }; return <div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className="modal compact" role="dialog" aria-modal="true" aria-labelledby="column-modal-title"><div className="modal-heading"><div><p className="eyebrow">Board setup</p><h2 id="column-modal-title">Add a column.</h2></div><button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={submit}><label>Column name<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Someday" /></label><div className="modal-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className="button-primary" type="submit">Add column<Plus size={16} aria-hidden="true" /></button></div></form></div></div> }

createRoot(document.getElementById('root')).render(<App />)
