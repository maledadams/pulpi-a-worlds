// Test-only: the slice of Cloudflare's D1 API this app uses, backed by Node's
// built-in SQLite in memory, so storage code runs against a real database in
// vitest. Never imported by app code.
import { DatabaseSync } from "node:sqlite";

type Value = string | number | null;

class FakeStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: Value[] = [],
  ) {}

  bind(...params: unknown[]) {
    return new FakeStatement(
      this.db,
      this.sql,
      params.map((value) =>
        value === undefined ? null : typeof value === "boolean" ? Number(value) : (value as Value),
      ),
    );
  }

  async first<T>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;
    return (column ? row[column] : { ...row }) as T;
  }

  async all<T>() {
    const rows = this.db.prepare(this.sql).all(...this.params) as Record<string, unknown>[];
    return { results: rows.map((row) => ({ ...row })) as T[], success: true };
  }

  runSync() {
    const result = this.db.prepare(this.sql).run(...this.params);
    return {
      success: true,
      meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
    };
  }

  async run() {
    return this.runSync();
  }
}

export function createTestD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  const fake = {
    prepare: (sql: string) => new FakeStatement(db, sql),
    // Synchronous inside, so concurrent batches never interleave (like D1's own batches).
    batch: async (statements: FakeStatement[]) => {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(statement.runSync());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 1, duration: 0 };
    },
  };
  return fake as unknown as D1Database;
}
