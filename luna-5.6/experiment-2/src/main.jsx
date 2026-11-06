import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'noteable-notes-v1';
const COLUMNS_KEY = 'noteable-columns-v1';
const DEFAULT_COLUMNS = [
  {id:'inbox', name:'Inbox'}, {id:'progress', name:'In progress'}, {id:'done', name:'Done'}
];

function makeId(){ return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function readStored(key, fallback){ try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }

function App(){
  const [notes,setNotes] = useState(() => readStored(STORAGE_KEY, []));
  const [columns,setColumns] = useState(() => readStored(COLUMNS_KEY, DEFAULT_COLUMNS));
  const [editing,setEditing] = useState(null);
  const [draft,setDraft] = useState({title:'',description:'',tags:''});
  const [formError,setFormError] = useState('');
  const [notice,setNotice] = useState('');
  const [importError,setImportError] = useState('');
  const [newColumn,setNewColumn] = useState('');
  const [draggingId,setDraggingId] = useState(null);
  const fileInput = useRef(null);

  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); },[notes]);
  useEffect(()=>{ localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns)); },[columns]);
  const notesByColumn = useMemo(()=>columns.reduce((map,c)=>({...map,[c.id]:notes.filter(n=>n.columnId===c.id)}),{}),[columns,notes]);

  function announce(message){ setNotice(message); window.setTimeout(()=>setNotice(''), 4500); }
  function resetForm(){setEditing(null);setDraft({title:'',description:'',tags:''});setFormError('');}
  function saveNote(event){
    event.preventDefault();
    const title = draft.title.trim();
    if(!title){setFormError('A title is required before you save.'); return;}
    const tags = draft.tags.split(',').map(t=>t.trim()).filter(Boolean);
    if(editing){
      setNotes(prev=>prev.map(n=>n.id===editing?{...n,title,description:draft.description.trim(),tags}:n));
      announce(`Note “${title}” updated.`);
    } else {
      const note={id:makeId(),title,description:draft.description.trim(),tags,columnId:columns[0]?.id||'inbox',createdAt:new Date().toISOString()};
      setNotes(prev=>[note,...prev]); announce(`Note “${title}” created and added to the note list.`);
    }
    resetForm();
  }
  function editNote(note){setEditing(note.id);setDraft({title:note.title,description:note.description,tags:note.tags.join(', ')});setFormError('');document.getElementById('note-title')?.focus();}
  function deleteNote(note){ if(window.confirm(`Delete “${note.title}”? This cannot be undone.`)){setNotes(prev=>prev.filter(n=>n.id!==note.id));announce(`Note “${note.title}” deleted.`); if(editing===note.id)resetForm();} }
  function moveNote(id,columnId){setNotes(prev=>prev.map(n=>n.id===id?{...n,columnId}:n)); const name=columns.find(c=>c.id===columnId)?.name; announce(`Note moved to ${name}.`);}
  function exportNotes(){
    const blob=new Blob([JSON.stringify({notes,columns},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='noteable-notes.json'; a.click(); URL.revokeObjectURL(url); announce('Notes exported as a JSON file.');
  }
  function importNotes(event){
    const file=event.target.files?.[0]; if(!file)return; setImportError('');
    const reader=new FileReader(); reader.onload=()=>{try{
      const parsed=JSON.parse(reader.result); const imported=Array.isArray(parsed)?parsed:parsed.notes;
      if(!Array.isArray(imported) || imported.some(n=>!n || typeof n.title!=='string')) throw new Error('invalid');
      const valid=imported.map(n=>({id:n.id||makeId(),title:n.title.trim(),description:typeof n.description==='string'?n.description:'',tags:Array.isArray(n.tags)?n.tags.map(String):[],columnId:columns.some(c=>c.id===n.columnId)?n.columnId:columns[0].id,createdAt:n.createdAt||new Date().toISOString()}));
      setNotes(valid); announce(`${valid.length} note${valid.length===1?'':'s'} imported successfully.`);
    }catch{setImportError('That file is not a valid Noteable JSON export. No notes were changed.');} finally {event.target.value='';}}; reader.readAsText(file);
  }
  function addColumn(event){event.preventDefault();const name=newColumn.trim();if(!name)return; const id=makeId();setColumns(prev=>[...prev,{id,name}]);setNewColumn('');announce(`Column “${name}” added.`);}

  return <div className="app-shell">
    <header className="topbar"><div><p className="eyebrow">PERSONAL WORKSPACE</p><h1>Noteable</h1><p className="subtitle">Capture ideas, keep momentum.</p></div><div className="top-actions"><button className="button secondary" onClick={exportNotes}>Export JSON</button><button className="button secondary" onClick={()=>fileInput.current?.click()}>Import JSON</button><input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={importNotes} aria-label="Import notes JSON file" /></div></header>
    <main className="content">
      <div className="sr-status" role="status" aria-live="polite">{notice}</div>
      {importError && <div className="alert error" role="alert">{importError}</div>}
      <section className="workspace-grid" aria-label="Notes workspace">
        <aside className="composer card" aria-labelledby="composer-heading">
          <div className="section-kicker">{editing?'EDIT NOTE':'NEW NOTE'}</div><h2 id="composer-heading">{editing?'Shape your thought':'Capture a thought'}</h2><p className="muted">A clear title keeps every idea findable.</p>
          <form onSubmit={saveNote} noValidate>
            <div className="field"><label htmlFor="note-title">Title <span aria-hidden="true">*</span></label><input id="note-title" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} aria-required="true" aria-invalid={!!formError} aria-describedby={formError?'title-error':undefined} placeholder="e.g. Plan the launch" />{formError&&<p id="title-error" className="field-error" role="alert">{formError}</p>}</div>
            <div className="field"><label htmlFor="note-description">Description</label><textarea id="note-description" rows="5" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Add useful context..." /></div>
            <div className="field"><label htmlFor="note-tags">Tags <span className="label-hint">(comma separated)</span></label><input id="note-tags" value={draft.tags} onChange={e=>setDraft({...draft,tags:e.target.value})} placeholder="work, idea" /></div>
            <div className="form-actions"><button className="button primary" type="submit">{editing?'Save changes':'Add note'}</button>{editing&&<button className="button ghost" type="button" onClick={resetForm}>Cancel</button>}</div>
          </form>
        </aside>
        <section className="notes-panel" aria-labelledby="notes-heading"><div className="panel-heading"><div><div className="section-kicker">YOUR NOTES</div><h2 id="notes-heading">All notes <span className="count">{notes.length}</span></h2></div><p className="muted">Drag a note to a column, or use the move menu.</p></div>
          {notes.length===0?<div className="empty card"><span className="empty-icon" aria-hidden="true">✦</span><h3>Your canvas is clear</h3><p>Create your first note to get started.</p></div>:<div className="note-list">{notes.map(note=><NoteCard key={note.id} note={note} columns={columns} draggingId={draggingId} onEdit={editNote} onDelete={deleteNote} onMove={moveNote} onDragStart={setDraggingId} onDragEnd={()=>setDraggingId(null)} />)}</div>}
        </section>
      </section>
      <section className="board-section" aria-labelledby="board-heading"><div className="panel-heading board-heading"><div><div className="section-kicker">VISUAL FLOW</div><h2 id="board-heading">Kanban board</h2></div><form className="add-column" onSubmit={addColumn}><label className="visually-hidden" htmlFor="new-column">New column name</label><input id="new-column" value={newColumn} onChange={e=>setNewColumn(e.target.value)} placeholder="New column name" /><button className="button secondary" type="submit">Add column</button></form></div>
        <div className="board" role="region" aria-label="Kanban columns">{columns.map(column=><div className="column" key={column.id} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); if(draggingId)moveNote(draggingId,column.id);setDraggingId(null);}}><div className="column-header"><h3>{column.name}</h3><span className="column-count">{notesByColumn[column.id]?.length||0}</span></div><div className={`drop-zone ${draggingId?'is-target':''}`} aria-label={`${column.name} drop zone`}>{(notesByColumn[column.id]||[]).map(note=><MiniCard key={note.id} note={note} onDragStart={setDraggingId} onDragEnd={()=>setDraggingId(null)} onMove={moveNote} columns={columns} />)}{!notesByColumn[column.id]?.length&&<p className="drop-hint">Drop notes here</p>}</div></div>)}</div>
      </section>
    </main><footer><span>Built for focus.</span><span>Keyboard-friendly · WCAG 2.2 AA mindful</span></footer>
  </div>
}

function NoteCard({note,columns,draggingId,onEdit,onDelete,onMove,onDragStart,onDragEnd}){return <article className={`note-card card ${draggingId===note.id?'dragging':''}`} draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',note.id);onDragStart(note.id)}} onDragEnd={onDragEnd}><div className="note-card-top"><h3>{note.title}</h3><div className="note-actions"><button className="icon-button" onClick={()=>onEdit(note)} aria-label={`Edit ${note.title}`}>Edit</button><button className="icon-button danger" onClick={()=>onDelete(note)} aria-label={`Delete ${note.title}`}>Delete</button></div></div>{note.description&&<p>{note.description}</p>}<div className="tag-row">{note.tags.map(tag=><span className="tag" key={tag}>#{tag}</span>)}</div><label className="move-control">Move to <select value={note.columnId} onChange={e=>onMove(note.id,e.target.value)} aria-label={`Move ${note.title} to column`}>{columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></article>}
function MiniCard({note,onDragStart,onDragEnd,onMove,columns}){return <div className="mini-card" draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',note.id);onDragStart(note.id)}} onDragEnd={onDragEnd}><strong>{note.title}</strong><select value={note.columnId} onChange={e=>onMove(note.id,e.target.value)} aria-label={`Move ${note.title} to column`}>{columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}

createRoot(document.getElementById('root')).render(<App />);
