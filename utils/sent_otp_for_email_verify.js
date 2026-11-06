import { Resend } from "resend";

export const sent_otp_for_email_verify = async (user, otp, organization) => {
  console.log(user, otp, organization);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const year = new Date().getFullYear();
  const email = await resend.emails.send({
    from: "verify@resend.dev",
    to: [user.email],
    subject: "Your  Account Verification Code (OTP)",
    html: `<!DOCTYPE html>
   <html lang="en">
   <head>
   <meta charset="UTF-8" />
   <meta name="viewport" content="width=device-width, initial-scale=1.0" />
   <title>Verify Your Account</title>
   </head>

   <body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, Helvetica, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
     style="background-color:#f4f6f8; padding:35px 15px;">
     <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px; background-color:#ffffff; border-radius:12px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#123d31; padding:30px 20px;">
              <h1 style="margin:0; color:#ffffff; font-size:25px; font-weight:700;">
                ${organization.name}
              </h1>
              <p style="margin:8px 0 0; color:#c9ded5; font-size:13px;">
                Welcome to the family!
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:35px 30px 20px; color:#333333;">

              <h2 style="margin:0 0 15px; font-size:22px; color:#123d31;">
                Hello ${user.name},
              </h2>

              <p style="font-size:15px; line-height:1.7; color:#555555; margin:0 0 18px;">
                Thank you for choosing <strong>${organization.name}</strong>.
                We're excited to have you as part of our growing family!
              </p>

              <p style="font-size:15px; line-height:1.7; color:#555555; margin:0 0 25px;">
                To complete your registration and activate your account,
                please verify your email address using the One-Time Password (OTP) below.
              </p>

              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:25px 15px; background-color:#f0f5f2; border-radius:10px;">

                    <p style="margin:0 0 12px; font-size:12px; font-weight:700; letter-spacing:1.5px; color:#527064;">
                      YOUR VERIFICATION CODE
                    </p>

                    <h1 style="margin:0; font-size:34px; letter-spacing:9px; color:#123d31;">
                      ${otp}
                    </h1>

                    <p style="margin:14px 0 0; font-size:12px; color:#c05a42;">
                      This OTP expires in 10 minutes.
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <p style="margin:25px 0 10px; font-size:13px; line-height:1.7; color:#666666;">
                <strong>Security Reminder:</strong> Never share this OTP with anyone.
                Our team will never ask you for your verification code.
              </p>

              <p style="font-size:13px; line-height:1.7; color:#666666; margin:15px 0 0;">
                If you didn't create an account with us, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding:10px 30px 30px;">

              <p style="margin:0; font-size:15px; color:#333333; line-height:1.7;">
                We're looking forward to being part of your journey.
              </p>

              <p style="margin:18px 0 0; font-size:14px; color:#333333; line-height:1.7;">
                Warm regards,<br />
                <strong style="color:#123d31;">The ${organization.name} Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="background-color:#f8faf9; padding:20px; border-top:1px solid #eeeeee;">

              <p style="margin:0 0 7px; font-size:12px; color:#777777;">
                © ${year} ${organization.name}. All rights reserved.
              </p>

              <p style="margin:0; font-size:11px; color:#999999;">
                This is an automated email. Please do not reply to this message.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
   </table>

   </body>
   </html>`,
  });
  console.log(email);
};
