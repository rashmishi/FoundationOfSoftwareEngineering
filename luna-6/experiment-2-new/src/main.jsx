import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Archive, ArrowDownUp, Check, CirclePlus, Download, FileUp, LayoutGrid, List, MoreHorizontal, Pencil, Plus, Search, StickyNote, Tag, Trash2, X } from 'lucide-react';
import './styles.css';

const DEFAULT_COLUMNS = [
  { id: 'inbox', name: 'Inbox', color: 'blue' },
  { id: 'in-progress', name: 'In progress', color: 'violet' },
  { id: 'done', name: 'Done', color: 'green' },
];
const starterNotes = [
  { id: 'n1', title: 'Plan the next team offsite', description: 'Find a cozy place, collect dietary preferences, and put together a loose agenda for the day.', tags: ['Work', 'Planning'], columnId: 'inbox', updatedAt: Date.now() },
  { id: 'n2', title: 'A few ideas for the homepage', description: 'Lead with the customer story. Try a shorter headline and bring the product screenshot up a little.', tags: ['Ideas', 'Design'], columnId: 'in-progress', updatedAt: Date.now() - 86400000 },
  { id: 'n3', title: 'Read: The Creative Act', description: 'Pick up where I left off — chapter 4 has a few good prompts to revisit.', tags: ['Personal'], columnId: 'inbox', updatedAt: Date.now() - 172800000 },
];
const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } };
const shortDate = (stamp) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(stamp));

function App() {
  const [notes, setNotes] = useState(() => load('memo-notes-v1', starterNotes));
  const [columns, setColumns] = useState(() => load('memo-columns-v1', DEFAULT_COLUMNS));
  const [query, setQuery] = useState('');
  const [view, setView] = useState('board');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [dragging, setDragging] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const fileRef = useRef(null);
  const titleRef = useRef(null);
  useEffect(() => { localStorage.setItem('memo-notes-v1', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('memo-columns-v1', JSON.stringify(columns)); }, [columns]);
  useEffect(() => { if (modal?.type === 'note') titleRef.current?.focus(); }, [modal]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 4200); return () => clearTimeout(id); }, [notice]);

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(n => !q || [n.title, n.description, ...n.tags].join(' ').toLowerCase().includes(q));
  }, [notes, query]);

  function saveNote(values) {
    const normalized = { ...values, tags: values.tags.split(',').map(t => t.trim()).filter(Boolean), updatedAt: Date.now() };
    if (!normalized.title.trim()) return false;
    if (modal.note) {
      setNotes(prev => prev.map(n => n.id === modal.note.id ? { ...n, ...normalized } : n));
      setNotice('Your changes have been saved.');
    } else {
      setNotes(prev => [{ ...normalized, id: crypto.randomUUID(), columnId: values.columnId || columns[0]?.id || 'inbox' }, ...prev]);
      setNotice('Note created and added to your board.');
    }
    setModal(null); return true;
  }
  function deleteNote(note) {
    if (!window.confirm(`Delete “${note.title}”? This action cannot be undone.`)) return;
    setNotes(prev => prev.filter(n => n.id !== note.id)); setNotice('Note deleted.');
  }
  function addColumn(name) {
    if (!name.trim()) return false;
    const colors = ['blue', 'violet', 'green', 'amber', 'rose'];
    setColumns(prev => [...prev, { id: crypto.randomUUID(), name: name.trim(), color: colors[prev.length % colors.length] }]);
    setNotice(`“${name.trim()}” column added.`); setModal(null); return true;
  }
  function moveNote(id, columnId) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, columnId, updatedAt: Date.now() } : n));
  }
  function exportNotes() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), columns, notes };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'memo-notes.json'; link.click(); URL.revokeObjectURL(url);
    setNotice('Your notes have been exported.');
  }
  async function importFile(file) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const importedNotes = Array.isArray(json) ? json : json.notes;
      if (!Array.isArray(importedNotes) || !importedNotes.every(n => n && typeof n.title === 'string' && typeof n.description === 'string' && Array.isArray(n.tags) && n.tags.every(t => typeof t === 'string'))) throw new Error('Notes must include a title, description, and tags.');
      const importedColumns = !Array.isArray(json) && json.columns;
      const safeCols = Array.isArray(importedColumns) && importedColumns.length && importedColumns.every(c => c && typeof c.id === 'string' && typeof c.name === 'string') ? importedColumns : columns;
      const colIds = new Set(safeCols.map(c => c.id));
      const safeNotes = importedNotes.map(n => ({ id: typeof n.id === 'string' ? n.id : crypto.randomUUID(), title: n.title, description: n.description, tags: n.tags, columnId: colIds.has(n.columnId) ? n.columnId : safeCols[0].id, updatedAt: Number.isFinite(n.updatedAt) ? n.updatedAt : Date.now() }));
      setColumns(safeCols); setNotes(safeNotes); setNotice(`Imported ${safeNotes.length} ${safeNotes.length === 1 ? 'note' : 'notes'} successfully.`);
    } catch (e) { setNotice(`Import failed: ${e instanceof SyntaxError ? 'the file is not valid JSON.' : (e.message || 'the file has an unsupported format.')}`); }
    if (fileRef.current) fileRef.current.value = '';
  }

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <a className="brand" href="#main" aria-label="Memo home"><span className="brand-icon"><StickyNote size={19} strokeWidth={2.2}/></span><span>memo<span className="brand-dot">.</span></span></a>
      <div className="nav-label">WORKSPACE</div>
      <nav className="primary-nav" aria-label="Workspace">
        <button className={`nav-item ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} aria-current={view === 'list' ? 'page' : undefined}><List size={18}/><span>All notes</span><span className="nav-count">{notes.length}</span></button>
        <button className={`nav-item ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')} aria-current={view === 'board' ? 'page' : undefined}><LayoutGrid size={18}/><span>My board</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-tip"><div className="tip-icon"><Archive size={16}/></div><div><strong>A little more clarity</strong><span>Move ideas forward, one note at a time.</span></div></div><div className="profile"><div className="avatar">M</div><div><strong>My workspace</strong><span>Personal space</span></div><MoreHorizontal size={18} className="profile-more" aria-hidden="true"/></div></div>
    </aside>
    <main id="main" className="main-content">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{view === 'board' ? 'My board' : 'All notes'}</strong></div><div className="top-actions"><label className="search-box"><Search size={17}/><span className="sr-only">Search notes</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search anything..." /></label><button className="icon-button" title="Export notes as JSON" aria-label="Export notes as JSON" onClick={exportNotes}><Download size={18}/></button><button className="icon-button" title="Import notes from JSON" aria-label="Import notes from JSON" onClick={() => fileRef.current?.click()}><FileUp size={18}/></button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => importFile(e.target.files?.[0])}/><button className="avatar top-avatar" aria-label="Workspace profile">M</button></div></header>
      <section className="page-heading"><div><div className="eyebrow"><span className="live-dot"/>YOUR PERSONAL SPACE</div><h1>{view === 'board' ? 'A place for your ideas.' : 'All your notes.'}</h1><p>{view === 'board' ? 'Keep the little things moving.' : 'Every thought, gathered in one place.'}</p></div><button className="button button-primary" onClick={() => setModal({ type: 'note' })}><Plus size={17} strokeWidth={2.4}/> New note</button></section>
      <div className="content-divider"/>
      {view === 'board' ? <section className="board-area" aria-label="Kanban board">
        <div className="board-toolbar"><div className="board-caption"><span className="caption-icon"><LayoutGrid size={15}/></span><strong>My board</strong><span className="subtle-count">{notes.length} notes</span></div><button className="button button-outline" onClick={() => setModal({ type: 'column' })}><CirclePlus size={16}/> Add column</button></div>
        <div className="board-columns">{columns.map(column => {
          const items = filteredNotes.filter(n => n.columnId === column.id);
          return <section key={column.id} className={`board-column ${overColumn === column.id ? 'column-over' : ''}`} aria-label={`${column.name} column`} onDragOver={e => { e.preventDefault(); setOverColumn(column.id); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOverColumn(null); }} onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragging; if (id) moveNote(id, column.id); setDragging(null); setOverColumn(null); }}>
            <div className="column-heading"><div className={`column-dot ${column.color}`}/><h2>{column.name}</h2><span className="column-count">{items.length}</span><button className="dots-button" aria-label={`${column.name} column options`} title="Column options" onClick={() => { if (columns.length <= 1) { setNotice('Keep at least one column on your board.'); return; } if (window.confirm(`Delete the “${column.name}” column? Its notes will move to the first column.`)) { const remaining = columns.filter(c => c.id !== column.id); const destination = remaining[0].id; setColumns(remaining); setNotes(prev => prev.map(n => n.columnId === column.id ? { ...n, columnId: destination } : n)); setNotice('Column removed.'); } }}><MoreHorizontal size={18}/></button></div>
            <div className="card-stack">{items.map(note => <NoteCard key={note.id} note={note} columns={columns} onEdit={() => setModal({ type: 'note', note })} onDelete={() => deleteNote(note)} onMove={moveNote} onDragStart={e => { setDragging(note.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', note.id); }} onDragEnd={() => { setDragging(null); setOverColumn(null); }} dragging={dragging === note.id} />)}
              {items.length === 0 && <div className={`empty-column ${overColumn === column.id ? 'drop-ready' : ''}`}><div className="empty-icon"><ArrowDownUp size={16}/></div><p>{query ? 'No matching notes' : 'Nothing here yet'}</p><span>{query ? 'Try another search.' : 'Drop a note here or add one.'}</span>{!query && <button onClick={() => setModal({ type: 'note', columnId: column.id })}>Add a note <Plus size={13}/></button>}</div>}
            </div>
            <button className="add-card-button" onClick={() => setModal({ type: 'note', columnId: column.id })}><Plus size={16}/> Add a note</button>
          </section>;
        })}<button className="add-column-tile" onClick={() => setModal({ type: 'column' })}><span><Plus size={17}/></span> Add another column</button></div>
      </section> : <section className="list-area"><div className="list-heading"><div><span className="caption-icon"><List size={15}/></span><strong>All notes</strong><span className="subtle-count">{filteredNotes.length} notes</span></div><button className="button button-outline" onClick={() => setModal({ type: 'column' })}><CirclePlus size={16}/> Add column</button></div>{filteredNotes.length ? <div className="notes-list">{filteredNotes.map(note => <NoteCard key={note.id} note={note} columns={columns} onEdit={() => setModal({ type: 'note', note })} onDelete={() => deleteNote(note)} onMove={moveNote} listMode />)}</div> : <EmptyState query={query} onAdd={() => setModal({ type: 'note' })}/>}</section>}
      <footer className="page-footer"><span>Made for the thoughts you don’t want to lose.</span><span>Saved on this device <span className="saved-check"><Check size={12}/></span></span></footer>
    </main>
    {notice && <div className="toast" role="status" aria-live="polite"><span className="toast-check"><Check size={14}/></span>{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15}/></button></div>}
    {modal && <Modal modal={modal} titleRef={titleRef} columns={columns} onClose={() => setModal(null)} onSave={saveNote} onAddColumn={addColumn}/>}
  </div>;
}

function NoteCard({ note, columns, onEdit, onDelete, onMove, onDragStart, onDragEnd, dragging, listMode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const col = columns.find(c => c.id === note.columnId);
  return <article className={`note-card ${dragging ? 'is-dragging' : ''} ${listMode ? 'list-card' : ''}`} draggable={!listMode} onDragStart={onDragStart} onDragEnd={onDragEnd}>
    <div className="note-card-top"><span className="note-date">{shortDate(note.updatedAt || Date.now())}</span><div className="card-actions"><button className="dots-button card-menu-trigger" aria-label={`Options for ${note.title}`} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={18}/></button>{menuOpen && <div className="card-menu" role="group" aria-label={`Actions for ${note.title}`}><button onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil size={14}/> Edit note</button><button className="danger-action" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={14}/> Delete note</button></div>}</div></div>
    <button className="note-title-button" onClick={onEdit}><h3>{note.title}</h3></button><p className="note-description">{note.description || <span className="muted-description">No description</span>}</p>
    {note.tags.length > 0 && <div className="tag-list" aria-label="Tags">{note.tags.map((tag, i) => <span key={`${tag}-${i}`} className={`tag-chip tag-${i % 4}`}><Tag size={11}/>{tag}</span>)}</div>}
    <div className="note-card-bottom">{col && <span className="card-column-label"><span className={`column-dot ${col.color}`}/>{col.name}</span>}{!listMode && <span className="drag-hint" aria-hidden="true">⠿</span>}</div>
    {listMode && <div className="list-move"><label htmlFor={`move-${note.id}`}>Move to</label><select id={`move-${note.id}`} value={note.columnId} onChange={e => onMove(note.id, e.target.value)} aria-label={`Move ${note.title} to column`}>{columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
  </article>;
}
function EmptyState({ query, onAdd }) { return <div className="empty-state"><span className="large-empty-icon"><StickyNote size={22}/></span><h2>{query ? 'No notes found' : 'Your page is still blank.'}</h2><p>{query ? 'Try a different search term.' : 'Every good idea starts somewhere. Add your first note.'}</p>{!query && <button className="button button-primary" onClick={onAdd}><Plus size={16}/> Create a note</button>}</div>; }

function Modal({ modal, titleRef, columns, onClose, onSave, onAddColumn }) {
  const editing = Boolean(modal.note);
  const [title, setTitle] = useState(modal.note?.title || '');
  const [description, setDescription] = useState(modal.note?.description || '');
  const [tags, setTags] = useState(modal.note?.tags?.join(', ') || '');
  const [columnId, setColumnId] = useState(modal.note?.columnId || modal.columnId || columns[0]?.id || '');
  const [error, setError] = useState('');
  const [columnName, setColumnName] = useState('');
  const columnDialog = modal.type === 'column';
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const handle = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const items = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])')].filter(el => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handle);
    return () => { window.removeEventListener('keydown', handle); previous?.focus?.(); };
  }, [onClose]);
  function submit(e) { e.preventDefault(); if (columnDialog) { if (!columnName.trim()) { setError('Enter a name for your column.'); return; } onAddColumn(columnName); return; } if (!title.trim()) { setError('A title is required to save your note.'); titleRef.current?.focus(); return; } onSave({ title: title.trim(), description: description.trim(), tags, columnId }); }
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="modal-kicker">{columnDialog ? 'MAKE ROOM FOR MORE' : editing ? 'REFINE YOUR THOUGHT' : 'CAPTURE A THOUGHT'}</span><h2 id="modal-title">{columnDialog ? 'Add a column' : editing ? 'Edit note' : 'New note'}</h2></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={18}/></button></div>
    <form onSubmit={submit} noValidate>{columnDialog ? <div className="form-field"><label htmlFor="column-name">Column name <span className="required">*</span></label><input id="column-name" autoFocus maxLength={40} value={columnName} onChange={e => { setColumnName(e.target.value); setError(''); }} placeholder="e.g. Someday, Waiting on..." aria-invalid={Boolean(error)} aria-describedby={error ? 'form-error' : undefined}/></div> : <><div className="form-field"><label htmlFor="note-title">Title <span className="required">*</span></label><input id="note-title" ref={titleRef} maxLength={100} value={title} onChange={e => { setTitle(e.target.value); setError(''); }} placeholder="Give this note a name" aria-invalid={Boolean(error)} aria-describedby={error ? 'form-error' : undefined}/></div><div className="form-field"><label htmlFor="note-description">Description <span className="optional">Optional</span></label><textarea id="note-description" rows={4} maxLength={1200} value={description} onChange={e => setDescription(e.target.value)} placeholder="Add a little more detail..."/><span className="field-hint">A few details help future-you remember.</span></div><div className="form-field"><label htmlFor="note-tags">Tags <span className="optional">Optional</span></label><input id="note-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="Ideas, Work, Personal"/><span className="field-hint">Separate tags with commas.</span></div><div className="form-field"><label htmlFor="note-column">Board column</label><select id="note-column" value={columnId} onChange={e => setColumnId(e.target.value)}>{columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></>}
      {error && <p className="form-error" id="form-error" role="alert">{error}</p>}<div className="modal-footer"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{columnDialog ? <><Plus size={16}/> Add column</> : <><Check size={16}/> {editing ? 'Save changes' : 'Save note'}</>}</button></div></form>
  </section></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
