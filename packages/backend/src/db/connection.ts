import duckdb from 'duckdb';
import { dirname } from 'path';
import { access, mkdir, rename } from 'fs/promises';
import { DB_CONFIG } from '../config.js';

const WAL_REPLAY_ERROR_FRAGMENT = 'Failure while replaying WAL file';

function isWalReplayError(error: unknown): error is Error {
  return error instanceof Error && error.message.includes(WAL_REPLAY_ERROR_FRAGMENT);
}

async function moveWalAside(dbPath: string): Promise<string> {
  const walPath = `${dbPath}.wal`;
  const backupWalPath = `${walPath}.recovered-${Date.now()}`;
  await access(walPath);
  await rename(walPath, backupWalPath);
  return backupWalPath;
}

class DuckDBConnection {
  private db: duckdb.Database | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize().catch((error) => {
      this.initPromise = null;
      throw error;
    });
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    // Ensure data directory exists
    if (DB_CONFIG.DB_PATH !== ':memory:') {
      const dataDir = dirname(DB_CONFIG.DB_PATH);
      await mkdir(dataDir, { recursive: true });
    }

    try {
      this.db = await this.openDatabase(DB_CONFIG.DB_PATH);
    } catch (error) {
      if (DB_CONFIG.DB_PATH !== ':memory:' && isWalReplayError(error)) {
        const backupWalPath = await moveWalAside(DB_CONFIG.DB_PATH).catch(() => null);
        if (!backupWalPath) {
          throw error;
        }
        console.warn(
          `DuckDB WAL replay failed for ${DB_CONFIG.DB_PATH}. Moved the WAL to ${backupWalPath} and retrying open. Uncheckpointed changes in the WAL may be lost.`
        );
        this.db = await this.openDatabase(DB_CONFIG.DB_PATH);
        return;
      }

      throw error;
    }
  }

  private async openDatabase(dbPath: string): Promise<duckdb.Database> {
    return new Promise((resolve, reject) => {
      const database = new duckdb.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(database);
      });
    });
  }

  async query<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.all(sql, ...params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows as T[]);
      });
    });
  }

  async run(sql: string, ...params: unknown[]): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, ...params, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.db = null;
        this.initPromise = null;
        resolve();
      });
    });
  }
}

// Singleton instance
const dbConnection = new DuckDBConnection();

export default dbConnection;
