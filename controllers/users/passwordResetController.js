import { createHmac, randomInt } from "node:crypto";
import { pool } from "../../config/db.js";
import { decrypt_data, encrypt_data } from "../../utils/crypto.js";
import { send_otp_email } from "../../utils/send_otp_email.js";

const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const get_otp_digest = (email, otp) => {
  const key = Buffer.from(process.env.ENCRYPTION_SECRET_KEY, "hex");

  return createHmac("sha256", key)
    .update(`password-reset-otp:${email}:${otp}`)
    .digest("hex");
};

export const send_password_reset_otp = async (req, res) => {
  const { email } = req.body || {};

  try {
    const normalized_email =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (normalized_email.length > 255 || !email_regex.test(normalized_email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email.",
      });
    }

    const encrypted_email = encrypt_data(normalized_email);

    res.set("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      message: "If an account exists for this email, a reset code will be sent.",
      encryptedEmail: encrypted_email,
    });

    const otp = String(randomInt(0, 1000000)).padStart(6, "0");
    const otp_digest = get_otp_digest(normalized_email, otp);

    const result = await pool.query(
      `WITH matching_users AS (
         SELECT id, email FROM users
         WHERE LOWER(email) = $1 AND status = 'active'
         LIMIT 2
       ), saved_otp AS (
         INSERT INTO password_reset_otps
           (user_id, otp_digest, attempts_remaining, resend_at, expires_at)
         SELECT id, $2, 5, NOW() + INTERVAL '1 minute', NOW() + INTERVAL '10 minutes'
         FROM matching_users
         WHERE (SELECT COUNT(*) FROM matching_users) = 1
         ON CONFLICT (user_id) DO UPDATE SET
           otp_digest = EXCLUDED.otp_digest,
           attempts_remaining = EXCLUDED.attempts_remaining,
           resend_at = EXCLUDED.resend_at,
           expires_at = EXCLUDED.expires_at
         WHERE password_reset_otps.resend_at <= NOW()
         RETURNING user_id
       )
       SELECT email FROM matching_users JOIN saved_otp ON id = user_id`,
      [normalized_email, otp_digest],
    );

    if (result.rowCount === 0) {
      return;
    }

    await send_otp_email({
      email: result.rows[0].email,
      otp,
      subject: "Your password reset code",
      heading: "Reset your password",
      expires_in_minutes: 10,
    });
  } catch {
    if (res.headersSent) {
      console.error("Could not issue or deliver a password reset code.");
      return;
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const verify_password_reset_otp = async (req, res) => {
  const { encryptedEmail, otp } = req.body || {};
  const invalid_message = "Invalid or expired reset code.";

  if (
    typeof encryptedEmail !== "string" ||
    encryptedEmail.length > 568 ||
    typeof otp !== "string" ||
    otp.length !== 6 ||
    !/^\d{6}$/.test(otp)
  ) {
    return res.status(400).json({ success: false, message: invalid_message });
  }

  let email;

  try {
    email = decrypt_data(encryptedEmail);
  } catch {
    return res.status(400).json({ success: false, message: invalid_message });
  }

  if (
    email.length > 255 ||
    !email_regex.test(email) ||
    email !== email.trim().toLowerCase()
  ) {
    return res.status(400).json({ success: false, message: invalid_message });
  }

  try {
    const encrypted_email = encrypt_data(email);
    const otp_digest = get_otp_digest(email, otp);
    const result = await pool.query(
      `WITH matching_users AS (
         SELECT id FROM users
         WHERE LOWER(email) = $1 AND status = 'active'
         LIMIT 2
       )
       UPDATE password_reset_otps AS reset_otp
       SET attempts_remaining = CASE
         WHEN reset_otp.otp_digest = $2 THEN 0
         ELSE reset_otp.attempts_remaining - 1
       END
       FROM matching_users
       WHERE reset_otp.user_id = matching_users.id
         AND (SELECT COUNT(*) FROM matching_users) = 1
         AND reset_otp.expires_at > NOW()
         AND reset_otp.attempts_remaining > 0
       RETURNING reset_otp.otp_digest = $2 AS verified`,
      [email, otp_digest],
    );

    if (!result.rows[0]?.verified) {
      return res.status(400).json({ success: false, message: invalid_message });
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      message: "Password reset code verified.",
      encryptedEmail: encrypted_email,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
