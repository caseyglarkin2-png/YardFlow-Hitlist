'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X, Plus, Search } from 'lucide-react';

export type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
export type FilterLogic = 'AND' | 'OR';

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface AdvancedFilters {
  conditions: FilterCondition[];
  logic: FilterLogic;
}

interface AdvancedFiltersProps {
  onSearch: (filters: AdvancedFilters) => void;
  onSave?: (filters: AdvancedFilters, name: string) => void;
  entityType: 'people' | 'accounts' | 'outreach' | 'meetings';
}

const FIELD_OPTIONS = {
  people: [
    { value: 'name', label: 'Name' },
    { value: 'email', label: 'Email' },
    { value: 'title', label: 'Title' },
    { value: 'icpScore', label: 'ICP Score' },
    { value: 'persona', label: 'Persona' },
    { value: 'engagementLevel', label: 'Engagement Level' },
  ],
  accounts: [
    { value: 'name', label: 'Company Name' },
    { value: 'industry', label: 'Industry' },
    { value: 'icpScore', label: 'ICP Score' },
    { value: 'tier', label: 'Tier' },
    { value: 'location', label: 'Location' },
  ],
  outreach: [
    { value: 'subject', label: 'Subject' },
    { value: 'status', label: 'Status' },
    { value: 'channel', label: 'Channel' },
    { value: 'createdAt', label: 'Date Sent' },
  ],
  meetings: [
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'outcome', label: 'Outcome' },
    { value: 'meetingDate', label: 'Meeting Date' },
  ],
};

const OPERATOR_OPTIONS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
];

export function AdvancedFiltersComponent({
  onSearch,
  onSave,
  entityType,
}: AdvancedFiltersProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { id: '1', field: '', operator: 'contains', value: '' },
  ]);
  const [logic, setLogic] = useState<FilterLogic>('AND');
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: Date.now().toString(), field: '', operator: 'contains', value: '' },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleSearch = () => {
    const validConditions = conditions.filter(
      (c) => c.field && c.operator && c.value
    );
    if (validConditions.length > 0) {
      onSearch({ conditions: validConditions, logic });
    }
  };

  const handleSave = () => {
    if (saveName.trim() && onSave) {
      const validConditions = conditions.filter(
        (c) => c.field && c.operator && c.value
      );
      onSave({ conditions: validConditions, logic }, saveName);
      setSaveName('');
      setShowSave(false);
    }
  };

  const handleClear = () => {
    setConditions([{ id: '1', field: '', operator: 'contains', value: '' }]);
    setLogic('AND');
  };

  const fieldOptions = FIELD_OPTIONS[entityType];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Advanced Filters</h3>
        <div className="flex gap-2">
          <Select value={logic} onValueChange={(v) => setLogic(v as FilterLogic)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={condition.id} className="flex gap-2 items-end">
            {index > 0 && (
              <div className="text-sm text-muted-foreground w-12 text-center pb-2">
                {logic}
              </div>
            )}
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Field</Label>
                <Select
                  value={condition.field}
                  onValueChange={(v) => updateCondition(condition.id, { field: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Operator</Label>
                <Select
                  value={condition.operator}
                  onValueChange={(v) =>
                    updateCondition(condition.id, { operator: v as FilterOperator })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Value</Label>
                <Input
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(condition.id, { value: e.target.value })
                  }
                  placeholder="Enter value"
                />
              </div>
            </div>
            {conditions.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(condition.id)}
                className="mb-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
        <Button variant="outline" onClick={handleClear}>
          Clear All
        </Button>
        {onSave && (
          <Button variant="outline" onClick={() => setShowSave(!showSave)}>
            Save Search
          </Button>
        )}
      </div>

      {showSave && onSave && (
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Search name..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSave}>Save</Button>
          <Button variant="outline" onClick={() => setShowSave(false)}>
            Cancel
          </Button>
        </div>
      )}
    </Card>
  );
}
