export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  text: string;
  kind: ToastKind;
  /** Set when the toast offers Undo for this undo entry. */
  undoId?: string;
  visible: boolean;
}

/**
 * Show queued toasts while there is room. When a toast is waiting and every slot is taken, remove the
 * oldest visible toast that is neither an error nor focused; protected toasts are never removed (FR-12.8).
 */
export function settle(list: Toast[], maxVisible: number, focusedId: string | null): Toast[] {
  let result = [...list];
  const visibleCount = () => result.filter((t) => t.visible).length;
  while (result.some((t) => !t.visible) && visibleCount() >= maxVisible) {
    const evict = result.find((t) => t.visible && t.kind !== 'error' && t.id !== focusedId);
    if (!evict) break;
    result = result.filter((t) => t !== evict);
  }
  for (let i = 0; i < result.length && visibleCount() < maxVisible; i++) {
    if (!result[i].visible) result[i] = { ...result[i], visible: true };
  }
  return result;
}

export function addToast(list: Toast[], toast: Omit<Toast, 'visible'>, maxVisible: number, focusedId: string | null): Toast[] {
  // Only the latest action can be undone, so older Undo toasts go (unless the user is in one).
  const kept = toast.undoId ? list.filter((t) => !t.undoId || t.id === focusedId) : list;
  return settle([...kept, { ...toast, visible: false }], maxVisible, focusedId);
}

export function removeToast(list: Toast[], id: string, maxVisible: number, focusedId: string | null): Toast[] {
  return settle(list.filter((t) => t.id !== id), maxVisible, focusedId);
}
