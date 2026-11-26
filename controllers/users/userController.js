import { pool, send_database_error } from "../../config/db.js";
import bcrypt from "bcryptjs";
import { issue_account_challenge, verify_account_challenge } from "../../utils/account_challenge.js";
import { sent_otp_for_email_verify } from "../../utils/sent_otp_for_email_verify.js";
import { sign_session } from "../../utils/session.js";

const create_account = async (req, res, is_admin) => {
  const {
    branch_id,
    name,
    email,
    phone,
    password_hash,
    employee_code,
    designation,
    role_id,
  } = req.body || {};
  const organization_id = is_admin ? req.body?.organization_id : req.user.organization_id;

  try {
    if (!is_admin && req.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create users.",
      });
    }
    if (!organization_id || !name || !email || !password_hash || (!is_admin && !role_id)) {
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

    if (typeof email !== "string" || email.length > 255 || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
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
    if (typeof password_hash !== "string" || Buffer.byteLength(password_hash, "utf8") > 72 || !/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password_hash)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, one uppercase letter, one number and one special character.",
      });
    }
    if (
      !is_admin && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        role_id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID.",
      });
    }

    const email_address = email.toLowerCase();
    const hashed_password = await bcrypt.hash(password_hash, Number(process.env.SALT_ROUNDS));
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email_address]);
      const existing = await client.query(
        "SELECT id FROM users WHERE LOWER(email) = $1",
        [email_address],
      );
      if (existing.rowCount > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Email is already in use." });
      }

      const role = is_admin
        ? await client.query(
            `INSERT INTO roles (organization_id, name) VALUES ($1, 'admin')
             ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [organization_id],
          )
        : await client.query(
            "SELECT id FROM roles WHERE organization_id = $1 AND id = $2",
            [organization_id, role_id],
          );
      if (role.rowCount !== 1) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, message: "Invalid role for this organization." });
      }

      const result = await client.query(
        `INSERT INTO users
           (organization_id, branch_id, name, email, phone, password_hash, employee_code, designation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, organization_id, branch_id, name, email, phone, employee_code, designation, status`,
        [organization_id, branch_id || null, name, email_address, phone || null,
          hashed_password, employee_code || null, designation || null],
      );
      const user = result.rows[0];
      await client.query(
        "INSERT INTO check_user_email (user_id, is_verified) VALUES ($1, FALSE)",
        [user.id],
      );
      await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [
        user.id, role.rows[0].id,
      ]);
      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: is_admin
          ? "Admin created successfully. Please verify your email."
          : "User created successfully. Please verify your email.",
        data: user,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({ success: false, message: "Invalid organization or branch." });
    }
    if (error.code === "23505") {
      return res.status(409).json({ success: false, message: "Email is already in use." });
    }
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const list_users = async (req, res) => {
  if (req.role !== "admin") {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.status, u.designation, b.branch_name,
              COALESCE(string_agg(DISTINCT r.name, ', ' ORDER BY r.name), '') AS roles
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id AND b.organization_id = u.organization_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.organization_id = u.organization_id
       WHERE u.organization_id = $1
       GROUP BY u.id, b.branch_name
       ORDER BY u.name, u.id`,
      [req.user.organization_id],
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return send_database_error(res, error);
  }
};

export const create_user = (req, res) => create_account(req, res, false);
export const create_admin_user = (req, res) => create_account(req, res, true);

export const sent_email_verification_otp = async (req, res) => {
  const user = req.user;
  const result = await pool.query(
    `SELECT o.name FROM organizations o
     WHERE o.id = $1
       AND NOT EXISTS (SELECT 1 FROM check_user_email WHERE user_id = $2 AND is_verified)`,
    [user.organization_id, user.id],
  );
  if (!result.rowCount) {
    return res.status(409).json({ success: false, message: "User email is already verified." });
  }

  const otp = await issue_account_challenge("verify_email", user);
  if (!otp) {
    return res.status(429).json({ success: false, message: "Please wait before requesting another code." });
  }
  await sent_otp_for_email_verify(user, otp, result.rows[0]);

  return res.status(201).json({ success: true, message: "A 6 digit OTP has been sent to your email." });
};

export const verify_user_email = async (req, res) => {
  const { otp } = req.body || {};
  const user = req.user;
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "Invalid 6 digit OTP." });
  }

  const result = await verify_account_challenge("verify_email", user, otp);
  if (!result.rows[0]?.verified) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
  }

  const verification = await pool.query(
    `WITH account AS (
       SELECT id FROM users WHERE id = $1 AND email = $2 FOR UPDATE
     )
     UPDATE check_user_email SET is_verified = TRUE WHERE user_id IN (SELECT id FROM account)`,
    [user.id, user.email],
  );
  if (!verification.rowCount) {
    return res.status(409).json({ success: false, message: "Email changed or verification is unavailable." });
  }

  return res.status(200).json({ success: true, message: "OTP has been verified successfully." });
};

export const user_login = async (req, res) => {
  const { email, password_hash } = req.body || {};
  try {
    if (
      typeof email !== "string" || email.length > 255 ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ||
      typeof password_hash !== "string" || !password_hash ||
      Buffer.byteLength(password_hash, "utf8") > 72
    ) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.status, o.status AS organization_status, b.status AS branch_status, u.branch_id,
              EXISTS (SELECT 1 FROM check_user_email e
                      WHERE e.user_id = u.id AND e.is_verified) AS is_verified
       FROM users u JOIN organizations o ON o.id = u.organization_id
       LEFT JOIN branches b ON b.id = u.branch_id AND b.organization_id = u.organization_id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 2`,
      [email],
    );
    const user = result.rows[0];
    if (result.rowCount !== 1 || !(await bcrypt.compare(password_hash, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    if (user.status !== "active" || user.organization_status !== "active" || (user.branch_id && user.branch_status !== "active")) {
      return res.status(403).json({ success: false, message: "Account or organization is inactive." });
    }

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
    const token = sign_session("user", user);
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    return res.status(200).json({
      success: true,
      message: "User authenticated successfully.",
      is_email_verified: user.is_verified,
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

    const current_password_hash = user_password.rows[0]?.password_hash;
    const is_match = current_password_hash && await bcrypt.compare(old_password, current_password_hash);

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
       WHERE id = $2 AND status = 'active' AND password_hash = $3`,
      [hashed_password, user_id, current_password_hash],
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
  const { new_email, password } = req.body || {};
  const user = req.user;
  const email = typeof new_email === "string" ? new_email.trim().toLowerCase() : "";

  if (email.length > 255 || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return res.status(400).json({ success: false, message: "Please provide a valid new email address." });
  }
  if (email === user.email.toLowerCase()) {
    return res.status(400).json({ success: false, message: "New email must be different from the current email." });
  }
  if (typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ success: false, message: "Current password is required." });
  }

  const account = await pool.query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
  const hash = account.rows[0]?.password_hash;
  if (!hash || !(await bcrypt.compare(password, hash))) {
    return res.status(403).json({ success: false, message: "Current password is incorrect." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
    const existing = await client.query("SELECT id FROM users WHERE LOWER(email) = $1", [email]);
    if (existing.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Email is already in use." });
    }
    const updated = await client.query(
      `UPDATE users SET email = $1, updated_at = NOW()
       WHERE id = $2 AND email = $3 AND password_hash = $4 AND status = 'active'`,
      [email, user.id, user.email, hash],
    );
    if (!updated.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, message: "Account changed during the request." });
    }
    const verification = await client.query(
      "UPDATE check_user_email SET is_verified = FALSE WHERE user_id = $1",
      [user.id],
    );
    if (!verification.rowCount) {
      await client.query("INSERT INTO check_user_email (user_id, is_verified) VALUES ($1, FALSE)", [user.id]);
    }
    await client.query("COMMIT");
    return res.status(200).json({
      success: true,
      message: "Email updated successfully. Sign in again to verify your new email.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
