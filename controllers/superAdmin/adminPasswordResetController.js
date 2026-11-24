import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";
import { decrypt_data, encrypt_data } from "../../utils/crypto.js";
import { send_otp_email } from "../../utils/send_otp_email.js";

const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const password_regex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/;

export const send_admin_password_reset_otp = async (req, res) => {
  const { email } = req.body;

  try {
    if (email.length > 250 || !email_regex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email.",
      });
    }
    z;
    const admin = await pool.query(
      `SELECT id FROM super_admins WHERE email = $1`,
      [email],
    );
    if (admin.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "User is not registered with email.",
      });
    }
    await pool.query(`DELETE FROM admin_otps WHERE email = $1`, [email]);

    res.set("Cache-Control", "no-store");

    const otp = String(randomInt(0, 1000000)).padStart(6, "0");
    const salt_rounds = Number(process.env.SALT_ROUNDS);
    const encrypted_otp = await bcrypt.hash(otp, salt_rounds);

    const result = await pool.query(
      `INSERT INTO admin_otps (email , otp, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`[
        (email, encrypted_otp)
      ],
    );

    if (result.rowCount === 0) {
      return;
    }

    await send_otp_email({
      email: result.rows[0].email,
      otp,
      subject: "Your super-admin password reset code",
      heading: "Reset your super-admin password",
      expires_in_minutes: 10,
    });
    return res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, a reset code will be sent.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const verify_admin_password_reset_otp = async (req, res) => {
  const { otp, email } = req.body || {};
  const invalid_message = "Invalid or expired reset code.";
  try {
    if (
      email.length > 250 ||
      !email_regex.test(email) ||
      email !== email.trim().toLowerCase()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email." });
    }

    if (typeof otp !== "string" || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    const admins = await pool.query(
      `SELECT id FROM super_admins WHERE LOWER(email) = $1`,
      [email],
    );

    if (admins.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "User does not exists with this email id.",
      });
    }

    const admin_otp = await pool.query(
      `SELECT otp FROM admin_otps WHERE email = $1 AND expires_at > NOW ()`,
      [email],
    );
    if (admin_otp.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: invalid_message,
      });
    }
    const is_match = await bcrypt.compare(otp, admin_otp.rows[0].otp);

    if (!is_match) {
      return res.status(400).json({
        success: false,
        message: invalid_message,
      });
    }
    await pool.query(`DELETE FROM admin_otps WHERE email = $1`, [email]);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      encrypted_email: encrypt_data(email),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const reset_admin_password = async (req, res) => {
  const { encryptedEmail, new_password } = req.body || {};

  const email = decrypt_data(encryptedEmail);

  try {
    if (typeof encryptedEmail !== "string" || encryptedEmail.length > 558) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid encrypted email." });
    }
    if (
      email.length > 250 ||
      !email_regex.test(email) ||
      email !== email.trim().toLowerCase()
    ) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    if (
      typeof new_password !== "string" ||
      new_password !== new_password.trim() ||
      !password_regex.test(new_password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain 8-64 characters, including uppercase, lowercase, number and special character.",
      });
    }
    const salt_rounds = Number(process.env.SALT_ROUNDS);
    const hashed_password = await bcrypt.hash(new_password, salt_rounds);

    const updated_password = await pool.query(
      `UPDATE super_admins SET password_hash = $1, updated_at = NOW () WHERE email = $2 RETURNING *`,
      [hashed_password, email],
    );

    if (updated_password.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "User does not exists with email.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Password reseted successfully.",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
