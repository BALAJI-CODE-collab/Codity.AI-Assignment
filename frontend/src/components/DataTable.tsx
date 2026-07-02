import type { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({ columns, rows, emptyMessage }: DataTableProps<T>) {
  return (
    <div className="table-shell">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>{column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state compact">{emptyMessage ?? 'No records found.'}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
