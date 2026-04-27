import { randomBytes } from 'crypto';
import { basename } from 'path';

export function generateFileId(): string {
  return randomBytes(8).toString('hex');
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
