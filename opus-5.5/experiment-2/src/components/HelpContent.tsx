interface HelpContentProps {
  onClose: () => void;
}

export function HelpContent({ onClose }: HelpContentProps) {
  return (
    <>
      <h3>Getting started</h3>
      <ol className="help-list">
        <li>Fill in the Add a note form and press Add note. Priority and due date are optional.</li>
        <li>Find your note in the Notes list. Use Search notes and Filters if you have many.</li>
        <li>Put the note in a column on the board, using any of the ways below.</li>
        <li>Use Export notes to keep a copy in a file.</li>
      </ol>

      <h3>Three ways to move a note</h3>
      <ul className="help-list help-list-bullets">
        <li>
          <strong>Drag it.</strong> Drag the note onto a column, or between two notes to put it in that place.
        </li>
        <li>
          <strong>Use the menus.</strong> Choose a column on the note and press Move. To change the order, open More
          actions on the note and choose Move up, Move down, Move to top or Move to bottom.
        </li>
        <li>
          <strong>Use the keyboard.</strong> See the keys below.
        </li>
      </ul>

      <h3>Note buttons</h3>
      <p>
        Each note has buttons for Edit, Delete, Pick up and More actions. They appear when you point at a note or move
        to it with the keyboard. To see them all the time, choose Always show under Note buttons in Display settings.
      </p>
      <p>To rename a note, choose Rename in More actions, or double-click its title.</p>

      <h3>Keyboard keys</h3>
      <dl className="help-keys">
        <dt>
          <kbd>Tab</kbd> and <kbd>Shift</kbd> + <kbd>Tab</kbd>
        </dt>
        <dd>Go to the next or previous control.</dd>
        <dt>
          <kbd>Space</kbd> or <kbd>Enter</kbd> on Pick up
        </dt>
        <dd>Pick up the note.</dd>
        <dt>
          <kbd>Left</kbd> and <kbd>Right</kbd> arrows
        </dt>
        <dd>Choose a column while holding a note.</dd>
        <dt>
          <kbd>Up</kbd> and <kbd>Down</kbd> arrows
        </dt>
        <dd>Choose a place within the column while holding a note. In a menu, go to the next or previous item.</dd>
        <dt>
          <kbd>Space</kbd> or <kbd>Enter</kbd> on Drop
        </dt>
        <dd>Drop the note in the chosen place.</dd>
        <dt>
          <kbd>Esc</kbd>
        </dt>
        <dd>Put the held note back, close a menu, cancel renaming, or close a window like this one.</dd>
      </dl>

      <h3>Messages, sound and animation</h3>
      <p>
        Messages hide after 10 seconds, but not while you point at them or move to them. Error messages stay until you
        dismiss them. To keep every message, or to turn on sound effects or switch animation off, use Display settings.
      </p>

      <h3>If something goes wrong</h3>
      <p>
        Press Undo at the top of the page to reverse your latest change. You can undo several changes in a row until you
        close or refresh this page.
      </p>
      <p>Your notes save automatically in this browser.</p>

      <div className="button-row">
        <button type="button" className="button button-primary" onClick={onClose}>
          Close help
        </button>
      </div>
    </>
  );
}
