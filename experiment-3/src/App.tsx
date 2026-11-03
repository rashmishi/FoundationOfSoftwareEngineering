import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { DialogHost } from './components/DialogHost';
import { Header } from './components/Header';
import { DRAG_INSTRUCTIONS_ID } from './components/NoteCard';
import { NoteForm } from './components/NoteForm';
import { SearchBar } from './components/SearchBar';
import { focusNewestToast, ToastRegion } from './components/ToastRegion';
import { Workspace } from './components/Workspace';
import { AnnouncerProvider, useAnnouncer } from './state/AnnouncerContext';
import { BoardProvider, useBoard } from './state/BoardContext';
import { DialogProvider } from './state/DialogContext';
import { FilterProvider } from './state/FilterContext';
import { FocusProvider, useFocusManager } from './state/FocusContext';
import { focusKeys } from './state/focusKeys';
import { KeyboardMoveProvider } from './state/KeyboardMoveContext';
import { exportFileName } from './model/importExport';
import { BOARD_KEY } from './model/storage';
import { PreferencesProvider } from './state/PreferencesContext';
import { ToastProvider, useToasts } from './state/ToastContext';

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

function useGlobalShortcuts() {
  const { undo, lastUndo } = useBoard();
  const { regionRef } = useToasts();
  const { announce } = useAnnouncer();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dialogOpen = !!document.querySelector('dialog[open]');
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
        // Not while typing, and not behind an open dialog (FR-12.6).
        if (isEditable(e.target) || dialogOpen) return;
        e.preventDefault();
        if (lastUndo) undo('shortcut');
        else announce('Nothing to undo.');
      } else if (e.key === 'F8' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (dialogOpen) return;
        e.preventDefault();
        if (!focusNewestToast(regionRef.current)) announce('No notifications.');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, lastUndo, regionRef, announce]);
}

/** Shown when saved data could not be read at start-up (FR-3.3). */
function ResetBanner() {
  const { loadStatus } = useBoard();
  const { announce } = useAnnouncer();
  const { requestFocus } = useFocusManager();
  const [open, setOpen] = useState(loadStatus === 'reset');
  useEffect(() => {
    if (loadStatus !== 'reset') return;
    // Announce after the page has settled so screen readers do not miss it during load.
    const timer = window.setTimeout(
      () => announce('Saved notes could not be read, so the board was reset. A copy of the old data was kept in this browser.'),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [loadStatus, announce]);
  if (!open) return null;
  return (
    <section className="banner" aria-labelledby="reset-heading">
      <h2 id="reset-heading">Saved notes could not be read</h2>
      <p>The board was reset. A copy of the old data was kept in this browser.</p>
      <button
        type="button"
        className="button small"
        onClick={() => {
          setOpen(false);
          requestFocus(focusKeys.newNoteHeading);
        }}
      >
        Dismiss
      </button>
    </section>
  );
}

function Shell() {
  useGlobalShortcuts();
  return (
    <>
      <a className="skip-link" href="#board-heading" onClick={(e) => skipTo(e, 'board-heading')}>
        Skip to board
      </a>
      <a className="skip-link" href="#notes-heading" onClick={(e) => skipTo(e, 'notes-heading')}>
        Skip to notes
      </a>
      <Header />
      <main id="main">
        <ResetBanner />
        <NoteForm />
        <SearchBar />
        <Workspace />
        <div id={DRAG_INSTRUCTIONS_ID} className="sr-only">
          Press Space to pick up. Use Left and Right arrows to change column, Up and Down arrows to change position. Press
          Space to drop or Escape to cancel. Screen reader users can also use the Move to… button.
        </div>
      </main>
      <ToastRegion />
      <DialogHost />
    </>
  );
}

function skipTo(e: React.MouseEvent, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  target.focus();
  target.scrollIntoView?.({ block: 'start' });
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }
  render() {
    return this.state.failed ? <CrashScreen /> : this.props.children;
  }
}

/** Export straight from storage, since the app state is not available after a crash. */
function exportRaw() {
  let data = '';
  try {
    data = localStorage.getItem(BOARD_KEY) ?? '';
  } catch {
    // nothing to export
  }
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName();
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CrashScreen() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <main className="crash">
      <h1 ref={ref} tabIndex={-1}>Something went wrong</h1>
      <p>The page stopped working. Your notes are still saved in this browser. Export them to keep a copy, then reload the page.</p>
      <div className="crash-actions">
        <button type="button" className="button" onClick={exportRaw}>
          Export notes
        </button>
        <button type="button" className="button primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </main>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PreferencesProvider>
      <AnnouncerProvider>
        <FocusProvider>
          <ToastProvider>
            <BoardProvider>
              <FilterProvider>
                <DialogProvider>
                  <KeyboardMoveProvider>{children}</KeyboardMoveProvider>
                </DialogProvider>
              </FilterProvider>
            </BoardProvider>
          </ToastProvider>
        </FocusProvider>
      </AnnouncerProvider>
    </PreferencesProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <Shell />
      </Providers>
    </ErrorBoundary>
  );
}
