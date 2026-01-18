/**
 * Application configuration constants
 */

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
  DB_PATH: process.env.DB_PATH || './data/quack.duckdb',
} as const;

/**
 * File upload settings
 */
export const FILE_CONFIG = {
  /** Directory for uploaded files */
  UPLOAD_DIR: process.env.UPLOAD_DIR || './data/uploads',
  /** Directory for exported databases */
  EXPORT_DIR: process.env.EXPORT_DIR || './data/exports',
} as const;
