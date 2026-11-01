interface HelpContentProps {
  onClose: () => void;
}

export function HelpContent({ onClose }: HelpContentProps) {
  return (
    <>
      <h3>Getting started</h3>
      <ol className="help-list">
        <li>Fill in the Add a note form and press Add note.</li>
        <li>Find your note in the Notes list. Use Search notes if you have many.</li>
        <li>Put the note in a column on the board, using any of the ways below.</li>
        <li>Use Export notes to keep a copy in a file.</li>
      </ol>

      <h3>Three ways to move a note</h3>
      <ul className="help-list help-list-bullets">
        <li>
          <strong>Drag it.</strong> Drag the note onto a column.
        </li>
        <li>
          <strong>Use the menu.</strong> Choose a column on the note, then press Move.
        </li>
        <li>
          <strong>Use the keyboard.</strong> See the keys below.
        </li>
      </ul>

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
          <kbd>Arrow keys</kbd>
        </dt>
        <dd>Choose a column while holding a note.</dd>
        <dt>
          <kbd>Space</kbd> or <kbd>Enter</kbd> on Drop
        </dt>
        <dd>Drop the note in the chosen column.</dd>
        <dt>
          <kbd>Esc</kbd>
        </dt>
        <dd>Put the held note back, or close a window like this one.</dd>
      </dl>

      <h3>If something goes wrong</h3>
      <p>
        Press Undo at the top of the page to reverse your latest change. You can undo several changes in a row until you
        close or refresh this page.
      </p>
      <p>Your notes save automatically in this browser. There are no time limits on anything you do here.</p>

      <div className="button-row">
        <button type="button" className="button button-primary" onClick={onClose}>
          Close help
        </button>
      </div>
    </>
  );
}
