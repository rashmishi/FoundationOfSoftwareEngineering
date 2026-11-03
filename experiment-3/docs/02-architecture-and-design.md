# Architecture & Design — Notes & Kanban Board

| Field | Value |
|--|--|
| Document | 02 — Architecture & Design |
| Version | 2.0 |
| Date | 2026-11-02 |
| Input | [01 — Requirements Specification](01-requirements-specification.md) (accepted) |
| Status | Accepted by accessibility review, round 2 (see section 13) |

This document describes how the product is built: technology, module structure, data model, state flow, and — for each feature — the design that meets the functional requirements (FR-*) and accessibility requirements (A-*). Requirement IDs in brackets show traceability.

## 1. Technology choices

| Concern | Choice | Reason |
|--|--|--|
| Language | TypeScript 5 (strict) | Type safety for state and import validation (NFR-5). |
| UI | React 18 | Required by the brief. |
| Build | Vite 5 | Fast dev server, small production bundle (NFR-2). |
| Pointer drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Supports mouse, touch and pen with activation constraints (A-OP-5); lets us turn off its own announcements and plug in ours; no HTML5 drag-and-drop (which has no touch support and poor AT support). |
| Keyboard drag | Own implementation (`useKeyboardMove`) | FR-6.5 needs column/position semantics ("Left/Right = column, Up/Down = position") and exact announcement wording, which coordinate-based keyboard sensors cannot give. |
| Dialogs | Native `<dialog>` with `showModal()` | Built-in focus containment, Escape handling, top layer and inert background (FR-11.2, FR-11.4, A-RO-1). |
| Storage | `window.localStorage` | No server (NFR-4). |
| Sound | Web Audio API (generated tones) | No audio files; very short and quiet (FR-19). |
| Unit/component tests | Vitest + Testing Library + jsdom + axe-core | One command (NFR-6); axe checks (A-RO-1). |
| End-to-end tests | Playwright (Chromium) | Real pointer drag, focus, reduced motion, forced colours, zoom/reflow checks. |
| Serving | nginx (unprivileged image) in a multi-stage Docker build | Single image, non-root (FR-7.2, NFR-7). |

## 2. System context and deployment view

```
 ┌─────────────── Browser ────────────────┐        ┌──── Docker container ────┐
 │ React SPA (index.html + JS + CSS)      │  HTTP  │ nginx (non-root, port 80)│
 │   ├─ state in memory (reducer)         │◀──────▶│ serves /usr/share/nginx/ │
 │   └─ localStorage (data + preferences) │        │ html (static build)      │
 └────────────────────────────────────────┘        └──────────────────────────┘
```

The container serves static files only. All logic and data stay in the browser (NFR-4). A `HEALTHCHECK` requests `/healthz`, which nginx answers with `200 ok` (FR-7.3). Docker sets `net.ipv4.ip_unprivileged_port_start=0` inside containers by default, so the non-root nginx can listen on port 80 and `docker run -p 8080:80` works as FR-7.2 requires.

## 3. Module structure

```
src/
  main.tsx                    entry; mounts <App/> inside providers
  App.tsx                     page layout, landmarks, skip links, global shortcuts
  model/
    types.ts                  Note, Column, BoardState, Priority, ExportFile
    reducer.ts                pure board reducer + action types
    selectors.ts              filtering, column lookup, due-date status
    validation.ts             field rules (FR-1.4, FR-1.7, FR-6.1, FR-10.5)
    importExport.ts           serialise + strict parse/validate (FR-4)
    storage.ts                load/save with backup on corrupt data (FR-3)
    tags.ts                   parse tag text, tag → palette colour (FR-1.2, FR-8.2)
    dates.ts                  today, format "Tuesday 3 November 2026", status
    ids.ts                    id generator
  state/
    BoardContext.tsx          useReducer + persistence + undo snapshot
    PreferencesContext.tsx    theme, reduceMotion, sound, toastDuration
    AnnouncerContext.tsx      persistent polite + assertive live regions
    ToastContext.tsx          toast queue, timers, eviction rules (FR-12)
    FocusContext.tsx          "focus this after the next render" requests (FR-22)
    FilterContext.tsx         search text + filters (FR-9)
    sound.ts                  Web Audio tones
  components/
    Header.tsx                h1, Undo, Export, Import, Keyboard help, Settings
    NoteForm.tsx              New note form (and shared fields for Edit dialog)
    NoteFields.tsx            labelled fields + hints + errors
    FieldError.tsx            error text with icon, id for aria-describedby
    SearchBar.tsx             search + filter selects + count + Clear filters
    NoteList.tsx              h2 "Notes", <ul> of NoteCard (place="list")
    Board.tsx                 h2 "Board", DndContext, region, <ul> of columns
    BoardColumn.tsx           h3, collapse, menu, SortableContext, <ul> cards
    AddColumnForm.tsx         column name form
    NoteCard.tsx              title button / inline editor, meta, toolbar, handle
    InlineTitleEditor.tsx     FR-15
    NoteToolbar.tsx           icon buttons with tooltips (FR-14)
    IconButton.tsx            button + Tooltip + accessible name pattern
    Tooltip.tsx               hover/focus tooltip, Escape to dismiss
    MenuButton.tsx            APG menu button (FR-16)
    Dialog.tsx                <dialog> wrapper with focus return
    EditNoteDialog.tsx, MoveNoteDialog.tsx, ConfirmDialog.tsx,
    SettingsDialog.tsx, HelpDialog.tsx, ImportConfirmDialog.tsx
    ToastRegion.tsx           visible toasts + "<n> more messages"
    PriorityBadge.tsx, TagChip.tsx, DueDate.tsx
    Icon.tsx                  inline SVG icons, aria-hidden by default
  styles/
    tokens.css                colour tokens for light/dark, motion tokens
    app.css                   layout and components
  test/                       unit, component, axe tests
e2e/                          Playwright specs
```

## 4. Data model

```ts
type Priority = 'none' | 'low' | 'medium' | 'high';

interface Note {
  id: string;
  title: string;          // 1..200 after trim
  description: string;    // 0..5000
  tags: string[];         // each 1..40, unique ignoring case
  priority: Priority;
  dueDate: string | null; // 'YYYY-MM-DD'
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
}

interface Column {
  id: string;
  name: string;           // 1..60, unique ignoring case
  collapsed: boolean;
  noteIds: string[];      // order within the column
}

interface BoardState { notes: Note[]; columns: Column[] }   // notes: newest first

interface ExportFile {
  format: 'notes-kanban';
  version: 1;
  exportedAt: string;
  notes: Note[];
  columns: Column[];
}
```

Invariants (checked by `validateBoard` on load and import, and kept by the reducer): ids unique; each note id appears in at most one column; every column `noteIds` entry refers to an existing note; column names unique ignoring case.

A note's column is derived: `columnOf(noteId)` searches `columns`. There is one source of truth, so a note can never be in two columns.

## 5. State management

### 5.1 Board reducer

`reducer(state, action) → state` is pure and unit-tested (NFR-5). Actions:

| Action | Effect |
|--|--|
| `addNote {note}` | Prepend note. |
| `updateNote {id, changes}` | Merge, set `updatedAt`. |
| `deleteNote {id}` | Remove note and its id from any column. |
| `moveNote {id, toColumnId \| null, toIndex}` | Remove from current column; insert into target at index (clamped); `null` = remove from board. Moving within the same column uses array-move semantics. |
| `addColumn {column}` / `renameColumn` / `deleteColumn {id}` (notes become unassigned) / `moveColumn {id, delta}` / `toggleColumn {id}` | Column operations. |
| `replaceAll {state}` | Import or Undo restore. |

### 5.2 Undo

`BoardContext` wraps `dispatch` in `commit(action, undo?: {label, focus})`. For undoable actions (FR-12.2: delete note, delete column, import, move, edit) it stores `lastUndo = {label, snapshot: previousState, focusAfterUndo}` — one level, the most recent undoable action (FR-12.6). `undo(source: 'toast' | 'header' | 'shortcut', returnTo?)` dispatches `replaceAll(snapshot)`, clears `lastUndo`, plays the undo sound, notifies "Undo: <label>." and is the only place that decides focus after an undo, following FR-22 (see 8.10). Ctrl/Cmd+Z is ignored while a modal dialog is open, so nothing changes out of sight behind it. Toasts hold the `undoId`; a toast's Undo button only works while its `undoId` is still the latest (otherwise the button is not shown, because the toast is replaced, see 8.10).

### 5.3 Persistence

A `useEffect` on `state` calls `saveBoard(state)`; on exception (quota) an error toast is raised (FR-3.4). `loadBoard()` runs once: missing → default columns (FR-6.2); unparsable or invalid → copy raw text to `notes-kanban:backup`, start with defaults, show a message (FR-3.3). Keys: `notes-kanban:v1:board`, `notes-kanban:v1:prefs`.

### 5.4 Contexts

| Context | Holds | Used by |
|--|--|--|
| Board | state, commit, undo, lastUndo | everything |
| Preferences | theme, reduceMotion, sound, toastDuration | Settings, ToastContext, sound, `<html>` attributes |
| Announcer | `announce(text, 'polite' \| 'assertive')` | all actions |
| Toast | `notify({text, kind, undoId?})` | all actions |
| Focus | `requestFocus(key, fallbacks[])` | all actions (FR-22) |
| Filter | query, tag, priority, due; `matches(note)` | SearchBar, NoteList, Board |

## 6. Page structure and semantics

```
<html lang="en" data-theme="light|dark" data-reduce-motion="true|false">
<title>Notes & Kanban Board</title>
<body>
  <a class="skip-link" href="#board-heading">Skip to board</a>
  <a class="skip-link" href="#notes-heading">Skip to notes</a>
  <header>                                   (banner)
    <h1 tabindex="-1">Notes & Kanban Board</h1>
    <div role="group" aria-label="App actions"> Undo · Export notes · Import notes · Keyboard help · Settings </div>
  </header>
  <main>
    <section aria-labelledby="new-note-heading"> <h2>New note</h2> <form>…</form> </section>
    <search aria-label="Search and filter notes"> … </search>     (role="search" fallback)
    <div class="workspace">
      <section aria-labelledby="notes-heading">  <h2 tabindex="-1">Notes</h2> <p>Showing n of m notes</p> <ul> li > article(NoteCard, h3) </ul> </section>
      <section aria-labelledby="board-heading">  <h2 tabindex="-1">Board</h2>
        <form AddColumn/>
        <div role="region" aria-label="Board columns" tabindex="0"> <ul aria-label="Columns"> li > section(column, h3) > ul > li > article(NoteCard, h4) </ul> </div>
      </section>
    </div>
  </main>
  <div class="toast-region" aria-label="Notifications" role="region">…</div>   (not live; see 8.10)
  <div class="sr-only" role="status" aria-live="polite"></div>
  <div class="sr-only" role="alert" aria-live="assertive"></div>
  <div id="drag-instructions" class="sr-only">…</div>      (visually hidden, still in the accessibility tree)
</body>
```

- Heading levels follow A-PE-3: h1 → h2 (New note, Notes, Board) → h3 (list note titles; column names) → h4 (board note titles). `NoteCard` takes `headingLevel` from its place.
- Skip links (A-OP-4) are the first two focusable elements, visible on focus. Their targets are headings with `tabindex="-1"`, so focus actually moves.
- DOM order = visual order (A-PE-3): New note form, then search, then Notes and Board side by side on wide screens (Notes first, on the left), stacked on narrow screens.
- Note cards are `<article>` elements named by their title (`aria-labelledby`) inside `<li>`, so screen readers announce "list, 4 items" and users can jump by heading or article.
- The board scroll region (A-OP-4) is `role="region"`, named, and has `tabindex="0"` so it can be scrolled with arrow keys even if all columns are collapsed.

## 7. Visual design system

### 7.1 Colour tokens (contrast verified by script and by a unit test)

| Token | Light | Dark | Use and contrast (light / dark) |
|--|--|--|--|
| `--bg` | `#f4f5f7` | `#121418` | page background |
| `--surface` | `#ffffff` | `#1d2127` | cards, columns, dialogs |
| `--text` | `#1b1f24` | `#e8eaed` | body text: 16.6:1 / 13.4:1 on surface |
| `--muted` | `#4a5360` | `#b4bbc5` | hints, meta: 7.8:1 / 8.4:1 |
| `--border` | `#6b7480` | `#8a93a0` | input, button, card and column edges: 4.7:1 / 5.2:1 (≥ 3:1, A-PE-4) |
| `--focus` | `#1a56db` | `#8ab4ff` | focus ring: 6.2:1 / 7.7:1 on surface, 5.7:1 / 8.8:1 on bg |
| `--toolbar-faded` | `#7a828d` | `#8a93a0` | faded toolbar icons, drawn at full opacity (no `opacity` is used for fading): 3.9:1 / 5.2:1 on surface (FR-14.2) |
| `--accent` / `--on-accent` | `#1a56db` / `#fff` | `#8ab4ff` / `#0b1a33` | primary buttons: 6.2:1 / 8.3:1 |
| `--danger` / `--on-danger` | `#b42318` / `#fff` | `#ff9b91` / `#2b0703` | destructive buttons, error text: 6.6:1 / 9.1:1; error text on surface 6.6:1 / 8.0:1 |

Priority and tag chips use a background + foreground pair and a 1 px border in the foreground colour (so the chip edge is visible at ≥ 3:1 against the card):

| Pair | Light bg / fg (ratio) | Dark bg / fg (ratio) |
|--|--|--|
| Low priority, green tag | `#e3f5e8` / `#1d5b30` (7.1) | `#16351f` / `#a6e3b5` (9.1) |
| Medium priority, yellow tag | `#fdf1cf` / `#6b4700` (7.4) | `#3a2e0b` / `#f5d77a` (9.5) |
| High priority | `#fde4e2` / `#9b1c1c` (6.7) | `#4a1714` / `#ffb4ab` (8.7) |
| Blue tag | `#e3ecfd` / `#1d3f8f` (8.2) | `#1c2c4f` / `#bcd2ff` (9.1) |
| Purple tag | `#f0e8fc` / `#5b2a99` (7.9) | `#33204f` / `#dcc6ff` (9.3) |
| Orange tag | `#fdebdc` / `#8a3b0a` (6.7) | `#45250e` / `#ffc49b` (8.9) |
| Teal tag | `#dcf3f1` / `#0f5753` (7.2) | `#0f3533` / `#9fe3dc` (9.2) |
| Pink tag | `#fce6f0` / `#8c1d4f` (7.4) | `#45182c` / `#ffb3d1` (8.9) |
| Gray tag | `#eceef1` / `#363d47` (9.4) | `#2d323a` / `#d5dae1` (9.2) |

`tokens.css` is the single source of these colours. `src/test/contrast.test.ts` parses it, recomputes every text/background and UI-part pair in both themes, and fails below 4.5:1 for text and 3:1 for UI parts.

### 7.2 Not relying on colour (A-PE-4)

| Information | Colour | Non-colour cue |
|--|--|--|
| Priority | badge colour | word "Low/Medium/High priority" + icon with 1/2/3 bars |
| Tag | chip colour | tag text |
| Overdue | red left border (4 px) | word "Overdue" + warning-triangle icon |
| Due today | — | words "Due today" |
| Error | red text | icon + text message + `aria-invalid` + thick border on field |
| Drop target | — | 3 px dashed outline + "Drop here" text |
| Dragged item | — | shadow, 2° tilt (none with reduced motion), "Moving" label, dashed placeholder at origin |
| Focus | focus colour | 3 px outline with 2 px offset (shape, not colour) |
| Toggle states | — | native checkbox/switch with visible "On/Off" text |

### 7.3 Typography, spacing, reflow

- Base font 1rem (16 px), line-height 1.5, all sizes in `rem`/`em` (A-PE-4).
- No fixed heights on text containers; chips and badges use padding and `min-height`, so text-spacing overrides do not clip (A-PE-4). `overflow-wrap: anywhere` on titles and tags.
- Layout breakpoints: ≥ 1024 px — Notes (left, 22rem) and Board (right) side by side; board columns in a horizontally scrolling row inside the named region. < 1024 px — Notes above Board. < 640 px (and at 320 px / 400 % zoom) — columns stack vertically; no horizontal page scroll (A-PE-3).
- Sticky header only above 640 px height; `scroll-padding-top` equals header height; `scroll-padding-bottom` equals toast region height (A-OP-4, FR-12.8).

### 7.4 Focus indicator

`:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }` on every interactive element, with no exceptions; card internals have at least 6 px gaps between controls so the offset ring is never clipped or overlapping (cards have no `overflow: hidden`). In forced-colours mode the outline uses `Highlight` (A-OP-4, FR-20.4).

### 7.5 Target size

All buttons have `min-width`/`min-height` of 2.75rem (44 px) except note toolbar icon buttons and drag handles on pointer-fine devices, which are 2rem (32 px) with ≥ 8 px spacing; on `(pointer: coarse)` they become 44 px (A-OP-5).

### 7.6 Themes (FR-20)

- `PreferencesContext` sets `data-theme` on `<html>` to `light` or `dark`; "System" follows `matchMedia('(prefers-color-scheme: dark)')` and listens for changes.
- An inline script in `index.html` reads the stored preference and sets `data-theme` before the first paint (FR-20.2, no flash).
- `color-scheme: light | dark` is set so native controls (date picker, scrollbars) match.
- Forced colours (FR-20.4): `@media (forced-colors: active)` keeps borders as `CanvasText`, focus as `Highlight`, drop-target outline as `Highlight`, chips get `border: 1px solid CanvasText`; icons use `currentColor` so they follow system colours.

### 7.7 Motion (FR-18, A-OP-3)

- Motion tokens: `--dur-fast: 120ms; --dur: 200ms; --dur-slow: 300ms`.
- `html[data-reduce-motion="true"]` (set when the OS asks for reduced motion or the user turns on "Reduce motion") sets all durations to `0.01ms` except fades (`--dur-fade: 100ms`), removes transforms (drag tilt, slide-in), hides the toast countdown bar and sets `scroll-behavior: auto`.
- dnd-kit drop animation and sortable transitions read the same flag (`dropAnimation={reduce ? null : default}`).
- No flashing; no animation over 300 ms; nothing repeats.

## 8. Feature designs

### 8.1 New note form (FR-1)

- Fields: `Title (required)` text, `Description` textarea, `Tags` text with hint "Separate tags with commas. Each tag up to 40 characters.", `Priority` `<select>`, `Due date` `<input type="date">`. Every field has a `<label for>`; hints and errors are linked with `aria-describedby` (hint id first, then error id).
- No `maxlength`; `validateNote(values, {dueBadInput})` returns an error per field (FR-1.7). The form has `noValidate` so browser validation bubbles do not replace ours; Title has `required` (exposed as required) plus the visible "(required)". Submit: if errors, set `aria-invalid="true"` on those fields, show `FieldError` (icon + text) below the field, focus the first invalid field, keep all values (FR-1.8). Errors are not live regions: focus moving to the field reads label, hint and error via `aria-describedby`. When more than one field is invalid, a **polite** summary "Note not saved. 2 fields need attention." follows (it does not cut off the field being read).
- Character counters (`CharCount`) appear at ≥ 90 % as plain text; a separate polite announcement fires only when the limit is crossed (FR-1.7).
- On success: commit `addNote`, sound "create", toast "Note "<title>" created." (polite), reset form, focus Title (FR-1.5, FR-22).

### 8.2 Note card (FR-2.2, FR-8, FR-10, FR-14, FR-15, FR-16)

```
<li>
 <article aria-labelledby="t-<place>-<id>" class="card [overdue] [dragging]">
   <div class="card-top">
     <button class="drag-handle" aria-label='Drag, note "Buy milk"' aria-describedby="drag-instructions" aria-pressed>⋮⋮</button>
     <h3|h4 id="t-…"><button class="title-button" data-focus="title:<place>:<id>">Buy milk</button></h3|h4>
       — or <InlineTitleEditor/> while renaming
     <NoteToolbar/>  Edit · Move to… · Delete · More actions (menu)
   </div>
   <p class="desc">…</p>
   <ul class="chips" aria-label="Tags"> <li class="chip tag-blue">groceries</li> … </ul>
   <p class="meta"> <PriorityBadge/> <DueDate/> <span>Column: In progress | Not on board</span> (list place only) </p>
 </article>
</li>
```

- Title button opens the Edit dialog (FR-15.4); F2 on it starts inline rename (FR-15.1).
- `PriorityBadge`: `<span class="badge prio-high"><Icon bars=3 aria-hidden/>High priority</span>`; "none" renders nothing.
- `DueDate`: `<span class="due [overdue|today]"><Icon/> <time dateTime="2026-11-03">Due Tuesday 3 November 2026</time></span>`; overdue adds the visible word "Overdue" before it. `useToday()` re-renders every 60 s and on `visibilitychange` (FR-10.4). A note in a column whose name is "done" (ignoring case) is never overdue.

### 8.3 Note toolbar and tooltips (FR-14)

- `IconButton` renders `<button aria-label="{label}, note "{title}"">` + `<Icon aria-hidden/>` + `<Tooltip text={label}/>`. The tooltip is `aria-hidden="true"` (the same text is already the start of the accessible name — label in name, A-OP-5).
- Visibility: fading is done only by switching the icon colour token, never with `opacity` (opacity would blend the colour below 3:1). On `(hover: hover)` devices `.toolbar { color: var(--toolbar-faded) }` (3.9:1 / 5.2:1, the colour actually drawn); `.card:hover .toolbar, .card:focus-within .toolbar { color: var(--text) }`; `(hover: none)` → always `--text`. An E2E test reads the computed colour of a toolbar icon in the faded state in both themes and checks ≥ 3:1 against the card's computed background. Never `display:none` or `visibility:hidden`, so keyboard and screen reader access is unchanged.
- Tooltip (A-PE-4 / 1.4.13): shows on `pointerenter` and `focus` of the button after 300 ms (immediately on focus); positioned above the button (below if no room) so it never covers it; the tooltip element accepts pointer hover (it is inside the hover wrapper), so moving the pointer onto it keeps it open; it hides on `pointerleave` of both (100 ms grace), on `blur`, and on Escape (a keydown listener while visible; Escape is consumed only if a tooltip is visible, so it does not also close a dialog; on a picked-up drag handle Escape cancels the move first, see 8.9). Tooltips and menus render in the top layer with `popover="manual"` (still in place in the DOM, so reading order is kept) and are positioned with fixed coordinates from `getBoundingClientRect`, flipped to stay inside the viewport, so they are never clipped by the board's scroll region (A-PE-3 reflow, 1.4.13). In environments without the Popover API they fall back to `position: fixed`.

### 8.4 Inline title editor (FR-15)

- `<label for=…>Note title</label><input value autoFocus aria-describedby="hint err">` — a small **visible** label above the field while renaming (A-PE-3), and hint "Enter to save, Escape to cancel. Up to 200 characters." On mount `select()`.
- Enter → validate; invalid → inline `FieldError`, `aria-invalid`, stay. Valid → commit `updateNote` (undoable), focus title button.
- Escape → cancel, focus title button.
- Blur → valid: save; invalid: cancel and announce "Rename cancelled. Title not changed." (no focus pull-back, FR-15.3).

### 8.5 Menu button (FR-16)

APG "menu button" pattern:

- `<button aria-haspopup="menu" aria-expanded aria-controls="menu-id" aria-label='More actions, note "Buy milk"'>` (tooltip "More actions").
- `<ul role="menu" id aria-labelledby=button>` with `<li role="none"><button role="menuitem" tabindex="-1" aria-disabled?>`. Roving focus: only the active item gets focus.
- Keys: Enter/Space/Down on button → open, focus first enabled-or-disabled item (disabled items are focusable, FR-16.3); Up → open on last. In menu: Up/Down (wrap), Home/End, printable character → next item starting with it, Enter/Space → activate (no-op + announcement "Unavailable: Move up. Already at the top." when `aria-disabled`), Escape → close + focus button, Tab/Shift+Tab → close and let focus move naturally.
- Click outside (`pointerdown` on document outside menu and button) closes.
- The menu stays in place in the DOM right after its button (not a portal), so reading order matches visual order, but is shown in the top layer with `popover="manual"` and fixed coordinates, under the button or flipped up if there is no room, so the board's scroll region never clips it (see 8.3).
- Disabled items: `aria-disabled="true"`, muted text plus the word-free "unavailable" styling (strikethrough not used; reduced opacity kept at ≥ 4.5:1 by using `--muted`).

### 8.6 Dialogs (FR-11)

`Dialog` component:

- `<dialog aria-labelledby="h" aria-describedby?="desc" onCancel onClose>` with `<h2 id="h">` title, body, footer buttons.
- Open: `showModal()`; the browser makes the rest of the page inert and contains Tab (FR-11.4). Initial focus: `initialFocusRef` (first field; for confirmations the "Cancel" button, FR-11.2) via `autofocus`.
- Close paths: Escape (`cancel` event), "Cancel"/"Close" button, primary action. All call `onClose(result)`; the owner then requests focus per FR-22 (opener by default; fallback chain if the opener left the DOM).
- `ConfirmDialog` takes `message`, `confirmLabel` ("Delete note"), `tone="danger"`.
- `MoveNoteDialog`: `<select>` "Column" (columns + "Not on board"), `<select>` "Position" (1..n+1, labelled "Position 1 (top)" … "Position n (bottom)"; hidden when "Not on board"); changing selects only changes the form (A-UN-2); "Move" applies.
- `ImportConfirmDialog`: "Replace 4 notes and 3 columns with 7 notes and 3 columns from "notes-2026-11-01.json"? You can undo this." Buttons "Cancel", "Replace notes".
- `SettingsDialog`: Theme radio group (`<fieldset><legend>Theme</legend>` System/Light/Dark), checkboxes "Reduce motion", "Sound effects", select "Toast duration" (5, 8, 15, 30 s, "Keep until I close them"). Changes apply at once (no focus move), with a "Close" button.
- `HelpDialog`: definition list of shortcuts; section "Moving notes without dragging" (Move to… first, then keyboard drag).

### 8.7 Search and filter (FR-9)

- `<search>` with `<label>Search notes</label><input type="search" autocomplete="off">`, three `<select>`s (Tag: "All tags" + tags in use; Priority: "Any priority", High, Medium, Low, None; Due: Any, Overdue, Due in the next 7 days, No due date), button "Clear filters".
- Results filter immediately (live). The visible count `<p id="result-count">Showing 3 of 10 notes</p>` is plain text (not live). `useDebouncedAnnounce(count, 500ms)` announces it politely once per change; select changes announce at once (FR-9.3).
- Escape in the search box clears text (native for `type=search` in some browsers; we handle it for all).
- Board columns apply the same filter; a column with hidden notes shows "2 of 5 notes shown"; with none matching "No notes match the current search."
- Filtering uses `useDeferredValue` so typing stays responsive with 500 notes (NFR-1).

### 8.8 Board, columns, collapse (FR-5, FR-6, FR-17)

- `BoardColumn`: `<section aria-labelledby="col-h-id">` containing header: collapse button `<button aria-expanded aria-controls="col-body-id" aria-label='Collapse column, In progress'>` with chevron icon (tooltip "Collapse"/"Expand"; label changes with state — the visible tooltip text is the start of the name), `<h3 id tabindex="-1">In progress <span class="count">(4 notes)</span></h3>`, column `MenuButton`. Body: `<ul id="col-body-id" aria-label="Notes in In progress">`.
- Collapsed: body hidden (`hidden` attribute); header still shows name and count, column is still a droppable target (FR-17.2) and a keyboard-drag target (FR-6.5c).
- `AddColumnForm`: `<label>Column name (required)</label>` + hint "Up to 60 characters." + "Add column" button; validation as 8.1; on success focus the new column heading (FR-22).
- Column menu items: Rename column (opens a small dialog with one labelled field), Move column left, Move column right (disabled at the ends), Collapse/Expand column, Delete column (ConfirmDialog: "Delete column "In progress"? Its 4 notes stay in the note list, not on the board. You can undo this.").

### 8.9 Drag and drop (FR-5, FR-6.3–6.5, FR-13)

**Pointer (dnd-kit)**

- Sensors: `PointerSensor { activationConstraint: { distance: 6 } }` (mouse/pen), `TouchSensor { activationConstraint: { delay: 200, tolerance: 5 } }` (A-OP-5). dnd-kit's own `KeyboardSensor` is not used.
- The whole card is the pointer drag source (listeners on the `article`, ignoring events that start on buttons/inputs other than the drag handle), so mouse users can grab anywhere; the drag handle is the keyboard entry point.
- Draggables: list items use `useDraggable({id: 'list:<noteId>'})`; board cards use `useSortable({id: 'card:<noteId>'})` inside a `SortableContext` per column (vertical strategy). Droppables: each column `useDroppable({id: 'col:<colId>'})` and each sortable card.
- Feedback (FR-5.2): `DragOverlay` renders a copy of the card with shadow and slight scale/tilt (none with reduced motion) and the label "Moving"; the origin shows a dashed-outline placeholder; the column under the pointer gets `.drop-target` (3 px dashed outline in `--focus` + "Drop here" text at the insertion point). Same-column hover shows live reordering via sortable transforms.
- `onDragEnd({active, over})`: `over == null` → nothing changes (FR-5.4). Over a column → append; over a card → insert at that card's index. Commit `moveNote` (undoable), sound "drop", toast (announced once via `notify`) "“Buy milk” moved to In progress, position 2 of 4." (FR-5.6), focus the moved note's title button in its new place.
- dnd-kit announcements are replaced: `accessibility={{ announcements: silent, screenReaderInstructions: {draggable: ''} }}` so screen readers only hear our messages (avoids duplicates); its `aria-roledescription="draggable"` attributes are removed from the article (we spread only `listeners`, not `attributes`) so the article keeps its native role.

**Keyboard (own `useKeyboardMove`, FR-6.5)**

- Drag handle: an `IconButton` with the visible tooltip "Drag" and accessible name `Drag, note "Buy milk"`, plus `aria-describedby="drag-instructions"` and `aria-pressed={picked}`. When the handle gets keyboard focus its tooltip shows the short visible instructions under the word "Drag": "Space to pick up, arrows to move, Space to drop, Escape to cancel. Or use Move to…" (FR-6.5(a), A-UN-1). `#drag-instructions` is one shared **visually hidden** (`.sr-only`, not `hidden`) element with the full FR-6.5(a) text; the full text is also in Keyboard help. While a note is picked up, the tooltip shows "Moving — Space to drop, Escape to cancel"; the first Escape cancels the move (and hides the tooltip in the same keypress).
- State `{noteId, place, origin: {columnId|null, index}, current: {columnId|null, index}}` lives in `KeyboardMoveContext`. While picked, the reducer state is not changed. **The original card and its handle stay mounted where they are and keep focus for the whole move**; they are only restyled (`.kbd-origin`: dashed thick outline + visible "Moving" label). A preview ("ghost") renders a copy of the card at `current` with `.kbd-target` styling and an insertion line; the ghost is `aria-hidden="true"`, `inert`, and contains nothing focusable. Focus is moved (through FocusContext) only on drop, when the real card re-mounts in its new place. A component test picks up a note, presses Right twice and Down once, and checks `document.activeElement` is the same handle after every key, then drops and checks focus is on the handle in the new column.
- Keys on the handle: Space/Enter pick up / drop; Left/Right change column. For a note that started in the note list, the targets are "Not on board" (its origin) followed by the columns: Right from "Not on board" goes to the first column and Left from the first column goes back to "Not on board" (announced "Not on board."); Left at "Not on board" announces "Already off the board." For a note that started on the board, Left from the first column announces "Already in the first column." and Right from the last "Already in the last column."; Up/Down change index with edge announcements; Escape cancels; blur (Tab or click) cancels. `preventDefault` on these keys only while picked (and Space/Enter always on the handle).
- Each step announces politely per FR-6.5(c); drop commits `moveNote` (undoable) and keeps focus on the handle at the new place (for list-origin moves, the list item's handle) (FR-6.5d, FR-22). Because the handle element re-mounts when the card moves to another column, focus is restored via FocusContext key `handle:<place>:<id>`.

**Non-drag alternatives (FR-6.4, FR-13.2, A-OP-5)**: toolbar "Move to…" dialog; menu "Move up", "Move down", "Remove from board"; column menu "Move column left/right". All single-pointer, keyboard and screen reader friendly.

### 8.10 Announcer and toasts (FR-12)

- `AnnouncerContext` renders the two visually hidden page live regions at app start (A-RO-1). `announce(text, level)` **appends** the message as a new child `<p>` of the region (additions are announced; nothing is cleared, so two quick messages are both read) and removes each child after 7 s. Identical consecutive messages are still announced because each is a new node.
- **Dialogs and inert content (B2):** `showModal()` makes everything outside the dialog inert, which would silence the page regions. So every `Dialog` renders its own pair of visually hidden live regions inside the `<dialog>` element, and registers them with `AnnouncerContext` while open (a stack). `announce()` always writes to the top-most registered pair (the open dialog's), else to the page regions. Actions that close a dialog (save, delete, move, import) first call `dialog.close()`, then announce in the next animation frame, when the page regions are no longer inert. A component test checks an announcement made while a dialog is open lands inside the dialog's region.
- One user action produces exactly one announcement: `notify()` announces the toast text, and call sites never announce the same result separately (for keyboard drag, the drop text from FR-6.5(d) is the toast text).
- `ToastContext.notify({text, kind: 'success'|'error'|'info', undoId?})`:
  1. calls `announce(text, kind === 'error' ? 'assertive' : 'polite')` at once (to the dialog's regions if one is open) — every message is announced exactly once, whether shown now or queued (FR-12.8);
  2. pushes the toast to `queue`;
  3. `visible = first maxVisible items` where `maxVisible = innerHeight < 500 ? 1 : 3` (updated on resize).
- Eviction when a new toast arrives and `visible` is full: remove the oldest toast that is not `error` and not `focused`; if all are protected, the new toast stays queued and the region shows "<n> more messages" with a "Show next" button (FR-12.8).
- A new undoable action replaces (removes) the previous undo toast, since only the latest action can be undone (FR-12.6).
- Timer per toast: starts when it becomes visible, duration from preferences (`Infinity` for "Keep until I close them"; errors always `Infinity`, FR-12.7). Paused while `pointer over region`, `focus within region`, or `document.hidden` (FR-12.3). Remaining time is tracked so pausing resumes, not restarts.
- Toast markup: `<div class="toast toast-success" role="group" aria-label="Notification">` → icon (aria-hidden), text `<p>`, Undo button with visible text "Undo" and name "Undo, delete note "Buy milk"" (same as the header button, when `undoId` is current), Dismiss button with visible text "Dismiss" (not icon-only) and name "Dismiss, Note "Buy milk" deleted.", progress bar (aria-hidden, hidden with reduced motion). The toast region itself is not a live region (messages are announced via the announcer), so nothing is read twice.
- Focus: a document `focusin` listener remembers the last focused element outside the region (`returnTo`). F8 focuses the newest toast's first button; with no toasts it announces "No notifications." Escape in a toast = Dismiss. Focus after toast actions follows FR-22 exactly, and is decided in one place — `undo()` in `BoardContext` (5.2) for Undo, `ToastContext.dismiss()` for the rest:
  - Undo that restores a deleted note or column (toast, header or Ctrl/Cmd+Z): the restored note's title button or the restored column's heading.
  - Undo of a move, edit or import from a toast: `returnTo` if still connected, else the affected note's title button (import: the Notes heading). From the header button or shortcut: focus stays where it is.
  - Dismiss, Escape, or removal of a focused toast: `returnTo` if still connected, else the h1.
- Placement: fixed, bottom-right on wide screens, full-width bottom on narrow screens; `main` has `padding-bottom` = region height (ResizeObserver) and `scroll-padding-bottom` so focused elements can scroll above it (FR-12.8, A-OP-4).
- Header Undo button: `aria-disabled="true"` + name "Undo, nothing to undo" when empty; otherwise "Undo, delete note "Buy milk"" (visible text "Undo"). Ctrl/Cmd+Z handled on `document` when the event target is not an input, textarea, select or contenteditable (FR-12.6).

### 8.11 Focus manager (FR-22)

- Focusable targets carry `data-focus="<key>"`: `title:<place>:<noteId>`, `handle:<place>:<noteId>`, `menu:note:<place>:<noteId>`, `col-heading:<colId>`, `col-menu:<colId>`, `col-toggle:<colId>`, `heading:notes`, `heading:board`, `heading:main`, `field:new-title`.
- `requestFocus(keys: string[])` stores an ordered list of candidate keys; a `useLayoutEffect` after every commit focuses the first key that exists (with `preventScroll: false`, `scrollIntoView({block:'nearest'})`). The last fallback is always a heading, so focus never falls to `<body>`.
- Helper `neighbourKeys(noteId, place)` computes "next, previous, list heading" before a delete (FR-2.5).

### 8.12 Sound effects (FR-19)

- `sound.ts` lazily creates one `AudioContext` on the first user gesture after sound is turned on. Tones: create (660→880 Hz, 120 ms), drop (440 Hz, 80 ms), delete (330→220 Hz, 150 ms), undo (523→659 Hz, 120 ms), error (220 Hz, 200 ms). Gain 0.04 with a 10 ms fade in/out (no clicks). All under 0.5 s.
- `play(name)` does nothing unless `preferences.sound` is true (default false, FR-19.2). Every call site also calls `notify`/`announce` (FR-19.3).

### 8.13 Global keyboard shortcuts

| Key | Where | Action |
|--|--|--|
| Ctrl/Cmd+Z | anywhere except text fields; ignored while a modal dialog is open | Undo last action |
| F8 | anywhere | Focus newest notification |
| F2 | note title button | Rename inline |
| Space / Enter | drag handle | Pick up / drop |
| Arrow keys | picked-up drag handle | Move |
| Escape | menus, dialogs, tooltip, toast, inline editor, search box, keyboard drag | Close / cancel |

No single printable-character shortcuts (A-OP-1). Menu type-ahead only works inside an open menu.

## 9. Import / export design (FR-4)

- Export: `serialise(state)` → `ExportFile` → `JSON.stringify(…, null, 2)` → `Blob` → `URL.createObjectURL` → temporary `<a download="notes-YYYY-MM-DD.json">` click → revoke. Toast "Exported 7 notes to notes-2026-11-02.json."
- Import control: a real `<button>Import notes</button>` that clicks a visually hidden `<input type="file" accept=".json,application/json" tabindex="-1" aria-hidden="true">`; the button is the single keyboard/AT entry point named "Import notes" (FR-4.2). After a file is chosen: read text → `parseImport(text)`:
  - `JSON.parse` failure → "The file is not valid JSON. Choose a file exported from this application."
  - shape errors → specific: "The file is missing the notes list.", "Note 3 has no title.", "Note 5 has an invalid due date "2026-13-01".", "Column "Done" refers to a note that is not in the file.", "This file was made by a newer version (version 2). Update the application or export again." Every message ends with what to do.
  - Strings are trimmed and lengths checked with the same rules as the forms; unknown extra fields are ignored; duplicate ids rejected.
- Failure: error toast (assertive, stays), plus the message is shown in an inline error under the Import button (`role` none, linked via `aria-describedby` to the button) until the next import attempt or dismissal (FR-4.4). Focus stays on the Import button (FR-22).
- Success: ImportConfirmDialog → `replaceAll` (undoable) → toast "Imported 7 notes and 3 columns." → focus Notes heading.
- The file input's value is reset after each attempt so the same file can be chosen again.

## 10. Error handling

| Situation | Handling |
|--|--|
| Field invalid | Inline error + `aria-invalid` + focus first invalid + summary announcement (8.1). |
| Import invalid | Section 9. |
| Storage unreadable at start | Backup + defaults + a persistent banner at the top of `main` with an `h2` "Saved notes could not be read" and the text "The board was reset. A copy of the old data was kept in this browser." plus a "Dismiss" button (after Dismiss, focus moves to the "New note" heading, `tabindex="-1"`); the same text is announced politely 1 s after first render so screen readers do not miss it during page load. |
| Storage write fails | Error toast that stays: "Your last change could not be saved. Export your notes to keep a copy." |
| Unexpected render error | Top-level error boundary with an `h1` (`tabindex="-1"`, focused on mount), plain-language message, "Export notes" and "Reload" buttons. |

## 11. Accessibility design summary (traceability to section 5 of the requirements)

| Req. | Design |
|--|--|
| A-PE-1 Text alternatives | `Icon` is `aria-hidden` by default; icon-only buttons get `aria-label` with the label-in-name pattern (8.3); priority/overdue icons sit beside visible words; favicon/logo decorative. |
| A-PE-2 Time-based media | No media. Sounds optional, off by default, paired with text (8.12). |
| A-PE-3 Adaptable | Landmarks and heading levels (6); lists for notes/columns/chips; labels and `(required)`; DOM order = visual; reflow breakpoints (7.3); no orientation lock. |
| A-PE-4 Distinguishable | Tokens with verified contrast (7.1, test); non-colour cues (7.2); text spacing safe (7.3); tooltip rules (8.3); faded toolbar ≥ 3:1. |
| A-OP-1 Keyboard | Every feature has a keyboard path: native controls, menu pattern (8.5), keyboard drag (8.9), shortcuts (8.13); Escape exits every mode; no single-key shortcuts. |
| A-OP-2 Enough time | Toast timers pause/adjust/disable; errors stay; header Undo + Ctrl/Cmd+Z (8.10). |
| A-OP-3 Seizures/motion | ≤ 300 ms, no flashing, reduce-motion flag (7.7). |
| A-OP-4 Navigable | Skip links, landmarks, title, focus ring (7.4), focus manager (8.11), scroll padding for header/toasts, named scroll region. |
| A-OP-5 Input modalities | Non-drag alternatives (8.9); activation constraints; actions on click (pointer up); label in name; 44 px / 32 px targets (7.5). |
| A-UN-1 Readable | `lang="en"`, plain wording, full dates. |
| A-UN-2 Predictable | Selects never act on change (Move dialog); consistent header and toolbar order; settings apply without moving focus. |
| A-UN-3 Input assistance | Hints, inline errors with fixes, focus to first error, values kept, confirmations + Undo. |
| A-RO-1 Compatible | Native elements first; ARIA patterns for menu, disclosure, toggle, live regions; dnd-kit ARIA attributes not spread onto articles; axe-core in tests. |

## 12. Testing strategy (detailed in document 04)

| Level | Tool | Covers |
|--|--|--|
| Unit | Vitest | reducer, validation, import/export parsing, tags, dates, selectors, toast queue rules, contrast of all token pairs. |
| Component | Vitest + Testing Library + axe-core | each user story through the UI in jsdom; keyboard paths (menu, dialog, inline edit, keyboard drag, Move dialog); focus after actions; live region text; axe scan of the main states (empty, with notes, dialog open, menu open, error shown) in both themes. |
| End-to-end | Playwright (Chromium) | real pointer drag list → column, column → column, reorder, drop outside; persistence across reload; export download content; import valid/invalid file; reduced motion; forced colours; 320 px reflow; axe in a real browser; computed (rendered) colours of the faded toolbar, hover and focus states; announcements while a dialog is open; focus kept on the handle throughout keyboard drag; menu on the last card of a column not clipped. |
| Manual | checklist | NFR-9 screen reader and zoom checks. |

## 13. Review record

| Date | Reviewer | Result |
|--|--|--|
| 2026-11-02 | accessibility-reviewer, round 1 | Not accepted. B1 faded toolbar ~2.5:1 due to opacity → fade by colour token only, E2E computed-colour check (8.3). B2 live regions inert under modal → per-dialog live regions, announce after close (8.10). B3 focus after toast Undo → follows FR-22, decided in `undo()` (5.2, 8.10). B4 keyboard drag focus → original card stays mounted and focused, ghost inert, list-origin Left rule (8.9). B5 handle name/instructions → IconButton tooltip with short visible instructions, `.sr-only` description (6, 8.9). B6 visible inline-editor label, 2 px offset everywhere (8.4, 7.4). Suggestions taken: top-layer popovers for menus/tooltips, append-only announcer and one announcement per action, `noValidate` + polite summary, header `group` instead of `nav`, Ctrl/Cmd+Z ignored with dialog open and "No notifications" on F8, storage banner + delayed announcement, error-boundary focus, contextual toast Undo/visible Dismiss, removed tag-remove reference, extra E2E checks. |
| 2026-11-02 | accessibility-reviewer, round 2 | **Accepted.** B1–B6 and suggestions confirmed. Three optional consistency nits applied (8.9 single announcement, 8.13 shortcut note, banner Dismiss focus). |
