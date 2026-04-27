import { afterEach, describe, expect, it } from 'vitest';
import { buildApiUrl, getApiBaseUrl } from './api-client';

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

afterEach(() => {
  delete (window as TauriWindow).__TAURI_INTERNALS__;
});

describe('api-client runtime URLs', () => {
  it('uses the Vite proxy base URL in the browser', () => {
    expect(getApiBaseUrl()).toBe('/api');
  });

  it('uses the local sidecar URL in Tauri', () => {
    (window as TauriWindow).__TAURI_INTERNALS__ = {};
    expect(getApiBaseUrl()).toBe('http://127.0.0.1:3210');
  });

  it('builds API URLs with query params', () => {
    const url = buildApiUrl('/api', '/tables/schema', { table: 'sales data', limit: 10 });
    expect(url).toContain('/api/tables/schema');
    expect(url).toContain('table=sales+data');
    expect(url).toContain('limit=10');
  });
});
