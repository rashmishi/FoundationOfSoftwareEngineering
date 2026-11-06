# Luna Notes — Architecture & Design

## 1. System shape

Luna Notes is a single-page React application compiled by Vite and served as static assets by Nginx. The browser is the system of record: application state is serialized to `localStorage` under one versioned key. Import/export operates on the same persisted shape.

```text
Browser
  └── React UI
      ├── App shell + toolbar
      ├── Note list + filters
      ├── Kanban board + columns
      ├── Modal / toast / menu primitives
      └── useNotesStore (state + actions)
            └── localStorage adapter
```

## 2. Technology choices

- React 18 with TypeScript for component composition and typed state.
- Vite for fast development and production bundling.
- Native HTML drag-and-drop plus keyboard/touch move actions; no pointer-only dependency.
- CSS modules are unnecessary at this scale; one readable stylesheet with CSS custom properties supports light/dark themes and reduced motion.
- Vitest + React Testing Library for deterministic component/store tests.
- Nginx Alpine for the production image.

## 3. State model

`AppState` contains `notes`, `columns`, `theme`, and `soundEnabled`. `useNotesStore` owns all mutations and persists a sanitized snapshot after every mutation. The store exposes:

- `addNote`, `updateNote`, `deleteNote`, `restoreNote`
- `moveNote(noteId, columnId, order)` and `reorderNote`
- `addColumn`, `toggleColumn`
- `importPayload`, `exportPayload`
- `setTheme`, `setSoundEnabled`

All mutations are immutable. A note's `order` is normalized within its column after moves/deletes. Unknown imported fields are ignored; invalid required fields reject the whole import before persistence.

## 4. Component architecture

- `App`: layout, global live regions, modal/toast state, keyboard handlers.
- `Toolbar`: search, filters, create/import/export, theme/sound actions.
- `NoteComposer`: create form with title validation.
- `NoteList`: filtered list, result count, empty state.
- `NoteCard`: note display, inline title edit, hover/focus action toolbar, drag source.
- `KanbanBoard`: board region and column creation.
- `KanbanColumn`: collapse state, drop target, note ordering, column menu.
- `NoteDialog`: edit form and delete confirmation variants.
- `ToastRegion`: persistent actionable toasts with explicit dismiss/undo, ordered newest-first without stealing focus; each toast is reachable in normal Tab order until dismissed or undone.

## 5. Interaction design

The primary visual hierarchy is a compact toolbar, a two-pane workspace (note list and board), and high-contrast cards. Priority uses colour plus a text badge. Tags use tinted chips plus text. Cards animate when moved, but `@media (prefers-reduced-motion: reduce)` removes transitions.

Pointer drag uses `dragstart`, `dragover`, `drop`, and `dragend`. `dragend` leaves state unchanged unless a column accepted the drop. The keyboard/touch “Move to…” action uses a dialog with a destination select and position input, then dispatches the same store action.

Dialogs use native `<dialog>` when available with a controlled fallback, `aria-modal`, labelled headings, a true focus trap in the fallback, focus capture/restore, Escape close, and inert background. If the trigger is deleted, focus returns to the nearest surviving note/column control or the main heading. The Move dialog states the current column and position, provides a destination and position, and announces cancellation or completion while preserving focus on the moved note. Menus use semantic buttons and lists rather than a complex ARIA menu where possible; if `role="menu"` is used, Arrow/Home/End behavior is implemented.

## 6. Persistence and import contract

```ts
const STORAGE_KEY = 'luna-notes-state-v1';
type AppState = {
  notes: Note[];
  columns: BoardColumn[];
  theme: 'light' | 'dark';
  soundEnabled: boolean;
};
```

On startup, parse and validate storage. If parsing fails, initialize safe defaults and report a non-blocking error. Export emits `{ format: 'luna-notes', version: 1, exportedAt, columns, notes }`. Import validates format/version, columns, note IDs, required strings, dates, priorities, column references, and finite ordering before replacing state.

## 7. Accessibility design

- Skip link targets `main`; landmarks and headings are labelled.
- All inputs have visible labels and errors connect through `aria-describedby`.
- `aria-live="polite"` status and `role="alert"` error regions report mutations. Polite status messages cover create/edit/delete/import/export, undo availability, column moves, reorder completion, search/filter result counts, empty-state changes, and collapse/expand state. Assertive alerts cover validation, invalid imports, and storage failures.
- Icon-only controls have accessible names and are visible on focus, not only hover.
- Focus-visible outlines use a 3:1 contrasting colour, are at least 2 CSS pixels thick/area, and are never removed in either theme.
- Every drag interaction has a keyboard/touch equivalent.
- Actionable toasts persist until dismissed/undone.
- Touch controls meet the requirements in the requirements artifact; zoom/reflow is tested at 320px and 200%.
- Toast actions never steal focus when they appear; keyboard users can reach Undo and Dismiss in normal order and multiple toasts have unique labels.

### Accessibility verification strategy

Automated tests cover labelled controls, landmark/heading structure, `aria-invalid`/`aria-describedby`, live-region text, dialog focus return, Escape handling, menu key navigation, keyboard Move, and reduced-motion class behavior. `axe-core` runs against key rendered states. Manual checks cover keyboard-only workflows, Chrome Accessibility Tree, NVDA on Windows, VoiceOver on macOS/iOS, 200% zoom, 320px reflow, touch target sizing, and contrast in both themes. Each requirement is a pass/fail test in the final testing artifact.

## 8. Security and resilience

No HTML from user input is rendered; React escapes all note content. Imported JSON is treated as untrusted data and constrained by schema validation. Blob URLs used for export are revoked after download. Storage quota failures produce an alert without losing the in-memory state.

## 9. Delivery topology

Development runs `npm run dev`. Production runs `npm run build`, then copies `dist` into an Nginx image with SPA fallback. The image exposes port 80 and has a health check against `/`.

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Browser storage is cleared | Export is prominent; import restores a complete snapshot. |
| Drag API is inconsistent on touch | Keyboard/touch Move dialog is a first-class action. |
| Large note sets make filtering slow | Derive filtered data with memoization; keep DOM content simple. |
| Accidental deletion | Confirmation dialog plus persistent Undo toast. |
| Motion harms some users | Reduced-motion media query removes non-essential animation. |
