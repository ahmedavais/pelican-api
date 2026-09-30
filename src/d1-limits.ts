export const MAX_BOUND_PARAMETERS_PER_QUERY = 100;

export function rowsPerInsert(columnsPerRow: number): number {
  return Math.floor(MAX_BOUND_PARAMETERS_PER_QUERY / columnsPerRow);
}

export function inChunksOf<T>(size: number, items: T[]): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export function multiRowInsert(table: string, columns: string[], rowCount: number, conflictClause = ""): string {
  const rowPlaceholders = `(${columns.map(() => "?").join(", ")})`;
  const values = Array.from({ length: rowCount }, () => rowPlaceholders).join(", ");
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values} ${conflictClause}`;
}
