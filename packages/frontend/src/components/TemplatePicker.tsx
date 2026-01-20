import { FileCode } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { SQL_TEMPLATES, getTemplatesByCategory, type SQLTemplate } from '@/lib/sql-templates';

interface TemplatePickerProps {
  onSelect: (template: SQLTemplate) => void;
}

/**
 * Component for selecting SQL query templates
 * Displays templates grouped by category in a dropdown
 */
export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  const templatesByCategory = getTemplatesByCategory();
  const categories = Object.keys(templatesByCategory).sort();

  const handleValueChange = (templateId: string) => {
    const template = SQL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      onSelect(template);
    }
  };

  return (
    <Select value="" onValueChange={handleValueChange}>
      <SelectTrigger className="h-7 w-auto px-2 text-xs border-quack-dark border-opacity-20 gap-1">
        <FileCode size={12} />
        <SelectValue placeholder="Template" />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {categories.map((category) => {
          const templates = templatesByCategory[category];
          if (!templates) return null;
          return (
            <SelectGroup key={category}>
              <SelectLabel>{category}</SelectLabel>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-muted-foreground">{template.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
