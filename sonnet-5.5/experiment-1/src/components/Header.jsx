import { useRef } from 'react';
import Icon from './Icon.jsx';

export default function Header({ actions, dark, soundOn }) {
  const fileRef = useRef(null);
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="board" size={20} />
        </span>
        <h1>Notes Kanban</h1>
      </div>

      <div className="topbar-actions">
        <button type="button" className="btn btn-primary" onClick={() => actions.openCreate()}>
          <Icon name="plus" size={16} /> New note
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={16} /> Import
        </button>
        <button type="button" className="btn" onClick={actions.exportNotes}>
          <Icon name="download" size={16} /> Export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="vh"
          tabIndex={-1}
          aria-label="Import notes from a JSON file"
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // lets the same file be chosen again
            if (file) actions.importFile(file);
          }}
        />
        <span className="divider" aria-hidden="true" />
        <button
          type="button"
          className="icon-btn"
          aria-pressed={soundOn}
          aria-label="Sound effects"
          title={soundOn ? 'Sound effects on' : 'Sound effects off'}
          onClick={actions.toggleSound}
        >
          <Icon name={soundOn ? 'volumeOn' : 'volumeOff'} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={dark}
          aria-label="Dark mode"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={actions.toggleTheme}
        >
          <Icon name={dark ? 'moon' : 'sun'} />
        </button>
      </div>
    </header>
  );
}
