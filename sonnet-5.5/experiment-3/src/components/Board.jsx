import { useEffect, useRef, useState } from 'react';
import Icon from './Icons.jsx';
import Menu from './Menu.jsx';
import NoteCard from './NoteCard.jsx';

function Column({ column, notes, shared, dropIndex, setDropTarget, onDropNote, onToggle, onRename, onDeleteColumn }) {
  const { columns, dragging } = shared;
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(column.name);
  const input = useRef(null);
  const heading = useRef(null);
  const wasRenaming = useRef(false);
  const body = useRef(null);

  useEffect(() => {
    if (renaming) {
      input.current?.focus();
      input.current?.select();
    } else if (wasRenaming.current) {
      heading.current?.focus();
    }
    wasRenaming.current = renaming;
  }, [renaming]);

  const indexFromPointer = (clientY) => {
    const cards = [...(body.current?.querySelectorAll('[data-note-id]') || [])];
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return cards.length;
  };

  const onDragOver = (e) => {
    if (!dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const index = column.collapsed ? column.noteIds.length : indexFromPointer(e.clientY);
    if (!dropIndex || dropIndex.columnId !== column.id || dropIndex.index !== index) setDropTarget({ columnId: column.id, index });
  };

  const startRename = () => {
    setNameDraft(column.name);
    setRenaming(true);
  };
  const finishRename = (save) => {
    setRenaming(false);
    if (save && nameDraft.trim() !== column.name) onRename(column.id, nameDraft);
  };

  const activeDrop = dropIndex && dropIndex.columnId === column.id;
  const headingId = `col-title-${column.id}`;
  const bodyId = `col-body-${column.id}`;

  const menuItems = [
    { label: 'Rename column', onSelect: startRename },
    { label: column.collapsed ? 'Expand column' : 'Collapse column', onSelect: () => onToggle(column.id) },
    { separator: true },
    { label: 'Delete column', danger: true, onSelect: () => onDeleteColumn(column.id) },
  ];

  return (
    <section
      className={`column ${column.collapsed ? 'collapsed' : ''} ${activeDrop ? 'drop-active' : ''}`}
      aria-labelledby={headingId}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropNote(e.dataTransfer.getData('text/plain') || dragging, column.id, activeDrop ? dropIndex.index : column.noteIds.length);
      }}
    >
      <header className="column-head">
        <button
          type="button"
          className="icon-btn collapse-btn"
          aria-expanded={!column.collapsed}
          aria-controls={bodyId}
          aria-label={`${column.collapsed ? 'Expand' : 'Collapse'} column ${column.name}`}
          title={column.collapsed ? 'Expand' : 'Collapse'}
          onClick={() => onToggle(column.id)}
        >
          <span className={`chevron ${column.collapsed ? 'closed' : ''}`}>
            <Icon name="chevron" />
          </span>
        </button>
        {renaming ? (
          <input
            ref={input}
            className="title-input"
            aria-label="Column name"
            aria-describedby="rename-help"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => finishRename(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRename(true);
              if (e.key === 'Escape') finishRename(false);
            }}
          />
        ) : (
          <h3 id={headingId} ref={heading} tabIndex={-1} className="column-title" onDoubleClick={startRename}>
            {column.name}
          </h3>
        )}
        <span className="count">
          {notes.length}
          <span className="sr-label"> {notes.length === 1 ? 'note' : 'notes'}</span>
        </span>
        <Menu label={`Actions for column ${column.name}`} items={menuItems} />
      </header>

      {!column.collapsed && (
        <div className="column-body" id={bodyId} ref={body}>
          {notes.length === 0 && !activeDrop && <p className="empty">Drop notes here</p>}
          {notes.map((note, i) => (
            <div key={note.id}>
              {activeDrop && dropIndex.index === i && <div className="drop-line" />}
              <NoteCard
                note={note}
                variant="board"
                columns={columns}
                currentColumn={column}
                position={{ index: i, total: notes.length }}
                dragging={dragging === note.id}
                onDragStart={shared.onDragStart}
                onDragEnd={shared.onDragEnd}
                onEdit={shared.onEdit}
                onDelete={shared.onDelete}
                onRename={shared.onRenameNote}
                onMove={shared.onMove}
                onReorder={shared.onReorder}
              />
            </div>
          ))}
          {activeDrop && dropIndex.index >= notes.length && <div className="drop-line" />}
        </div>
      )}
    </section>
  );
}

export default function Board({ columns, notesById, shared, dropTarget, setDropTarget, onDropNote, onAddColumn, onToggle, onRenameColumn, onDeleteColumn }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter a name for the new column.');
      document.getElementById('new-column')?.focus();
      return;
    }
    onAddColumn(name);
    setName('');
    setError('');
  };

  return (
    <section className="panel board-panel" aria-labelledby="board-heading">
      <div className="panel-head">
        <h2 id="board-heading">Board</h2>
        <form className="add-column" onSubmit={submit} noValidate>
          <label htmlFor="new-column" className="sr-label">
            New column name
          </label>
          <input
            id="new-column"
            type="text"
            value={name}
            placeholder="New column name"
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'new-column-error' : undefined}
          />
          <button type="submit" className="btn">
            <Icon name="plus" size={16} /> Add column
          </button>
        </form>
      </div>
      {error && (
        <p id="new-column-error" className="field-error">
          {error}
        </p>
      )}
      <div className="columns">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            notes={column.noteIds.map((id) => notesById[id]).filter(Boolean)}
            shared={shared}
            dropIndex={dropTarget}
            setDropTarget={setDropTarget}
            onDropNote={onDropNote}
            onToggle={onToggle}
            onRename={onRenameColumn}
            onDeleteColumn={onDeleteColumn}
          />
        ))}
        {columns.length === 0 && <p className="empty">There are no columns yet. Add one to start using the board.</p>}
      </div>
    </section>
  );
}
