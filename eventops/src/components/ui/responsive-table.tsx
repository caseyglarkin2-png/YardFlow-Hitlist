'use client';

import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';

interface Column {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function ResponsiveTable({ columns, data, onRowClick }: ResponsiveTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={String(row.id ?? index)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-accent' : ''}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row, index) => (
          <Card
            key={String(row.id ?? index)}
            className={`p-4 ${onRowClick ? 'cursor-pointer hover:bg-accent' : ''}`}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((column) => (
              <div key={column.key} className="flex justify-between border-b py-2 last:border-0">
                <span className="text-sm font-semibold text-muted-foreground">{column.label}</span>
                <span className="text-sm">
                  {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? '')}
                </span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </>
  );
}
