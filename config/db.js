import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";
import path from "node:path";

const { Pool } = pg;
dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFolder = path.join(__dirname, "../database/migrations");

export const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    const files = await readdir(migrationFolder);

    for (const file of files) {
      console.log(`Running migration: ${file}`);

      const sql = await readFile(path.join(migrationFolder, file), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");

      console.log(`Completed: ${file}`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
  }
};

try {
  pool.on("connect", () => {
    console.log("Database is connected.");
  });
} catch (error) {
  console.log("error connecting to database :", error);
}
