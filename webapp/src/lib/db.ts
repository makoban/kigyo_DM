import { Pool, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("connect", (client) => {
  client.query("SET search_path TO kigyo_dm, public");
});

/**
 * Execute a SQL query and return all rows.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

/**
 * Execute a SQL query and return the first row, or null if no rows found.
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await pool.query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a COUNT query and return the numeric result.
 */
export async function queryCount(
  text: string,
  params?: unknown[]
): Promise<number> {
  const result = await pool.query(text, params);
  return parseInt(result.rows[0]?.count || "0", 10);
}

export default pool;
