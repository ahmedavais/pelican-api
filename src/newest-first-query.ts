import type { PagePosition } from "./cursor";

export class NewestFirstQuery {
  private readonly conditions: string[] = [];
  private readonly parameters: unknown[] = [];

  constructor(private readonly table: string) {}

  where(condition: string, value: unknown): this {
    if (value !== undefined) {
      this.conditions.push(condition);
      this.parameters.push(value);
    }
    return this;
  }

  after(position: PagePosition | null): this {
    if (position) {
      this.conditions.push("(published_at, id) < (?, ?)");
      this.parameters.push(position.publishedAt, position.id);
    }
    return this;
  }

  statement(db: D1Database, limit: number): D1PreparedStatement {
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(" AND ")}` : "";
    return db
      .prepare(`SELECT * FROM ${this.table} ${whereClause} ORDER BY published_at DESC, id DESC LIMIT ?`)
      .bind(...this.parameters, limit);
  }
}
