import { initializeDatabase, pool } from "./config/db.js";
import bcrypt from "bcryptjs";

const user_name = process.env.ADMIN_USER_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

const createAdmin = async () => {
  try {
    if (!user_name || user_name.length > 100 || !email || email.length > 250 ||
        !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      throw new Error("Configure a valid ADMIN_USER_NAME and ADMIN_EMAIL.");
    }
    if (!password ||
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/.test(password)) {
      throw new Error("ADMIN_PASSWORD must contain 8–64 characters, including uppercase, lowercase, a number and a special character.");
    }
    const salt_rounds = Number(process.env.SALT_ROUNDS);
    if (!Number.isInteger(salt_rounds) || salt_rounds < 10 || salt_rounds > 15) {
      throw new Error("Configure SALT_ROUNDS (10–15).");
    }

    await initializeDatabase();
    const hashed_password = await bcrypt.hash(password, salt_rounds);
    const result = await pool.query(
      `INSERT INTO super_admins (user_name, email, password_hash)
       SELECT $1::VARCHAR, $2::VARCHAR, $3::VARCHAR
       WHERE NOT EXISTS (SELECT 1 FROM super_admins WHERE LOWER(email) = $2)
       ON CONFLICT DO NOTHING`,
      [user_name, email, hashed_password],
    );
    if (!result.rowCount) throw new Error("User name or email already exists.");
    console.log("Super admin created successfully.");
  } catch (error) {
    console.error("Could not create super admin.", error.code || error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

await createAdmin();
