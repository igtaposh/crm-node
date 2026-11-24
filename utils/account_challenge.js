import { createHmac, randomInt } from "node:crypto";
import { pool } from "../config/db.js";

export const challenge_digest = (purpose, account_id, value) =>
  createHmac("sha256", process.env.JWT_SECRET)
    .update(JSON.stringify([purpose, account_id, value]))
    .digest("hex");

export const issue_account_challenge = async (purpose, account) => {
  const otp = String(randomInt(1000000)).padStart(6, "0");
  const digest = challenge_digest(purpose, account.id, otp);
  const result = await pool.query(
    `INSERT INTO account_challenges
       (purpose, account_id, email, otp_digest, attempts_remaining, resend_at, expires_at)
     VALUES ($1, $2, $3, $4, 5, NOW() + INTERVAL '1 minute', NOW() + INTERVAL '10 minutes')
     ON CONFLICT (purpose, account_id) DO UPDATE SET
       email = EXCLUDED.email, otp_digest = EXCLUDED.otp_digest,
       attempts_remaining = 5, resend_at = EXCLUDED.resend_at,
       expires_at = EXCLUDED.expires_at, reset_digest = NULL
     WHERE account_challenges.resend_at <= NOW()
        OR account_challenges.email <> EXCLUDED.email`,
    [purpose, account.id, account.email, digest],
  );
  return result.rowCount === 1 ? otp : null;
};

export const verify_account_challenge = (purpose, account, otp, reset_digest = null) =>
  pool.query(
    `UPDATE account_challenges
     SET attempts_remaining = CASE WHEN otp_digest = $4 THEN 0 ELSE attempts_remaining - 1 END,
         reset_digest = CASE WHEN otp_digest = $4 THEN $5 ELSE NULL END,
         expires_at = CASE WHEN otp_digest = $4 AND $5::text IS NOT NULL
                           THEN NOW() + INTERVAL '10 minutes' ELSE expires_at END,
         resend_at = CASE WHEN otp_digest = $4 AND $5::text IS NOT NULL
                          THEN NOW() + INTERVAL '10 minutes' ELSE resend_at END
     WHERE purpose = $1 AND account_id = $2 AND email = $3
       AND expires_at > NOW() AND attempts_remaining > 0
     RETURNING otp_digest = $4 AS verified`,
    [purpose, account.id, account.email, challenge_digest(purpose, account.id, otp), reset_digest],
  );
