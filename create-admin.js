import { pool } from "./config/db.js";
import bcrypt from "bcryptjs";

const user_name = "test";
const email = "test@test.com";
const password = "@Taposh6969";

const createAdmin = async () => {
  try {
    if (!user_name || !email || !password) {
      return console.log("User name, email and password can not be empty.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return console.log("Please use an valid email.");
    }
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/.test(
        password,
      )
    ) {
      return console.log(
        "Password must contain 8-64 characters, including uppercase, lowercase, number and special character.",
      );
    }

    const email_check = await pool.query(
      `SELECT email FROM super_admins WHERE email = $1 `,
      [email],
    );
    if (email_check.rows[0]?.email) {
      return console.log("Email is already is in use.");
    }
    const user_name_check = await pool.query(
      `SELECT user_name FROM super_admins WHERE user_name = $1 `,
      [user_name],
    );
    if (user_name_check.rows[0]?.user_name) {
      return console.log("Email is already is in use.");
    }
    const salt_rounds = Number(process.env.SALT_ROUNDS);
    const hashed_password = await bcrypt.hash(password, salt_rounds);
    await pool.query(
      `INSERT INTO super_admins (user_name, email, password_hash) VALUES ($1, $2, $3)`,
      [user_name, email, hashed_password],
    );
    return console.log("Super admin created successfully.");
  } catch (error) {
    return console.log(error);
  }
};
createAdmin();
