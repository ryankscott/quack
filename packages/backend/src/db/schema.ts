import dbConnection from './connection.js';

export async function initializeSchema(): Promise<void> {
  // Create metadata tables for tracking files, tables, and queries
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

  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _queries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sql TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create junction table to track which tables each query references
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _query_tables (
      query_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      PRIMARY KEY (query_id, table_name),
      FOREIGN KEY (query_id) REFERENCES _queries(id)
    );
  `);

  // Create documents table to store document metadata and markdown content
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _documents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      markdown TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create document cells to store individual cell configurations
  await dbConnection.run(`
    CREATE TABLE IF NOT EXISTS _document_cells (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      cell_index INTEGER NOT NULL,
      cell_type TEXT NOT NULL,
      sql_text TEXT,
      markdown_text TEXT,
      chart_config TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES _documents(id)
    );
  `);
}
