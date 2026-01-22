import { AdvancedFilters, FilterCondition } from '@/components/search/advanced-filters';

export interface PrismaFilter {
  AND?: any[];
  OR?: any[];
  [key: string]: any;
}

export function buildPrismaWhere(filters: AdvancedFilters): PrismaFilter {
  const conditions = filters.conditions.map((condition) =>
    conditionToPrisma(condition)
  );

  if (filters.logic === 'AND') {
    return { AND: conditions };
  } else {
    return { OR: conditions };
  }
}

function conditionToPrisma(condition: FilterCondition): any {
  const { field, operator, value } = condition;

  switch (operator) {
    case 'equals':
      // Try to parse as number for numeric fields
      const numValue = Number(value);
      return { [field]: isNaN(numValue) ? value : numValue };
    
    case 'contains':
      return { [field]: { contains: value, mode: 'insensitive' } };
    
    case 'greaterThan':
      return { [field]: { gt: Number(value) } };
    
    case 'lessThan':
      return { [field]: { lt: Number(value) } };
    
    case 'in':
      const values = value.split(',').map((v) => v.trim());
      return { [field]: { in: values } };
    
    default:
      return { [field]: value };
  }
}

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        // Escape values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ].join('\n');

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatSearchResults(results: any[], entityType: string) {
  return results.map((result) => ({
    ...result,
    entityType,
  }));
}
