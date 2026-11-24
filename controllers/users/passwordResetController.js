import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../../config/db.js";
import { decrypt_data, encrypt_data } from "../../utils/crypto.js";
import { send_otp_email } from "../../utils/send_otp_email.js";
import {
  challenge_digest,
  issue_account_challenge,
  verify_account_challenge,
} from "../../utils/account_challenge.js";

const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const invalid_message = "Invalid or expired reset code.";

export const password_reset_handlers = (is_admin) => {
  const purpose = is_admin ? "admin_reset" : "user_reset";
  const table = is_admin ? "super_admins" : "users";
  const active = is_admin ? "" : "AND status = 'active'";

  const find_account = async (email) => {
    const result = await pool.query(
      `SELECT id, email FROM ${table} WHERE LOWER(email) = $1 ${active} LIMIT 2`,
      [email],
    );
    return result.rowCount === 1 ? result.rows[0] : null;
  };

  const send = async (req, res) => {
    const { email } = req.body || {};
    const normalized_email = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (normalized_email.length > 255 || !email_regex.test(normalized_email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email." });
    }

    const encrypted_email = is_admin ? null : encrypt_data(normalized_email);
    res.set("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset code will be sent.",
      ...(is_admin ? {} : { encryptedEmail: encrypted_email }),
    });

    try {
      const account = await find_account(normalized_email);
      if (!account) return;
      const otp = await issue_account_challenge(purpose, account);
      if (!otp) return;

      await send_otp_email({
        email: account.email,
        otp,
        subject: is_admin ? "Your super-admin password reset code" : "Your password reset code",
        heading: is_admin ? "Reset your super-admin password" : "Reset your password",
        expires_in_minutes: 10,
      });
    } catch {
      console.error("Could not issue or deliver a password reset code.");
    }
  };

  const verify = async (req, res) => {
    const { encryptedEmail, email, otp } = req.body || {};
    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    let normalized_email;
    try {
      if (is_admin) {
        normalized_email = typeof email === "string" ? email.trim().toLowerCase() : "";
      } else if (typeof encryptedEmail === "string" && encryptedEmail.length <= 568) {
        normalized_email = decrypt_data(encryptedEmail);
      }
    } catch {
      return res.status(400).json({ success: false, message: invalid_message });
    }
    if (!normalized_email || normalized_email.length > 255 || !email_regex.test(normalized_email)) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    const account = await find_account(normalized_email);
    if (!account) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    const reset_token = `${account.id}.${randomBytes(32).toString("hex")}`;
    const digest = challenge_digest(purpose, account.id, reset_token);
    const result = await verify_account_challenge(purpose, account, otp, digest);
    if (!result.rows[0]?.verified) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      message: "Password reset code verified.",
      [is_admin ? "encrypted_email" : "encryptedEmail"]: reset_token,
    });
  };

  const reset = async (req, res) => {
    const { encryptedEmail, encrypted_email, new_password } = req.body || {};
    const reset_token = encryptedEmail ?? encrypted_email;
    if (
      typeof reset_token !== "string" ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.[0-9a-f]{64}$/.test(reset_token)
    ) {
      return res.status(400).json({ success: false, message: invalid_message });
    }
    const password_regex = is_admin
      ? /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,64}$/
      : /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (
      typeof new_password !== "string" || Buffer.byteLength(new_password, "utf8") > 72 ||
      !password_regex.test(new_password)
    ) {
      return res.status(400).json({ success: false, message: "New password does not meet password requirements." });
    }

    const account_id = reset_token.split(".")[0];
    const digest = challenge_digest(purpose, account_id, reset_token);
    const hash = await bcrypt.hash(new_password, Number(process.env.SALT_ROUNDS));
    const result = await pool.query(
      `WITH consumed AS (
         DELETE FROM account_challenges
         WHERE purpose = $1 AND account_id = $2 AND reset_digest = $3
           AND expires_at > NOW()
         RETURNING account_id, email
       )
       UPDATE ${table} SET password_hash = $4, updated_at = NOW()
       WHERE (id, email) IN (SELECT account_id, email FROM consumed) ${active}`,
      [purpose, account_id, digest, hash],
    );

    if (result.rowCount !== 1) {
      return res.status(400).json({ success: false, message: invalid_message });
    }
    return res.status(200).json({ success: true, message: "Password reset successfully." });
  };

  return { send, verify, reset };
};

const user_reset = password_reset_handlers(false);
export const send_password_reset_otp = user_reset.send;
export const verify_password_reset_otp = user_reset.verify;
export const reset_user_password = user_reset.reset;
