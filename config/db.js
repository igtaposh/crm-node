import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "dotenv/config";
import path from "node:path";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Idle database connection failed.", error.code);
});

const migration_folder = fileURLToPath(new URL("../database/migrations/", import.meta.url));

export const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(1790351480)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migration_folder)).filter((file) => /^\d+_.*\.sql$/.test(file)).sort();
    for (const file of files) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (applied.rowCount) continue;

      const sql = await readFile(path.join(migration_folder, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const send_database_error = (res, error) => {
  if (error.code === "23505") {
    return res.status(409).json({ success: false, message: "A record with these details already exists." });
  }
  if (error.code === "23503") {
    return res.status(409).json({ success: false, message: "A related record is unavailable or still in use." });
  }
  if (error.code === "23502" || error.code === "23514" || error.code?.startsWith("22")) {
    return res.status(400).json({ success: false, message: "One or more values are invalid." });
  }
  console.error("Database request failed.", error.code || error.name);
  return res.status(500).json({ success: false, message: "Internal server error." });
};
