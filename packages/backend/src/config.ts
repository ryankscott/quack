import path from 'path';

/**
 * Application configuration constants
 */

/**
 * Parse command line arguments for --data-dir
 * Used when running as a Tauri sidecar to specify the app data directory
 */
function parseDataDir(): string | undefined {
  const args = process.argv;
  const dataDirIndex = args.indexOf('--data-dir');
  if (dataDirIndex !== -1 && args[dataDirIndex + 1]) {
    return args[dataDirIndex + 1];
  }
  return undefined;
}

/**
 * Base data directory - can be overridden via --data-dir CLI argument or DATA_DIR env var
 * When running as a Tauri sidecar, this will be set to the app's data directory
 */
const DATA_DIR = parseDataDir() || process.env.DATA_DIR || './data';

/**
 * Query execution settings
 */
export const QUERY_CONFIG = {
  /** Default row limit for query results */
  DEFAULT_LIMIT: 1000,
  /** Maximum allowed row limit */
  MAX_LIMIT: 10000,
  /** Default query execution timeout in milliseconds */
  DEFAULT_TIMEOUT_MS: 30_000,
} as const;

/**
 * Database settings
 */
export const DB_CONFIG = {
  /** Database file path */
  DB_PATH: process.env.DB_PATH || path.join(DATA_DIR, 'quack.duckdb'),
} as const;

/**
 * File upload settings
 */
export const FILE_CONFIG = {
  /** Directory for uploaded files */
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(DATA_DIR, 'uploads'),
  /** Directory for exported databases */
  EXPORT_DIR: process.env.EXPORT_DIR || path.join(DATA_DIR, 'exports'),
} as const;

/**
 * Get the current data directory
 */
export function getDataDir(): string {
  return DATA_DIR;
}
