import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// jsdom does not implement the modal dialog API; emulate what the app relies on.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
}
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, value?: string) {
  if (!this.open) return;
  if (value !== undefined) this.returnValue = value;
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
};

// axe-core probes canvas for icon-ligature detection; jsdom has no canvas.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());
