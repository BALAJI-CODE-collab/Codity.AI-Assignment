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
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({ columns, rows, emptyMessage, emptyActionLabel, onEmptyAction, loading }: DataTableProps<T>) {
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
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column, columnIndex) => (
                    <td key={`${String(column.key)}-${columnIndex}`}>
                      <div className={columnIndex === 0 ? 'skeleton skeleton-cell wide' : 'skeleton skeleton-cell'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length > 0 ? (
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
                  <div className="empty-state compact">
                    <p>{emptyMessage ?? 'No records found.'}</p>
                    {emptyActionLabel && onEmptyAction ? (
                      <button type="button" className="button button-secondary" onClick={onEmptyAction}>
                        {emptyActionLabel}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
