import dbConnection from '../db/connection.js';

interface DescribeColumnRow {
  column_name: string;
  column_type: string;
}

export class CsvImportValidationError extends Error {}

export interface CsvColumn {
  name: string;
  type: string;
}

export interface ColumnMappingInput {
  source_name: string;
  target_name?: string;
}

export interface ResolvedColumnMapping {
  sourceName: string;
  targetName: string;
}

export function escapeIdentifier(identifier: string): string {
  return identifier.replace(/"/g, '""');
}

export function quoteIdentifier(identifier: string): string {
  return `"${escapeIdentifier(identifier)}"`;
}

export async function getCsvColumns(filePath: string): Promise<CsvColumn[]> {
  const rows = await dbConnection.query<DescribeColumnRow>(
    'DESCRIBE SELECT * FROM read_csv_auto(?)',
    filePath
  );

  return rows.map((row) => ({
    name: row.column_name,
    type: row.column_type,
  }));
}

export async function getCsvPreviewRows(filePath: string, limit = 5): Promise<unknown[][]> {
  const rows = await dbConnection.query<Record<string, unknown>>(
    'SELECT * FROM read_csv_auto(?) LIMIT ?',
    filePath,
    limit
  );

  return rows.map((row) => Object.values(row));
}

export function resolveColumnMappings(
  columnMappings?: ColumnMappingInput[]
): ResolvedColumnMapping[] | null {
  if (!columnMappings) {
    return null;
  }

  if (columnMappings.length === 0) {
    throw new CsvImportValidationError('column_mappings must include at least one column');
  }

  const seenSourceNames = new Set<string>();
  const seenTargetNames = new Set<string>();

  return columnMappings.map((mapping, index) => {
    const sourceName = mapping.source_name?.trim();
    const targetName = (mapping.target_name?.trim() || mapping.source_name?.trim());

    if (!sourceName) {
      throw new CsvImportValidationError(`column_mappings[${index}].source_name is required`);
    }

    if (!targetName) {
      throw new CsvImportValidationError(`column_mappings[${index}].target_name is invalid`);
    }

    if (seenSourceNames.has(sourceName)) {
      throw new CsvImportValidationError(`Duplicate source column "${sourceName}" in column_mappings`);
    }

    if (seenTargetNames.has(targetName)) {
      throw new CsvImportValidationError(`Duplicate target column "${targetName}" in column_mappings`);
    }

    seenSourceNames.add(sourceName);
    seenTargetNames.add(targetName);

    return {
      sourceName,
      targetName,
    };
  });
}

export function buildColumnSelectClause(mappings: ResolvedColumnMapping[]): string {
  return mappings
    .map((mapping) => `${quoteIdentifier(mapping.sourceName)} AS ${quoteIdentifier(mapping.targetName)}`)
    .join(', ');
}
