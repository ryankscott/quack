import dbConnection from './connection.js';

export async function initializeSchema(): Promise<void> {
  // Create metadata tables for tracking files and tables
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _files (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      source_file_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_file_id) REFERENCES _files(id)
    );
  `);

  // Create notebooks table to store notebook metadata and markdown content
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      markdown TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create notebook cells to store individual cell configurations
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _notebook_cells (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL,
      cell_index INTEGER NOT NULL,
      cell_type TEXT NOT NULL,
      sql_text TEXT,
      markdown_text TEXT,
      chart_config TEXT,
      selected_tables TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notebook_id) REFERENCES _notebooks(id)
    );
  `);

  // Add selected_tables column if it doesn't exist (migration for existing databases)
  await dbConnection.run(`
    ALTER TABLE _notebook_cells ADD COLUMN IF NOT EXISTS selected_tables TEXT;
  `);

  // Create junction table to track table-cell relationships
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _cell_tables (
      id TEXT PRIMARY KEY,
      cell_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cell_id) REFERENCES _notebook_cells(id)
    );
  `);
}
