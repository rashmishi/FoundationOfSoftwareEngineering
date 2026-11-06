# Luna Notes — Requirements Specification

## 1. Product scope

Luna Notes is a browser-based, local-first note manager. Users can create, edit, search, filter, organize, import, and export notes. Notes can be placed on a configurable Kanban board and remain available after refresh. The application is packaged as one Docker image and does not require a server-side database.

## 2. Personas and primary outcomes

- **Note taker:** quickly captures a titled note with optional description and tags.
- **Organizer:** views, searches, filters, edits, deletes, and prioritizes notes.
- **Planner:** arranges notes into custom Kanban columns and reorders them.
- **Administrator:** runs the same image locally or on a remote container host.

## 3. Functional requirements

### Notes

1. A user can create a note with a required title, optional description, zero or more tags, a priority, and an optional due date.
2. A blank or whitespace-only title prevents saving and presents an inline validation message.
3. On successful creation, the note appears in the list and a success toast confirms the action.
4. A user can edit title, description, tags, priority, and due date. Title editing is available inline; the full form is available in an edit modal.
5. A user can delete a note after confirmation. Deletion is undoable from the auto-dismissing toast.
6. Notes are persisted in `localStorage`; refresh preserves notes and all note fields.
7. Notes display title, description, tags, priority, due-date status, and icon-only hover actions with accessible labels.

### Search and filtering

1. Search updates live across title, description, and tags.
2. Users can filter by priority and due-date state.
3. Empty states explain whether no notes exist or no notes match the active filters.

### Import and export

1. Export downloads a valid JSON document containing version metadata, columns, and all notes.
2. Import accepts an exported JSON document, validates its schema, replaces the current local dataset only after validation succeeds, and shows a success toast.
3. Invalid JSON or invalid schema is rejected without changing existing data and displays an error message.
4. Imported notes and their board assignments persist after refresh.

### Kanban board

1. Notes can be dragged from the list into any column.
2. Notes can be dragged from one column to another and are removed from the source column.
3. A note dropped outside a column keeps its original column and order.
4. Notes can be reordered within a column.
5. Users can create a column with a required name.
6. Columns can collapse/expand and expose a “More actions” menu.
7. Dragging provides visual feedback and has a keyboard-accessible move alternative via the note actions menu.
8. Column assignments and ordering persist after refresh.

### Preferences and feedback

1. Users can toggle dark mode; the preference persists.
2. Priority levels and tags are colour-coded, with text labels retained for non-colour users.
3. Toast notifications auto-dismiss and provide Undo where an undo operation is meaningful.
4. Optional sound effects are muted by default and can be enabled from the toolbar.
5. Transitions and animations respect `prefers-reduced-motion`.

## 4. Acceptance criteria

The implementation is accepted when all user stories in the brief are demonstrably supported, the automated tests pass, refresh persistence works for notes/columns/preferences, import validation is non-destructive, the application builds into a runnable Docker image, and the accessibility checks below pass.

## 5. Accessibility requirements

- Use semantic landmarks, headings, lists, forms, buttons, and dialogs.
- Every control has an accessible name; icon-only controls use visible-on-focus tooltips or `aria-label`.
- Keyboard users can create/edit/delete notes, operate menus/dialogs, move notes between columns, and reorder notes without a pointer.
- Focus is moved into dialogs and returned to the triggering control on close.
- Status and validation messages are announced with `role="status"`/`role="alert"`.
- Colour is never the sole indicator; contrast must meet WCAG 2.2 AA targets.
- Drag-and-drop is an enhancement, not the only interaction path.
- Reduced-motion preferences disable non-essential motion.

### Accessibility acceptance checks (WCAG 2.2 AA)

These are pass/fail checks to be run manually and with automated tooling at desktop and mobile widths:

- **Keyboard and focus (2.1.1, 2.4.3, 2.4.7, 2.4.11):** with a pointer disconnected, Tab reaches search, filters, create/import/export/theme/sound controls, every note action, every column action, and the keyboard move action in a logical order; Enter/Space activates controls; visible focus has at least a 2 CSS-pixel indicator with 3:1 contrast; no focus is trapped outside an open dialog.
- **Dialogs and menus (1.3.1, 2.1.1, 4.1.2):** edit/delete dialogs use `role="dialog"` and `aria-modal="true"`, have an accessible name, move focus inside on open, close with Escape or an explicit close button, return focus to the trigger, and keep background content inert. Menus open from keyboard, expose menu-item roles/names, support ArrowUp/ArrowDown plus Home/End navigation, and close on Escape or selection.
- **Forms and errors (1.3.1, 3.3.1, 3.3.2, 4.1.2):** every input has a visible label; required title is marked programmatically; failed save sets `aria-invalid`, associates a persistent error with the field via `aria-describedby`, and moves focus to the invalid field without clearing valid entries.
- **Announcements (4.1.3):** create/edit/delete/import/export, validation failures, column moves, reorder completion, and undo availability are announced in a named `role="status"` live region; errors use `role="alert"`; toast actions are buttons reachable before dismissal and actionable toasts remain until dismissed or undone, with a visible dismiss button.
- **Drag and reorder alternative (2.1.1, 2.5.7):** each note has a keyboard/touch “Move to…” action. It announces the current column, destination, and final position, preserves focus on the moved note, and supports cancellation without changing state. Pointer dragging shows a visible drag state but is not required for success.
- **Colour, contrast, and non-colour cues (1.4.1, 1.4.3, 1.4.11):** normal text is at least 4.5:1, large text 3:1, controls/focus/borders 3:1 against adjacent colours, in both themes; priority and tags include readable text, not colour alone; disabled states remain distinguishable.
- **Reflow and touch (1.4.4, 1.4.10, 2.5.8):** at 200% text zoom and 320 CSS-pixel viewport width there is no loss of content or two-dimensional scrolling; all touch targets are at least 24×24 CSS pixels and targets smaller than 24×24 have at least 24 CSS pixels of space between them, per WCAG 2.5.8; hover-only actions are also visible on focus and available on touch.
- **Motion (2.3.3):** when `prefers-reduced-motion: reduce` is active, non-essential animation and transitions are disabled and no interaction depends on motion.
- **Dynamic content:** empty states, search/filter result counts, column collapse state, import errors, and export success expose meaningful text to assistive technology and do not move focus unexpectedly.
- **Structure (1.3.1, 2.4.1, 2.4.6):** automated and manual inspection finds one descriptive `h1`, a skip link, `header`/`main`/`nav`/`section` landmarks with accessible names where needed, a labelled notes list and labelled Kanban region, and correctly associated labels/inputs without duplicate or empty headings.

## 6. Data contract

```ts
type Priority = 'low' | 'medium' | 'high';

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

type BoardColumn = { id: string; name: string; collapsed: boolean; order: number };

type ExportPayload = {
  format: 'luna-notes';
  version: 1;
  exportedAt: string;
  columns: BoardColumn[];
  notes: Note[];
};
```

## 7. Non-functional requirements

- Responsive layout from mobile widths through desktop.
- Local-first operation with no network dependency after the bundle is loaded.
- Vite production build and single-stage static Nginx Docker image.
- Browser support: current Chrome, Edge, Firefox, and Safari.
- No user content is sent to a remote service.

## 8. Out of scope

Accounts, collaboration, server synchronization, rich-text editing, attachments, and multi-device conflict resolution are not required for this release.
