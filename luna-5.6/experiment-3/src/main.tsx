import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Download,
  FileJson,
  Filter,
  GripVertical,
  KanbanSquare,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import "./styles.css";

type Priority = "low" | "medium" | "high";
type Note = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priority: Priority;
  dueDate: string | null;
  columnId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
type Column = { id: string; name: string; collapsed: boolean; order: number };
type State = {
  notes: Note[];
  columns: Column[];
  theme: "light" | "dark";
  soundEnabled: boolean;
};
type Toast = {
  id: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
};
const KEY = "luna-notes-state-v1";
const defaults: State = {
  notes: [],
  columns: [
    { id: "inbox", name: "Inbox", collapsed: false, order: 0 },
    { id: "doing", name: "In progress", collapsed: false, order: 1 },
    { id: "done", name: "Done", collapsed: false, order: 2 },
  ],
  theme: "light",
  soundEnabled: false,
};
const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.columns))
      return defaults;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}
function persist(s: State) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
const today = () => new Date().toISOString().slice(0, 10);
export function App() {
  const [state, setState] = useState<State>(load);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [due, setDue] = useState<"all" | "overdue" | "upcoming">("all");
  const [dialog, setDialog] = useState<{
    type: "create" | "edit" | "delete" | "move" | "column";
    note?: Note;
  } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [errorStatus, setErrorStatus] = useState("");
  const [sound, setSound] = useState(state.soundEnabled);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      persist(state);
    } catch {
      setErrorStatus(
        "Your changes could not be saved locally. Export a backup now.",
      );
    }
  }, [state]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);
  const announce = (message: string, error = false) => {
    if (error) {
      setErrorStatus(message);
      window.setTimeout(() => setErrorStatus(""), 5000);
    } else setStatus(message);
  };
  const toast = (
    message: string,
    action?: () => void,
    actionLabel = "Undo",
  ) => {
    const id = uid();
    setToasts((t) => [...t, { id, message, action, actionLabel }]);
    if (!action)
      window.setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        4500,
      );
  };
  const update = (fn: (s: State) => State, message?: string) => {
    setState((s) => fn(s));
    if (message) {
      announce(message);
      toast(message);
    }
  };
  const addNote = (
    data: Pick<Note, "title" | "description" | "tags" | "priority" | "dueDate">,
  ) => {
    const id = uid();
    const note: Note = {
      ...data,
      id,
      columnId: "inbox",
      order: state.notes.filter((n) => n.columnId === "inbox").length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    update(
      (s) => ({ ...s, notes: [...s.notes, note] }),
      `Created note “${note.title}”`,
    );
    setDialog(null);
  };
  const editNote = (
    data: Pick<Note, "title" | "description" | "tags" | "priority" | "dueDate">,
  ) => {
    if (!dialog?.note) return;
    const id = dialog.note.id;
    update(
      (s) => ({
        ...s,
        notes: s.notes.map((n) =>
          n.id === id
            ? { ...n, ...data, updatedAt: new Date().toISOString() }
            : n,
        ),
      }),
      `Updated “${data.title}”`,
    );
    setDialog(null);
  };
  const deleteNote = (note: Note) => {
    const old = state;
    update(
      (s) => ({ ...s, notes: s.notes.filter((n) => n.id !== note.id) }),
      `Deleted “${note.title}”`,
    );
    setDialog(null);
    toast(
      `Deleted “${note.title}”`,
      () => {
        setState(old);
        announce(`Restored “${note.title}”`);
      },
      "Undo",
    );
  };
  const moveNote = (id: string, columnId: string, order?: number) => {
    setState((s) => {
      const target = s.notes
        .filter((n) => n.columnId === columnId && n.id !== id)
        .sort((a, b) => a.order - b.order);
      const note = s.notes.find((n) => n.id === id);
      if (!note) return s;
      const at = Math.max(0, Math.min(order ?? target.length, target.length));
      target.splice(at, 0, { ...note, columnId, order: at });
      const notes = s.notes
        .filter((n) => n.id !== id)
        .map((n) =>
          n.columnId === columnId
            ? { ...n, order: target.findIndex((x) => x.id === n.id) }
            : n,
        );
      return {
        ...s,
        notes: [...notes, ...target.map((n, i) => ({ ...n, order: i }))],
      };
    });
    announce("Note moved");
  };
  const filtered = useMemo(
    () =>
      state.notes.filter((n) => {
        const q = query.toLowerCase();
        const matches =
          !q ||
          `${n.title} ${n.description} ${n.tags.join(" ")}`
            .toLowerCase()
            .includes(q);
        const p = priority === "all" || n.priority === priority;
        const d =
          due === "all" ||
          (due === "overdue"
            ? !!n.dueDate && n.dueDate < today()
            : !!n.dueDate && n.dueDate >= today());
        return matches && p && d;
      }),
    [state.notes, query, priority, due],
  );
  const exportNotes = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: "luna-notes",
            version: 1,
            exportedAt: new Date().toISOString(),
            columns: state.columns,
            notes: state.notes,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "luna-notes.json";
    a.click();
    URL.revokeObjectURL(a.href);
    announce("Exported notes as JSON");
    toast("Exported notes as JSON");
  };
  const importNotes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const p = JSON.parse(String(reader.result));
        if (
          p.format !== "luna-notes" ||
          p.version !== 1 ||
          !Array.isArray(p.notes) ||
          !Array.isArray(p.columns) ||
          p.notes.some((n: Note) => !n.id || !n.title || !n.columnId) ||
          p.columns.some((c: Column) => !c.id || !c.name)
        )
          throw Error();
        setState((s) => ({ ...s, notes: p.notes, columns: p.columns }));
        announce(`Imported ${p.notes.length} notes`);
        toast(`Imported ${p.notes.length} notes`);
      } catch {
        announce("Import failed: choose a valid Luna Notes JSON file", true);
        toast("Import failed: invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const createColumn = (name: string) => {
    update(
      (s) => ({
        ...s,
        columns: [
          ...s.columns,
          { id: uid(), name, collapsed: false, order: s.columns.length },
        ],
      }),
      `Added column “${name}”`,
    );
    setDialog(null);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <header className="topbar" inert={!!dialog}>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>Luna Notes</strong>
            <span>your thoughtful workspace</span>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="icon-btn"
            aria-label="Toggle dark mode"
            onClick={() =>
              setState((s) => ({
                ...s,
                theme: s.theme === "dark" ? "light" : "dark",
              }))
            }
          >
            {state.theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <button
            className="icon-btn"
            aria-label={sound ? "Mute sounds" : "Enable sounds"}
            onClick={() => {
              setSound(!sound);
              setState((s) => ({ ...s, soundEnabled: !sound }));
            }}
          >
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button className="avatar" aria-label="User profile">
            AM
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <p className="eyebrow">PERSONAL KNOWLEDGE BASE</p>
            <h1>
              Capture the thought.
              <br />
              <em>Find the thread.</em>
            </h1>
            <p className="lede">
              A quiet space for the ideas you want to come back to.
            </p>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <KanbanSquare size={62} />
          </div>
        </section>
        <section className="toolbar" aria-label="Note tools">
          <div className="search-wrap">
            <Search size={17} />
            <input
              aria-label="Search notes"
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="toolbar-actions">
            <label className="select-wrap">
              <Filter size={15} />
              <span className="sr-only">Priority filter</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
              >
                <option value="all">All priorities</option>
                <option value="high">High priority</option>
                <option value="medium">Medium priority</option>
                <option value="low">Low priority</option>
              </select>
            </label>
            <label className="select-wrap">
              <CalendarDays size={15} />
              <span className="sr-only">Due date filter</span>
              <select
                value={due}
                onChange={(e) => setDue(e.target.value as typeof due)}
              >
                <option value="all">All dates</option>
                <option value="overdue">Overdue</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </label>
            <button className="btn ghost" onClick={exportNotes}>
              <Download size={16} /> Export
            </button>
            <button
              className="btn ghost"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={importNotes}
            />
            <button
              className="btn primary"
              onClick={() => setDialog({ type: "create" })}
            >
              <Plus size={17} /> New note
            </button>
          </div>
        </section>
        <div className="workspace">
          <aside className="notes-panel" aria-labelledby="notes-heading">
            <div className="panel-heading">
              <div>
                <h2 id="notes-heading">All notes</h2>
                <span className="result-count" aria-live="polite">
                  {filtered.length} {filtered.length === 1 ? "note" : "notes"}
                </span>
              </div>
              <button
                className="icon-btn subtle"
                aria-label="Filter options"
                onClick={() =>
                  announce(
                    "Use the priority and due date filters in the toolbar",
                  )
                }
              >
                <SlidersHorizontal size={17} />
              </button>
            </div>
            <div
              className="note-list"
              role={filtered.length ? "list" : undefined}
              aria-live="polite"
            >
              {filtered.length ? (
                filtered
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .map((n) => (
                    <NoteCard
                      key={n.id}
                      note={n}
                      onEdit={() => setDialog({ type: "edit", note: n })}
                      onDelete={() => setDialog({ type: "delete", note: n })}
                      onMove={() => setDialog({ type: "move", note: n })}
                      onDragStart={() => setDragId(n.id)}
                      onDragEnd={() => setDragId(null)}
                      onDropColumn={moveNote}
                      dragging={dragId === n.id}
                    />
                  ))
              ) : (
                <div className="empty-state">
                  <Archive size={28} />
                  <strong>
                    {state.notes.length
                      ? "No matches"
                      : "Your workspace is quiet"}
                  </strong>
                  <span>
                    {state.notes.length
                      ? "Try a different search or filter."
                      : "Create a note to begin collecting ideas."}
                  </span>
                  {!state.notes.length && (
                    <button
                      className="btn primary"
                      onClick={() => setDialog({ type: "create" })}
                    >
                      Create first note
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
          <section className="board" aria-labelledby="board-heading">
            <div className="board-heading">
              <div>
                <p className="eyebrow">ORGANIZE YOUR FLOW</p>
                <h2 id="board-heading">The board</h2>
              </div>
              <button
                className="btn ghost"
                onClick={() => setDialog({ type: "column" })}
              >
                <Plus size={16} /> Add column
              </button>
            </div>
            <div className="columns">
              {state.columns
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <ColumnView
                    key={c.id}
                    column={c}
                    notes={filtered
                      .filter((n) => n.columnId === c.id)
                      .sort((a, b) => a.order - b.order)}
                    onToggle={() => {
                      setState((s) => ({
                        ...s,
                        columns: s.columns.map((x) =>
                          x.id === c.id ? { ...x, collapsed: !x.collapsed } : x,
                        ),
                      }));
                      announce(
                        `${c.name} ${c.collapsed ? "expanded" : "collapsed"}`,
                      );
                    }}
                    onDrop={(id) => {
                      moveNote(id, c.id);
                      announce(`Moved note to ${c.name}`);
                    }}
                    onMove={moveNote}
                    onDragStart={setDragId}
                    dragging={dragId}
                  />
                ))}
            </div>
          </section>
        </div>
      </main>
      <div className="live" role="status" aria-live="polite">
        {status}
      </div>
      <div className="live" role="alert" aria-live="assertive">
        {errorStatus}
      </div>
      <ToastRegion
        toasts={toasts}
        remove={(id) => setToasts((t) => t.filter((x) => x.id !== id))}
      />
      {dialog && (
        <Dialog
          state={dialog}
          onClose={() => setDialog(null)}
          onCreate={addNote}
          onEdit={editNote}
          onDelete={deleteNote}
          onMove={moveNote}
          onColumn={createColumn}
          columns={state.columns}
          announceMove={announce}
        />
      )}
    </div>
  );
}
function NoteCard({
  note,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  dragging: boolean;
  onDropColumn?: (id: string, columnId: string, order?: number) => void;
}) {
  const overdue = !!note.dueDate && note.dueDate < today();
  return (
    <article
      role="listitem"
      tabIndex={-1}
      data-note-id={note.id}
      className={`note-card ${dragging ? "dragging" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="card-top">
        <span className={`priority ${note.priority}`}>{note.priority}</span>
        {note.dueDate && (
          <span className={overdue ? "overdue due" : "due"}>
            <CalendarDays size={13} />
            {overdue
              ? "Overdue"
              : new Date(note.dueDate + "T00:00:00").toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" },
                )}
          </span>
        )}
        <span className="drag-handle" aria-hidden="true">
          <GripVertical size={16} />
        </span>
      </div>
      <div className="card-content">
        <h3>{note.title}</h3>
        {note.description && <p>{note.description}</p>}
        <div className="tag-row">
          {note.tags.map((t) => (
            <span className="tag" key={t}>
              <Tag size={12} />
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="card-actions">
        <button
          className="icon-btn"
          onClick={onEdit}
          aria-label={`Edit ${note.title}`}
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon-btn"
          onClick={onMove}
          aria-label={`Move ${note.title}`}
        >
          <ArrowDown size={15} />
        </button>
        <button
          className="icon-btn danger"
          onClick={onDelete}
          aria-label={`Delete ${note.title}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
function ColumnView({
  column,
  notes,
  onToggle,
  onDrop,
  onMove,
  onDragStart,
  dragging,
}: {
  column: Column;
  notes: Note[];
  onToggle: () => void;
  onDrop: (id: string) => void;
  onMove: (id: string, columnId: string, order?: number) => void;
  onDragStart: (id: string) => void;
  dragging: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (menuOpen)
      document
        .querySelector<HTMLElement>(
          `[aria-label="More actions for ${column.name}"] + .column-menu [role="menuitem"]`,
        )
        ?.focus();
  }, [menuOpen, column.name]);
  return (
    <section
      className={`kanban-column ${column.collapsed ? "collapsed" : ""}`}
      aria-labelledby={`column-${column.id}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => dragging && onDrop(dragging)}
    >
      <div className="column-head">
        <div className="column-title">
          <button
            className="collapse-btn"
            onClick={onToggle}
            aria-label={`${column.collapsed ? "Expand" : "Collapse"} ${column.name}`}
            aria-expanded={!column.collapsed}
          >
            {column.collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronDown size={17} />
            )}
          </button>
          <h3 id={`column-${column.id}`}>{column.name}</h3>
          <span className="column-count">{notes.length}</span>
        </div>
        <div className="column-menu-wrap">
          <button
            className="icon-btn subtle"
            aria-label={`More actions for ${column.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={17} />
          </button>
          {menuOpen && (
            <div
              className="column-menu"
              role="menu"
              onKeyDown={(event) => {
                const item =
                  event.currentTarget.querySelector<HTMLElement>(
                    '[role="menuitem"]',
                  );
                if (event.key === "Escape") {
                  event.preventDefault();
                  setMenuOpen(false);
                } else if (
                  event.key === "ArrowDown" ||
                  event.key === "ArrowUp" ||
                  event.key === "Home" ||
                  event.key === "End"
                ) {
                  event.preventDefault();
                  item?.focus();
                }
              }}
            >
              <button
                role="menuitem"
                onClick={() => {
                  onToggle();
                  setMenuOpen(false);
                }}
              >
                {column.collapsed ? "Expand column" : "Collapse column"}
              </button>
            </div>
          )}
        </div>
      </div>
      {!column.collapsed && (
        <div className="column-body" role={notes.length ? "list" : undefined}>
          {notes.length ? (
            notes.map((n, i) => (
              <div
                key={n.id}
                className="board-note"
                role="listitem"
                draggable
                onDragStart={() => onDragStart(n.id)}
              >
                <div className="board-note-main">
                  <span className={`dot ${n.priority}`} />
                  <span>{n.title}</span>
                </div>
                <div className="board-note-actions">
                  <button
                    className="icon-btn"
                    onClick={() => onMove(n.id, column.id, Math.max(0, i - 1))}
                    aria-label={`Move ${n.title} up`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => onMove(n.id, column.id, i + 1)}
                    aria-label={`Move ${n.title} down`}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="column-empty">
              <KanbanSquare size={19} />
              <span>Drop notes here</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function Dialog({
  state,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  onMove,
  onColumn,
  columns,
  announceMove,
}: {
  state: {
    type: "create" | "edit" | "delete" | "move" | "column";
    note?: Note;
  };
  onClose: () => void;
  onCreate: (
    d: Pick<Note, "title" | "description" | "tags" | "priority" | "dueDate">,
  ) => void;
  onEdit: (
    d: Pick<Note, "title" | "description" | "tags" | "priority" | "dueDate">,
  ) => void;
  onDelete: (n: Note) => void;
  onMove: (id: string, c: string, o?: number) => void;
  onColumn: (name: string) => void;
  columns: Column[];
  announceMove: (message: string) => void;
}) {
  const n = state.note;
  const [title, setTitle] = useState(n?.title || "");
  const [description, setDescription] = useState(n?.description || "");
  const [tags, setTags] = useState(n?.tags.join(", ") || "");
  const [priority, setPriority] = useState<Priority>(n?.priority || "medium");
  const [dueDate, setDueDate] = useState(n?.dueDate || "");
  const [columnId, setColumnId] = useState(n?.columnId || columns[0].id);
  const [position, setPosition] = useState(String((n?.order ?? 0) + 1));
  const [error, setError] = useState("");
  const first = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLElement | null>(
    document.activeElement as HTMLElement,
  );
  useEffect(() => {
    first.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".dialog button, .dialog input, .dialog textarea, .dialog select",
          ),
        );
        if (!focusable.length) return;
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && index === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.querySelector("main")?.setAttribute("inert", "");
    document.querySelector("header")?.setAttribute("inert", "");
    document.querySelector(".skip-link")?.setAttribute("inert", "");
    document.querySelector(".toast-region")?.setAttribute("inert", "");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.querySelector("main")?.removeAttribute("inert");
      document.querySelector("header")?.removeAttribute("inert");
      document.querySelector(".skip-link")?.removeAttribute("inert");
      document.querySelector(".toast-region")?.removeAttribute("inert");
      const fallback = document.querySelector<HTMLElement>(
        "[data-note-id], .column-head button, #main",
      );
      (trigger.current?.isConnected ? trigger.current : fallback)?.focus();
    };
  }, []);
  const save = () => {
    if (!title.trim()) {
      setError("Add a title before saving.");
      first.current?.focus();
      return;
    }
    const data = {
      title: title.trim(),
      description: description.trim(),
      tags: tags
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      priority,
      dueDate: dueDate || null,
    };
    state.type === "create" ? onCreate(data) : onEdit(data);
  };
  const heading =
    state.type === "create"
      ? "Create a note"
      : state.type === "edit"
        ? "Edit note"
        : state.type === "delete"
          ? "Delete note?"
          : state.type === "move"
            ? "Move note"
            : "Add a column";
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-head">
          <h2 id="dialog-title">{heading}</h2>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X />
          </button>
        </div>
        {(state.type === "create" || state.type === "edit") && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label>
              Title <span className="required">*</span>
              <input
                ref={first}
                value={title}
                required
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError("");
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "title-error" : undefined}
              />
            </label>
            {error && (
              <div className="field-error" id="title-error" role="alert">
                {error}
              </div>
            )}
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </label>
            <label>
              Tags<span className="hint">comma separated</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="design, idea"
              />
            </label>
            <div className="form-grid">
              <label>
                Priority
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary">
                <Check size={16} /> Save note
              </button>
            </div>
          </form>
        )}
        {state.type === "delete" && (
          <>
            <p className="dialog-copy">
              This will remove <strong>“{n?.title}”</strong> from your
              workspace. You can undo this from the notification.
            </p>
            <div className="dialog-actions">
              <button className="btn ghost" onClick={onClose}>
                Keep note
              </button>
              <button
                className="btn danger-btn"
                onClick={() => n && onDelete(n)}
              >
                <Trash2 size={16} /> Delete note
              </button>
            </div>
          </>
        )}
        {state.type === "move" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onMove(n!.id, columnId, Math.max(0, Number(position) - 1));
              announceMove(
                `Moved ${n?.title} to ${columns.find((c) => c.id === columnId)?.name}, position ${position}`,
              );
              onClose();
              window.setTimeout(
                () =>
                  document
                    .querySelector<HTMLElement>(`[data-note-id="${n!.id}"]`)
                    ?.focus(),
                0,
              );
            }}
          >
            <p className="dialog-copy" id="move-help">
              Choose a destination for <strong>“{n?.title}”</strong>.
            </p>
            <label>
              Destination
              <select
                aria-describedby="move-help"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Position
              <input
                type="number"
                min="1"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                aria-describedby="move-help"
              />
            </label>
            <div className="dialog-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary">Move note</button>
            </div>
          </form>
        )}
        {state.type === "column" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) onColumn(title.trim());
              else {
                setError("Add a column name.");
                first.current?.focus();
              }
            }}
          >
            <label>
              Column name
              <input
                ref={first}
                value={title}
                required
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError("");
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "column-error" : undefined}
              />
            </label>
            {error && (
              <div className="field-error" id="column-error" role="alert">
                {error}
              </div>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button className="btn primary">
                <Plus size={16} /> Add column
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
function ToastRegion({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: string) => void;
}) {
  return (
    <div className="toast-region" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div className="toast" key={t.id} role="status">
          <Check size={16} />
          <span>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action?.();
                remove(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <button
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => remove(t.id)}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
