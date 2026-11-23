import { Resend } from "resend";

export const send_otp_email = async ({
  email,
  otp,
  subject,
  heading,
  expires_in_minutes,
}) => {
  if (
    typeof otp !== "string" ||
    otp.length !== 6 ||
    !/^\d{6}$/.test(otp) ||
    !Number.isInteger(expires_in_minutes) ||
    expires_in_minutes < 1
  ) {
    throw new TypeError("Invalid OTP email options.");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const safe_heading = heading
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  const { error } = await resend.emails.send({
    from: process.env.OTP_EMAIL_FROM || "verify@resend.dev",
    to: [email],
    subject,
    text: `${heading}\n\nYour code is ${otp}. It expires in ${expires_in_minutes} minutes. If you didn't request it, you can ignore this email.`,
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#162b25">
  <table width="100%" role="presentation" style="padding:32px 12px">
    <tr><td align="center">
      <table width="100%" role="presentation" style="max-width:540px;background:#fff;border-radius:12px">
        <tr><td style="background:#123d31;color:#fff;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="font-size:22px;margin:0">${safe_heading}</h1>
        </td></tr>
        <tr><td style="padding:24px">
          <p>Enter this code to continue.</p>
          <p style="background:#eef6f1;padding:18px;text-align:center;font-size:28px;font-weight:bold;letter-spacing:8px">${otp}</p>
          <p>This code expires in ${expires_in_minutes} minutes.</p>
          <p>If you didn't request this code, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (error) {
    throw new Error("Could not send OTP email.");
  }
};
