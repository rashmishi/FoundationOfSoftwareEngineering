Build a simple web application that implements the user stories and acceptance conditions below.

Requirements:
- Use React for the front end.
- Package the application so it can be deployed with a single Docker image.

Accessibility:
- The application must be accessible to people with disabilities. Follow the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA throughout requirements, design and implementation.

User stories and acceptance conditions:
- As a user, I want to be able to create notes and give them a title, description, and tags.
  - While viewing the application, when I create a new note and provide a title, the note is created successfully.
  - While creating a note, when I enter a title, description, and one or more tags, then all entered values are saved with the note.
  - While creating a note, when I attempt to save without a title, then the note is not saved.
  - When a note is created, then it appears in the note list, and a validation message is displayed.
  - For an existing note, when I refresh the application, the note details remain available.
- As a user, I want to be able to view and manage my notes in a list.
  - When I view the note list, all existing notes are displayed.
  - For an existing note, its title, description, and tags are shown.
  - When I edit a note’s details, the changes are saved and displayed in the list.
  - When I delete a note it is removed from the list.
  - If a node has been deleted, when I refresh the application, the deleted note is not displayed.
- As a user, I should be able to download and upload the note list as a JSON file.
  - When I export notes as a file, a valid JSON file containing all existing notes is downloaded.
  - Given a JSON file exported from the application, when I import the file, then all notes contained in the file are loaded into the application and their data is preserved.
  - Given an invalid JSON file, an attempted import is rejected and an error message is displayed.
  - Given notes have been imported successfully, when I refresh the application, the imported notes are preserved.
- As a user, I want to be able to drag notes from the list into a Kanban-style board.
  - When I drag a note from the note list onto a Kanban column, the note appears in that column.
  - Given a note in a Kanban column, when I begin dragging the note, the application provides visual feedback.
  - Given a Kanban column, when a note is dropped onto the column, the note is assigned to that column.
  - When the application is refreshed, all notes remain assigned to their columns.
  - When a note is dropped outside a column, the note remains in its original column.
- As a user, I should be able to create new kanban board columns and move the notes between them.
  - When I create a new column and provide a name, the new column is added to the board.
  - When a note is dragged from one Kanban column to another, the note is removed from the original column and is added to the new column.
- As a user, I want to be able to access the application through my web browser.
- As a system administrator, I want to be able to deploy the application to a local or remote system using a single docker image.
