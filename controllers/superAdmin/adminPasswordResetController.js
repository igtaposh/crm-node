import { password_reset_handlers } from "../users/passwordResetController.js";

const admin_reset = password_reset_handlers(true);
export const send_admin_password_reset_otp = admin_reset.send;
export const verify_admin_password_reset_otp = admin_reset.verify;
export const reset_admin_password = admin_reset.reset;
