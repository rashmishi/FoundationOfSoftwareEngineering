import { useRef, type ChangeEvent } from 'react';
import type { Settings } from '../lib/settings';
import { BoardIcon, DownloadIcon, MoonIcon, SoundOffIcon, SoundOnIcon, SunIcon, UploadIcon } from './Icons';

interface HeaderProps {
  settings: Settings;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Header({ settings, onToggleTheme, onToggleSound, onExport, onImport }: HeaderProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const dark = settings.theme === 'dark';

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImport(file);
  };

  return (
    <header className="app-header">
      <div className="brand">
        <BoardIcon />
        <h1>Notes Kanban</h1>
      </div>
      <div className="header-actions">
        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          <UploadIcon /> Import
        </button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onFile} data-testid="import-file" />
        <button type="button" className="button" onClick={onExport}>
          <DownloadIcon /> Export
        </button>
        <button
          type="button"
          className="icon-button header-toggle"
          aria-pressed={settings.sound}
          aria-label="Sound effects"
          title={settings.sound ? 'Mute sound effects' : 'Turn on sound effects'}
          onClick={onToggleSound}
        >
          {settings.sound ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button
          type="button"
          className="icon-button header-toggle"
          aria-pressed={dark}
          aria-label="Dark mode"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        >
          {dark ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
    </header>
  );
}
