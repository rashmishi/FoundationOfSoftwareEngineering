import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { newId } from '../model/ids';
import { addToast, removeToast, settle, type Toast, type ToastKind } from '../model/toastQueue';
import { useAnnouncer } from './AnnouncerContext';

interface ToastValue {
  toasts: Toast[];
  notify: (toast: { text: string; kind?: ToastKind; undoId?: string }) => string;
  dismiss: (id: string) => void;
  setFocusedId: (id: string | null) => void;
  regionRef: RefObject<HTMLDivElement>;
  /** The element that had focus before focus went into the notifications region. */
  returnTarget: () => HTMLElement | null;
}

const ToastContext = createContext<ToastValue | null>(null);

const SMALL_VIEWPORT = 500;

function maxVisibleFor(height: number): number {
  return height < SMALL_VIEWPORT ? 1 : 3;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { announce } = useAnnouncer();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [maxVisible, setMaxVisible] = useState(() => maxVisibleFor(window.innerHeight));
  const focusedId = useRef<string | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const lastOutside = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onResize = () => setMaxVisible(maxVisibleFor(window.innerHeight));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setToasts((list) => settle(list, maxVisible, focusedId.current));
  }, [maxVisible]);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLElement && !regionRef.current?.contains(target)) lastOutside.current = target;
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  const notify = useCallback<ToastValue['notify']>(({ text, kind = 'success', undoId }) => {
    // Announce at once, whether the toast is shown now or queued (FR-12.8).
    announce(text, kind === 'error' ? 'assertive' : 'polite');
    const id = newId('toast');
    setToasts((list) => addToast(list, { id, text, kind, undoId }, maxVisible, focusedId.current));
    return id;
  }, [announce, maxVisible]);

  const dismiss = useCallback((id: string) => {
    if (focusedId.current === id) focusedId.current = null;
    setToasts((list) => removeToast(list, id, maxVisible, focusedId.current));
  }, [maxVisible]);

  const setFocusedId = useCallback((id: string | null) => {
    focusedId.current = id;
  }, []);

  const returnTarget = useCallback(() => {
    const el = lastOutside.current;
    return el && el.isConnected && el !== document.body ? el : null;
  }, []);

  const value = useMemo(
    () => ({ toasts, notify, dismiss, setFocusedId, regionRef, returnTarget }),
    [toasts, notify, dismiss, setFocusedId, returnTarget],
  );
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToasts(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToasts outside ToastProvider');
  return value;
}
