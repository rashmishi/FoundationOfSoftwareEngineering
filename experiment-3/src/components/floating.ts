type PopoverElement = HTMLElement & { showPopover?: () => void; hidePopover?: () => void };

/** Show an element in the top layer (Popover API) so the board's scroll region can never clip it. */
export function showFloating(el: HTMLElement): void {
  const p = el as PopoverElement;
  try {
    if (typeof p.showPopover === 'function' && !p.matches(':popover-open')) p.showPopover();
  } catch {
    // Fallback: the element is position: fixed in CSS.
  }
}

export function hideFloating(el: HTMLElement | null): void {
  const p = el as PopoverElement | null;
  try {
    if (p && typeof p.hidePopover === 'function' && p.matches(':popover-open')) p.hidePopover();
  } catch {
    // ignore
  }
}

/**
 * Place a floating element next to its anchor with fixed coordinates, flipping to the other side
 * and clamping so it stays inside the viewport.
 */
export function positionFloating(el: HTMLElement, anchor: HTMLElement, prefer: 'above' | 'below'): void {
  const gap = 6;
  const a = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const roomAbove = a.top - gap;
  const roomBelow = vh - a.bottom - gap;
  const above = prefer === 'above' ? roomAbove >= h || roomAbove > roomBelow : !(roomBelow >= h || roomBelow > roomAbove);
  let top = above ? a.top - gap - h : a.bottom + gap;
  top = Math.max(4, Math.min(top, vh - h - 4));
  let left = prefer === 'above' ? a.left + a.width / 2 - w / 2 : a.right - w;
  left = Math.max(4, Math.min(left, vw - w - 4));
  el.style.top = `${Math.round(top)}px`;
  el.style.left = `${Math.round(left)}px`;
}
