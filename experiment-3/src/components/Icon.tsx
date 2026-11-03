export type IconName =
  | 'edit' | 'move' | 'trash' | 'more' | 'grip' | 'chevron-down' | 'chevron-right' | 'warning' | 'check'
  | 'info' | 'error' | 'undo' | 'download' | 'upload' | 'help' | 'settings' | 'close' | 'plus' | 'calendar'
  | 'bars1' | 'bars2' | 'bars3';

const PATHS: Record<IconName, string> = {
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  move: 'M5 12h14M13 6l6 6-6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  warning: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  check: 'M5 12l5 5 9-10',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7h.01',
  error: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v6M12 16h.01',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2-1-1-3-2 .3-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.5 2.3L6 8.8 4 8.5 3 11.5l2 .5v2l-2 1 1 3 2-.3 1.5 1.5L7 21l3 1 1-2h2l1 2 3-1-.5-2.3 1.5-1.5 2 .3 1-3-2-.5z',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  bars1: 'M5 18v-4',
  bars2: 'M5 18v-4M11 18v-8',
  bars3: 'M5 18v-4M11 18v-8M17 18V6',
};

/** Inline SVG icon. Decorative by default: hidden from assistive technology (A-PE-1). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' || name === 'grip' ? 3.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
