import { vi } from 'vitest';

if (typeof document !== 'undefined') {
  if (typeof document.queryCommandSupported !== 'function') {
    Object.defineProperty(document, 'queryCommandSupported', {
      configurable: true,
      value: vi.fn(() => true),
    });
  }

  if (typeof document.queryCommandEnabled !== 'function') {
    Object.defineProperty(document, 'queryCommandEnabled', {
      configurable: true,
      value: vi.fn(() => true),
    });
  }
}
