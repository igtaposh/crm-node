import { randomInt } from "node:crypto";
import { pool } from "../config/db.js";

export const generateUniqueSlug = async (name) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Invalid name.");
  }

  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug) {
    throw new Error("Unable to generate slug.");
  }

  let slug = baseSlug;

  while (true) {
    const result = await pool.query(
      `SELECT 1 FROM organizations WHERE slug = $1 LIMIT 1`,
      [slug],
    );

    if (result.rowCount === 0) {
      return slug;
    }

    slug = `${baseSlug}-${randomInt(1000, 10000)}`;
  }
};
