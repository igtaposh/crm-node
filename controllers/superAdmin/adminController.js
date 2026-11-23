import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";

export const admin_login = async (req, res) => {
  const { user_name, email, password } = req.body || {};

  try {
    if (!user_name && !email) {
      return res.status(400).json({
        success: false,
        message: "User name or email is required.",
      });
    }

    if (typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Invalid password.",
      });
    }

    if (
      email &&
      (typeof email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please use a valid email ID.",
      });
    }

    if (user_name && typeof user_name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid user name.",
      });
    }

    const result = await pool.query(
      `SELECT id, user_name, email, password_hash
       FROM super_admins
       WHERE email = $1 OR user_name = $2
       LIMIT 1`,
      [email || null, user_name || null],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const admin = result.rows[0];

    const is_match = await bcrypt.compare(password, admin.password_hash);

    if (!is_match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const token = jwt.sign(
      { id: admin.id, type: "admin" },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Admin authenticated successfully.",
      admin: {
        id: admin.id,
        user_name: admin.user_name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const update_admin_password = async (req, res) => {
  const admin_id = req.admin?.id;
  const { old_password, new_password } = req.body || {};

  try {
    if (
      typeof admin_id !== "string" ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(admin_id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    if (
      typeof old_password !== "string" ||
      !old_password ||
      typeof new_password !== "string" ||
      !new_password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Old password and new password are required and must be strings.",
      });
    }

    if (Buffer.byteLength(old_password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Invalid old password.",
      });
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/.test(
        new_password,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain 8-64 characters, including uppercase, lowercase, number and special character.",
      });
    }

    const result = await pool.query(
      `SELECT password_hash FROM super_admins WHERE id = $1`,
      [admin_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Super admin not found.",
      });
    }

    const { password_hash } = result.rows[0];

    if (!(await bcrypt.compare(old_password, password_hash))) {
      return res.status(403).json({
        success: false,
        message: "Old password is incorrect.",
      });
    }

    if (await bcrypt.compare(new_password, password_hash)) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the old password.",
      });
    }

    const salt_rounds = Number(process.env.SALT_ROUNDS);

    if (!Number.isInteger(salt_rounds) || salt_rounds < 4 || salt_rounds > 31) {
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }

    const hashed_password = await bcrypt.hash(new_password, salt_rounds);
    const updated_admin = await pool.query(
      `UPDATE super_admins
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND password_hash = $3`,
      [hashed_password, admin_id, password_hash],
    );

    if (updated_admin.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: "Admin account changed during the request. Please try again.",
      });
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Admin password updated successfully. Please log in again.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const admin_logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const update_admin_profile = async (req, res) => {
  const admin_id = req.admin?.id;
  const { user_name, email, password } = req.body || {};

  if (
    typeof admin_id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(admin_id)
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access.",
    });
  }

  if (
    typeof password !== "string" ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid current password is required.",
    });
  }

  if (user_name == null && email == null) {
    return res.status(400).json({
      success: false,
      message: "User name or email is required.",
    });
  }

  const new_user_name = typeof user_name === "string" ? user_name.trim() : null;
  const new_email =
    typeof email === "string" ? email.trim().toLowerCase() : null;

  if (
    user_name != null &&
    (!new_user_name ||
      new_user_name.length > 100 ||
      new_user_name.includes("\0"))
  ) {
    return res.status(400).json({
      success: false,
      message: "User name must contain 1-100 characters.",
    });
  }

  if (
    email != null &&
    (!new_email ||
      new_email.length > 250 ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(new_email))
  ) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT password_hash FROM super_admins WHERE id = $1`,
      [admin_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Super admin not found.",
      });
    }

    const { password_hash } = result.rows[0];

    if (!(await bcrypt.compare(password, password_hash))) {
      return res.status(403).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const updated_admin = await pool.query(
      `UPDATE super_admins AS admin
       SET user_name = COALESCE($2, admin.user_name),
           email = COALESCE($3, admin.email),
           updated_at = clock_timestamp()
       WHERE admin.id = $1 AND admin.password_hash = $4
         AND ($3::text IS NULL OR NOT EXISTS (
           SELECT 1 FROM super_admins
           WHERE LOWER(email) = $3 AND id <> admin.id
         ))
       RETURNING id, user_name, email`,
      [admin_id, new_user_name, new_email, password_hash],
    );

    if (updated_admin.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: "Admin account changed or email is already in use.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin profile updated successfully.",
      admin: updated_admin.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "User name or email is already in use.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
