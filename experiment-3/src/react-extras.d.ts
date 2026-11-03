import 'react';

declare module 'react' {
  interface HTMLAttributes<T> {
    /** Popover API (top layer). */
    popover?: 'auto' | 'manual' | '';
    /** React 18 passes this through as an attribute; use "" to set it. */
    inert?: '' | undefined;
  }
}
