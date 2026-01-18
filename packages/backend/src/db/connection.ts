import duckdb from 'duckdb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../..', 'data', 'quack.duckdb');

class DuckDBConnection {
  private db: duckdb.Database | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    // Ensure data directory exists
    const dataDir = dirname(DB_PATH);
    await mkdir(dataDir, { recursive: true });

    return new Promise((resolve, reject) => {
      this.db = new duckdb.Database(DB_PATH, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
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
