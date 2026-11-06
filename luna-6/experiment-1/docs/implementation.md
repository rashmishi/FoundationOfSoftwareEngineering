# Folio Notes & Board — Implementation Record

## 1. Delivered application
This repository contains a working React single-page application built with Vite. The interface is organized as a persistent workspace sidebar, a board header and toolbar, and configurable Kanban columns containing draggable note cards.

## 2. Feature map

| Capability | Implementation |
| --- | --- |
| Create/edit notes | Modal form with required title, description, comma-separated tags, priority, due date |
| Delete and undo | Confirmation modal followed by timed toast with Undo |
| List and board | Responsive columns with cards displaying note content and metadata |
| Drag/reorder | Native drag-and-drop onto a column to append or onto a card to position |
| Column controls | Add, rename, collapse, and delete from column menu |
| Inline title | Double-click card title, then Enter or blur to save; Escape cancels |
| Search and filters | Live title/description/tag search; All, High priority, Overdue filters |
| JSON portability | Download full board and validate imported envelope or note array |
| Persistence | `localStorage` keys for notes, columns, and dark mode |
| Visual details | Light/dark palettes, priority and tag colours, due date warning, hover actions, responsive layout, transitions |
| Container | Multi-stage Node build and Nginx static runtime image |

## 3. Main files
- `src/main.jsx` — React entry point, app state, note and column operations, import/export, UI composition.
- `src/styles.css` — theme variables, component styling, transitions, and mobile layout.
- `index.html` — browser entry page and metadata.
- `package.json` — development and build commands and runtime dependencies.
- `Dockerfile`, `.dockerignore` — production image definition.

## 4. Important behavior choices
- New notes begin in the first existing column.
- Import replaces the current note list. When a valid export includes columns, those replace current columns too.
- Imported records with missing tags, invalid priorities, or unknown column references receive safe defaults.
- Deleting a column transfers its notes to the first surviving column.
- A deletion undo is available until its toast disappears (3.6 seconds).
- Note data is stored only in the current browser origin; JSON export is the backup route.

## 5. Known limitations
- Sound effects were not included. The UI has no sound dependency or audio behavior.
- Persistence is local to a browser profile and does not synchronize between users/devices.
- There is no keyboard-based drag alternative; cards support mouse/touchpad HTML drag interactions.
- Fonts request Google Fonts at runtime with local generic fallbacks.
