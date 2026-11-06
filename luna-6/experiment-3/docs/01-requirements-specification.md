# Requirements Specification

## Product

A browser based personal notes workspace. Users manage notes in a searchable list and a configurable Kanban board. Notes and board settings persist in the browser and can be moved between installations through JSON export and import.

## Actors and assumptions

- A single local user operates the application in a modern browser.
- No account or server database is required. `localStorage` is the durable store for this single browser profile.
- The application is served as static assets from a Docker image; local and remote deployments use the same image.
- Imported data is validated completely before replacing existing data.

## Functional requirements

### Notes
- Create a note with required title and optional description, tags, priority, and due date.
- Reject a blank title and explain the correction inline.
- Show title, description, tags, priority, and due date in the note list and board.
- Edit note fields, edit the title inline, and delete after confirmation.
- Provide undo for reversible create, edit, move, and delete actions while the toast is available.
- Persist notes across refreshes.

### Organization
- Start with the columns **Backlog**, **In progress**, and **Done**.
- Add named columns, rename/delete columns using a confirmation flow, collapse and expand columns.
- Drag notes from the unassigned list onto columns, move them between columns, and reorder within a column. Dropping outside a valid target does not alter the assignment.
- Provide keyboard controls as an alternative to dragging. Announce moves and expose clear move actions.
- Persist column definitions, assignments, and ordering across refreshes.

### Search and appearance
- Search live across note title, description, and tags; filter by tag, priority, status, and overdue state.
- Use distinct, text-labeled priority levels and tag colors that remain distinguishable in both themes.
- Offer light and dark themes and remember the preference.
- Respect reduced-motion preferences. Optional sound effects are user-controlled and default off.
- Use brief transitions without flashing or blocking interaction.

### Data transfer
- Export all notes and board columns to a valid, versioned JSON file.
- Import a valid exported file, validate its schema and all values before applying it, and preserve the imported data.
- Reject malformed or unsupported files without changing current data; show an accessible error.

### Feedback and dialogs
- Provide auto-dismissing status toasts with an Undo action where applicable; announce updates to assistive technology.
- Use accessible modal dialogs for editing and destructive confirmation, including focus management and Escape handling.
- Provide an icon-only hover toolbar on note cards, with accessible names, keyboard focus visibility, and equivalent keyboard access.
- Provide “More actions” menus for notes and columns with accessible state and keyboard operation.

### Delivery
- Users access the application through a web browser.
- Build and run the app from a single Docker image. The image serves static assets and supports a configurable listening port.

## Quality requirements

- Semantic landmarks, headings, lists, labels, accessible names, status announcements, and visible focus indicators.
- All functionality works using keyboard alone; drag and drop has a non-drag alternative.
- Responsive layout supports narrow viewports and browser zoom.
- Persistent state survives refresh. Invalid imports and failed storage writes provide useful feedback.
- No backend, telemetry, or external runtime dependency is required.

## Acceptance criteria

1. A user can create a titled note, optionally fill every supported field, and find it in the list; blank titles are rejected with an inline message.
2. Create, edit, delete, assignment, and ordering changes survive refresh. Deleted notes remain deleted after refresh.
3. Search and filters update results as the user types or changes a filter.
4. JSON export parses and contains all notes and columns. Importing an export restores data; invalid input is rejected atomically.
5. Notes can move from the list to a column and among columns by pointer or keyboard; invalid drops preserve the original position.
6. Users can add columns and manage notes and columns through dialogs and menus.
7. Theme preference persists; reduced-motion and disabled-sound preferences are respected.
8. The Docker image builds and serves the application from a browser.
9. Accessibility review finds no unresolved WCAG-oriented usability barriers in the specification or implementation artifacts.
