import { describe, it, expect } from 'vitest';
import { SQL_TEMPLATES, getTemplatesByCategory, getTemplateById } from './sql-templates';

describe('sql-templates', () => {
  describe('SQL_TEMPLATES', () => {
    it('should have at least one template', () => {
      expect(SQL_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have all required fields for each template', () => {
      for (const template of SQL_TEMPLATES) {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(Array.isArray(template.variables)).toBe(true);
        expect(template.template).toBeTruthy();
      }
    });

    it('should have unique template IDs', () => {
      const ids = SQL_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid snippet syntax in templates', () => {
      for (const template of SQL_TEMPLATES) {
        // Check that template contains placeholder syntax ${...}
        // This is a basic check - actual validation would require parsing
        expect(template.template).toContain('${');
      }
    });

    it('should have variables that match template placeholders', () => {
      for (const template of SQL_TEMPLATES) {
        // Count placeholders in template (basic check)
        const placeholderMatches = template.template.match(/\$\{\d+:/g);
        if (placeholderMatches) {
          // At least some variables should be defined
          expect(template.variables.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should group templates by category', () => {
      const grouped = getTemplatesByCategory();
      expect(Object.keys(grouped).length).toBeGreaterThan(0);

      // Verify all templates are in the grouped result
      const totalInGroups = Object.values(grouped).reduce((sum, templates) => sum + templates.length, 0);
      expect(totalInGroups).toBe(SQL_TEMPLATES.length);
    });

    it('should have non-empty categories', () => {
      const grouped = getTemplatesByCategory();
      for (const [category, templates] of Object.entries(grouped)) {
        expect(category).toBeTruthy();
        expect(templates.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getTemplateById', () => {
    it('should return template for valid ID', () => {
      const firstTemplate = SQL_TEMPLATES[0];
      if (!firstTemplate) {
        throw new Error('No templates available');
      }
      const found = getTemplateById(firstTemplate.id);
      expect(found).toEqual(firstTemplate);
    });

    it('should return undefined for invalid ID', () => {
      const found = getTemplateById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });
});
