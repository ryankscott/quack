export interface ImportableColumn {
  name: string;
  type: string;
}

export interface ImportColumnConfig {
  sourceName: string;
  targetName: string;
  type: string;
  selected: boolean;
}

export interface ImportPreviewColumn {
  id: string;
  name: string;
  type: string;
}

export interface ImportPreviewData {
  columns: ImportPreviewColumn[];
  rows: unknown[][];
}

export function createInitialImportColumnConfigs(
  columns: ImportableColumn[]
): ImportColumnConfig[] {
  return columns.map((column) => ({
    sourceName: column.name,
    targetName: column.name,
    type: column.type,
    selected: true,
  }));
}

export function projectImportPreview(
  columns: ImportableColumn[],
  previewRows: unknown[][],
  configs: ImportColumnConfig[]
): ImportPreviewData {
  const columnIndexByName = new Map(columns.map((column, index) => [column.name, index]));
  const selectedColumns = configs
    .filter((config) => config.selected)
    .flatMap((config) => {
      const sourceIndex = columnIndexByName.get(config.sourceName);
      if (sourceIndex === undefined) {
        return [];
      }

      return [
        {
          id: config.sourceName,
          name: config.targetName.trim() || config.sourceName,
          type: config.type,
          sourceIndex,
        },
      ];
    });

  return {
    columns: selectedColumns.map(({ sourceIndex: _sourceIndex, ...column }) => column),
    rows: previewRows.map((row) => selectedColumns.map(({ sourceIndex }) => row[sourceIndex])),
  };
}

export function toColumnMappings(configs: ImportColumnConfig[]) {
  return configs
    .filter((config) => config.selected)
    .map((config) => ({
      source_name: config.sourceName,
      target_name: config.targetName.trim(),
    }));
}

export function getImportColumnValidationError(
  configs: ImportColumnConfig[],
  targetColumns?: Array<{ name: string }> | null
): string | null {
  const selectedColumns = configs.filter((config) => config.selected);

  if (selectedColumns.length === 0) {
    return 'Select at least one column to import.';
  }

  const targetNames = selectedColumns.map((config) => config.targetName.trim());

  if (targetNames.some((name) => name.length === 0)) {
    return 'Every selected column needs a destination name.';
  }

  if (new Set(targetNames).size !== targetNames.length) {
    return 'Destination column names must be unique.';
  }

  if (!targetColumns) {
    return null;
  }

  const requiredColumnNames = targetColumns.map((column) => column.name);
  if (requiredColumnNames.length !== targetNames.length) {
    return `Selected columns must match the target table schema exactly: ${requiredColumnNames.join(', ')}`;
  }

  const requiredColumnNameSet = new Set(requiredColumnNames);
  if (!targetNames.every((name) => requiredColumnNameSet.has(name))) {
    return `Selected columns must match the target table schema exactly: ${requiredColumnNames.join(', ')}`;
  }

  return null;
}
