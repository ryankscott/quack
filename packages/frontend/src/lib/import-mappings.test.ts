import { describe, expect, it } from 'vitest';
import {
  createInitialImportColumnConfigs,
  getImportColumnValidationError,
  projectImportPreview,
  toColumnMappings,
} from './import-mappings';

describe('import mapping helpers', () => {
  it('creates selected column configs from CSV columns', () => {
    expect(
      createInitialImportColumnConfigs([
        { name: 'Customer ID', type: 'BIGINT' },
        { name: 'Full Name', type: 'VARCHAR' },
      ])
    ).toEqual([
      {
        sourceName: 'Customer ID',
        targetName: 'Customer ID',
        type: 'BIGINT',
        selected: true,
      },
      {
        sourceName: 'Full Name',
        targetName: 'Full Name',
        type: 'VARCHAR',
        selected: true,
      },
    ]);
  });

  it('builds request column mappings from selected configs', () => {
    expect(
      toColumnMappings([
        {
          sourceName: 'Customer ID',
          targetName: 'customer_id',
          type: 'BIGINT',
          selected: true,
        },
        {
          sourceName: 'Age',
          targetName: 'Age',
          type: 'BIGINT',
          selected: false,
        },
      ])
    ).toEqual([{ source_name: 'Customer ID', target_name: 'customer_id' }]);
  });

  it('projects preview rows using selected columns and renamed headers', () => {
    expect(
      projectImportPreview(
        [
          { name: 'Customer ID', type: 'BIGINT' },
          { name: 'Full Name', type: 'VARCHAR' },
          { name: 'Age', type: 'BIGINT' },
        ],
        [
          [1, 'Ada Lovelace', 36],
          [2, 'Grace Hopper', 85],
        ],
        [
          {
            sourceName: 'Customer ID',
            targetName: 'customer_id',
            type: 'BIGINT',
            selected: true,
          },
          {
            sourceName: 'Full Name',
            targetName: 'name',
            type: 'VARCHAR',
            selected: true,
          },
          {
            sourceName: 'Age',
            targetName: 'Age',
            type: 'BIGINT',
            selected: false,
          },
        ]
      )
    ).toEqual({
      columns: [
        { id: 'Customer ID', name: 'customer_id', type: 'BIGINT' },
        { id: 'Full Name', name: 'name', type: 'VARCHAR' },
      ],
      rows: [
        [1, 'Ada Lovelace'],
        [2, 'Grace Hopper'],
      ],
    });
  });

  it('falls back to the source name while a destination name is blank', () => {
    expect(
      projectImportPreview(
        [{ name: 'Customer ID', type: 'BIGINT' }],
        [[1]],
        [
          {
            sourceName: 'Customer ID',
            targetName: '   ',
            type: 'BIGINT',
            selected: true,
          },
        ]
      )
    ).toEqual({
      columns: [{ id: 'Customer ID', name: 'Customer ID', type: 'BIGINT' }],
      rows: [[1]],
    });
  });

  it('validates append mappings against the target schema', () => {
    const validationError = getImportColumnValidationError(
      [
        {
          sourceName: 'Customer ID',
          targetName: 'customer_id',
          type: 'BIGINT',
          selected: true,
        },
      ],
      [{ name: 'customer_id' }, { name: 'customer_name' }]
    );

    expect(validationError).toContain('match the target table schema exactly');
  });
});
