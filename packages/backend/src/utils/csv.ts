import { createHash } from 'crypto';
import { basename } from 'path';

export function generateFileId(): string {
  return createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 16);
}

export function validateTableName(name: string): boolean {
  // Allow alphanumeric and underscore, must start with letter or underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function sanitizeTableName(name: string): string {
  // Replace invalid characters with underscore
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[^a-zA-Z_]/, '_');
}

export function getFileExtension(filename: string): string {
  const parts = basename(filename).split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1] : null;
  return ext ? ext.toLowerCase() : '';
}
