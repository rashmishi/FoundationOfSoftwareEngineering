# NoteFlow

Accessible React notes and Kanban application. Data is stored in the browser's local storage and can be exported/imported as JSON.

## Run locally

`npm install && npm run dev`

## Docker

`docker build -t noteflow . && docker run --rm -p 8080:80 noteflow`

Open `http://localhost:8080`.

## Accessibility

The interface uses semantic regions, labelled controls, high-contrast visible focus indicators, status announcements, validation errors, confirmation before deletion, responsive layout, and keyboard-accessible move menus alongside drag and drop.
