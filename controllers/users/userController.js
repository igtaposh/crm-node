import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { sent_otp_for_email_verify } from "../../utils/sent_otp_for_email_verify.js";
import jwt from "jsonwebtoken";

export const create_user = async (req, res) => {
  const {
    branch_id,
    name,
    email,
    phone,
    password_hash,
    employee_code,
    designation,
    role_id,
  } = req.body;
  const organization_id = req.user.organization_id;

  try {
    if (req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update branch status.",
      });
    }
    if (!organization_id || !name || !email || !password_hash || !role_id) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organization_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }
    if (branch_id) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          branch_id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }

    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid phone.",
        });
      }
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password_hash)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one number and one special character.",
      });
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        role_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND organization_id = $2`,
      [email, organization_id],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email ID is already in use, Please use an different Email.",
      });
    }

    const hashed_password = await bcrypt.hash(
      password_hash,
      parseInt(process.env.SALT_ROUNDS),
    );

    const result = await pool.query(
      `INSERT INTO users
        (organization_id, branch_id, name, email, phone, password_hash, employee_code, designation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
      [
        organization_id,
        branch_id,
        name,
        email,
        phone,
        hashed_password,
        employee_code,
        designation,
      ],
    );

    await pool.query(
      `INSERT INTO check_user_email
        (user_id, is_verified)
        VALUES ($1, $2)
        RETURNING *`,
      [result.rows[0].id, false],
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully. Please Verify user email.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
export const create_admin_user = async (req, res) => {
  const { name, email, phone, password_hash, employee_code, designation } =
    req.body;
  const { organization_id } = req.params;

  try {
    if (!organization_id || !name || !email || !password_hash) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organization_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }

    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter valid phone.",
        });
      }
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password_hash)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one number and one special character.",
      });
    }

    const existing = await pool.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);

    if (existing.rows.length !== 0) {
      return res.status(400).json({
        success: false,
        message: "Email ID is already in use, Please use an different Email.",
      });
    }
    const salt_rounds = Number(process.env.SALT_ROUNDS);
    const hashed_password = await bcrypt.hash(password_hash, salt_rounds);

    const result = await pool.query(
      `INSERT INTO users
        (organization_id, branch_id, name, email, phone, password_hash, employee_code, designation, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
      [
        organization_id,
        name,
        email,
        phone,
        hashed_password,
        employee_code,
        designation,
      ],
    );

    if (result.rowCount !== 0) {
      await pool.query(
        `INSERT INTO check_user_email (user_id, is_verified) VALUES ($1, $2) RETURNING *`,
        [result.rows[0].id, true],
      );
      const roleResult = await pool.query(
        `INSERT INTO roles (organization_id, name) VALUES ($1, $2) RETURNING *`,
        [organization_id, "admin"],
      );
      await pool.query(
        `INSERT INTO user_role (user_id, role_id) VALUES ($1, $2) RETURNING *`,
        [result.rows[0].id, roleResult.rows[0].id],
      );

      const modules = ["crm", "finance", "bookings", "etc"];

      const actions = ["create", "read", "update", "delete", "approve", "post"];

      const values = [];
      const placeholders = [];

      let index = 1;

      for (const module of modules) {
        for (const action of actions) {
          placeholders.push(`($${index++}, $${index++}, $${index++})`);

          values.push(module, action, `${action} permission for ${module}`);
        }
      }

      const permissionResult = await pool.query(
        `INSERT INTO permissions (module, action, description) VALUES ${placeholders.join(", ")} ON CONFLICT (module, action) DO NOTHING RETURNING *`,
        values,
      );
      await pool.query(
        `INSERT INTO role_permissions (role_id, permissions_id) VALUES ($1, $2) RETURNING *`,
        [roleResult.rows[0].id, permissionResult.rows[0].id],
      );
    }

    return res.status(201).json({
      success: true,
      message: "Admin created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
export const sent_email_verification_otp = async (req, res) => {
  const { user_id } = req.body;
  try {
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        user_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    const user_otp = await pool.query(
      `SELECT * FROM user_otp WHERE user_id = $1`,
      [user_id],
    );

    if (user_otp.rows.length > 0) {
      await pool.query(`DELETE FROM user_otp WHERE user_id = $1`, [user_id]);
    }

    const user = await pool.query(`SELECT * FROM users WHERE id = $1`, [
      user_id,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found.",
      });
    }
    const organization = await pool.query(
      `SELECT * FROM organizations WHERE id = $1`,
      [user.rows[0].organization_id],
    );
    if (!organization) {
      return res.status(400).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    const salt_rounds = Number(process.env.SALT_ROUNDS);
    const hashed_otp = await bcrypt.hash(otp, salt_rounds);

    const result = await pool.query(
      `INSERT INTO user_otp (user_id, otp, expires_at)
        VALUES ($1, $2, NOW() + INTERVAL '10 minutes')
        RETURNING *`,
      [user_id, hashed_otp],
    );

    await sent_otp_for_email_verify(user.rows[0], otp, organization.rows[0]);

    return res.status(201).json({
      success: true,
      message: "An 6 digit OTP has been sent to your email.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const verify_user_email = async (req, res) => {
  const { user_id, otp } = req.body;
  try {
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        user_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }
    if (!/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 6 digit OTP.",
      });
    }
    const check_user_email = await pool.query(
      `SELECT is_verified FROM check_user_email WHERE user_id = $1`,
      [user_id],
    );
    if (check_user_email.rows.is_verfied) {
      return res.status(400).json({
        success: false,
        message: "User email is already verified.",
      });
    }
    const user = await pool.query(`SELECT id FROM users WHERE id = $1`, [
      user_id,
    ]);
    if (user.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User not found.",
      });
    }
    const user_otp = await pool.query(
      `SELECT otp FROM user_otp WHERE user_id = $1 AND expires_at > NOW()`,
      [user_id],
    );

    const is_match = await bcrypt.compare(otp, user_otp.rows[0].otp);
    if (!is_match) {
      return res.status(400).json({
        success: false,
        message: "Invalid or Expired OTP.",
      });
    }
    await pool.query(`DELETE FROM user_otp WHERE user_id = $1`, [user_id]);

    const updated_verification = await pool.query(
      `UPDATE check_user_email SET is_verified = TRUE WHERE user_id = $1`,
      [user_id],
    );
    if (updated_verification.rowCount !== 1) {
      return res.status(400).json({
        success: false,
        message: "Email verification failed.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "OTP has been verified successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const user_login = async (req, res) => {
  const { email, password_hash } = req.body;
  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "invaild Email ID.",
      });
    }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid email.",
      });
    }
    if (!password_hash) {
      return res.status(400).json({
        success: false,
        message: "Invaild password.",
      });
    }

    const existing_user = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
    );
    const organization = await pool.query(
      `SELECT status FROM organizations WHERE id = $1`,
      [existing_user.rows[0].organization_id],
    );
    if (organization.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invaild organization.",
      });
    }
    if (existing_user.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invaild user credintials.",
      });
    }
    if (
      existing_user.rows[0].status != "inactive" ||
      existing_user.rows[0].status != "suspended"
    ) {
      return res.status(403).json({
        message: "Account is inactive or suspended",
        success: false,
      });
    }
    const user_password = existing_user.rows[0].password_hash;
    const is_correct_password = await bcrypt.compare(
      password_hash,
      user_password,
    );

    if (!is_correct_password) {
      return res.status(400).json({
        success: false,
        message: "Invaild Email or Password.",
      });
    }

    const check_user_email = await pool.query(
      `SELECT is_verified FROM check_user_email WHERE user_id = $1`,
      [existing_user.rows[0].id],
    );

    if (!check_user_email.rows[0].is_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first.",
      });
    }
    const user_roles = await pool.query(
      `SELECT role_id FROM user_roles WHERE user_id = $1`,
      [existing_user.rows[0].id],
    );
    if (user_roles.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "User role has invalid role type.",
      });
    }
    const roles = await pool.query(`SELECT name FROM roles WHERE id = $1`, [
      user_roles.rows[0].role_id,
    ]);
    if (roles.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid role.",
      });
    }
    const role_permissions = await pool.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = $1`,
      [user_roles.rows[0].role_id],
    );
    if (role_permissions.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid role permission.",
      });
    }
    const permissions = await pool.query(
      `SELECT module, action FROM permissions WHERE id = $1`,
      [role_permissions.rows[0].permission_id],
    );
    if (permissions.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid permission.",
      });
    }
    await pool.query(`UPDATE users SET last_login_at = NOW () WHERE id = $1`, [
      existing_user.rows[0].id,
    ]);
    const token = jwt.sign(
      {
        user: existing_user.rows[0],
        role: roles.rows[0].name,
        isEmailVerified: check_user_email.rows[0].is_verfied,
        permissions: permissions.rows[0],
        organization: organization.rows[0].status,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    return res.status(200).json({
      success: true,
      message: "User authenticated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const update_user_password = async (req, res) => {
  const user_id = req.user?.id;
  const { new_password, old_password } = req.body || {};

  try {
    if (
      typeof user_id !== "string" ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user_id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }
    if (typeof old_password !== "string" || !old_password) {
      return res.status(400).json({
        success: false,
        message: "Old password is required and must be a string.",
      });
    }

    if (typeof new_password !== "string" || !new_password) {
      return res.status(400).json({
        success: false,
        message: "New password is required and must be a string.",
      });
    }

    if (
      Buffer.byteLength(new_password, "utf8") > 72 ||
      !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(new_password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one number and one special character, and fit within 72 bytes.",
      });
    }
    if (old_password === new_password) {
      return res.status(400).json({
        success: false,
        message: "New password can not be same as your current password.",
      });
    }

    const user_password = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1 AND status = 'active'`,
      [user_id],
    );

    const is_match = await bcrypt.compare(
      old_password,
      user_password.rows[0].password_hash,
    );

    if (!is_match) {
      return res.status(401).json({
        success: false,
        message: "Invalid current password.",
      });
    }

    const salt_rounds = Number(process.env.SALT_ROUNDS);
    const hashed_password = await bcrypt.hash(new_password, salt_rounds);

    const updated_user = await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'active'`,
      [hashed_password, user_id],
    );

    if (updated_user.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Active user not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const update_user_profile = async (req, res) => {
  const user_id = req.user?.id;
  const { password, name, password_hash, employee_code, designation } =
    req.body || {};

  try {
    if (typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message: "Current password is required and must be a string.",
      });
    }

    if (
      (name !== undefined && typeof name !== "string") ||
      (password_hash !== undefined && typeof password_hash !== "string") ||
      (employee_code !== undefined && typeof employee_code !== "string") ||
      (designation !== undefined && typeof designation !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Profile fields must be strings.",
      });
    }

    const updated_name = name?.trim() || null;
    const updated_employee_code = employee_code?.trim() || null;
    const updated_designation = designation?.trim() || null;
    const new_password = password_hash?.trim() ? password_hash : null;

    if (
      !updated_name &&
      !new_password &&
      !updated_employee_code &&
      !updated_designation
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one field to update.",
      });
    }

    if (
      (updated_name && updated_name.length > 150) ||
      (updated_employee_code && updated_employee_code.length > 50) ||
      (updated_designation && updated_designation.length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, employee code and designation must be at most 150, 50 and 100 characters respectively.",
      });
    }

    if (
      new_password &&
      (Buffer.byteLength(new_password, "utf8") > 72 ||
        !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(new_password))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must contain at least 8 characters, one uppercase letter, one number and one special character, and fit within 72 bytes.",
      });
    }

    const user = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1 AND status = 'active'`,
      [user_id],
    );

    if (user.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Active user not found.",
      });
    }

    const current_password_hash = user.rows[0].password_hash;

    if (!(await bcrypt.compare(password, current_password_hash))) {
      return res.status(403).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    let hashed_password = null;

    if (new_password) {
      const salt_rounds = Number(process.env.SALT_ROUNDS);

      if (
        !Number.isInteger(salt_rounds) ||
        salt_rounds < 4 ||
        salt_rounds > 31
      ) {
        return res.status(500).json({
          success: false,
          message: "Internal server error.",
        });
      }

      hashed_password = await bcrypt.hash(new_password, salt_rounds);
    }

    const updated_user = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           password_hash = COALESCE($2, password_hash),
           employee_code = COALESCE($3, employee_code),
           designation = COALESCE($4, designation),
           updated_at = NOW()
       WHERE id = $5 AND password_hash = $6 AND status = 'active'
       RETURNING id, name, employee_code, designation, updated_at`,
      [
        updated_name,
        hashed_password,
        updated_employee_code,
        updated_designation,
        user_id,
        current_password_hash,
      ],
    );

    if (updated_user.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: "Your account changed during the request. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully.",
      data: updated_user.rows[0],
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const update_email = async (req, res) => {
  const user_id = req.user?.id;
  const { new_email } = req.body || {};

  try {
    if (
      typeof user_id !== "string" ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user_id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
    }

    const email = typeof new_email === "string" ? new_email.trim() : "";

    if (
      email.length > 255 ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid new email address.",
      });
    }

    const user = await pool.query(
      `SELECT email FROM users WHERE id = $1 AND status = 'active' FOR UPDATE`,
      [user_id],
    );

    if (user.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Active user not found.",
      });
    }

    if (user.rows[0].email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "New email must be different from the current email.",
      });
    }
    const existing_new_email = await pool.query(
      `SELECT email FROM users WHERE id = $2`,
      [email, user_id],
    );
    if (existing_new_email.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "This email is already associated with another account.",
      });
    }
    const updated_email = await pool.query(
      `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [email, user_id],
    );
    if (updated_email.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Update failed.",
      });
    }
    const verification = await pool.query(
      `UPDATE check_user_email SET is_verified = FALSE WHERE user_id = $1`,
      [user_id],
    );

    if (verification.rowCount === 0) {
      await pool.query(
        `INSERT INTO check_user_email (user_id, is_verified) VALUES ($1, FALSE)`,
        [user_id],
      );
    }
    return res.status(200).json({
      success: true,
      message: "Email updated successfully. Please verify your new email.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
