import express from "express";
import {
  admin_login,
  admin_logout,
  update_admin_password,
  update_admin_profile,
} from "../../controllers/superAdmin/adminController.js";
import {
  reset_admin_password,
  send_admin_password_reset_otp,
  verify_admin_password_reset_otp,
} from "../../controllers/superAdmin/adminPasswordResetController.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";
import { limit_password_attempts } from "../../middlewares/passwordResetLimitor.js";
import {
  sendOtpLimiter,
  verifyOtpLimiter,
} from "../../middlewares/otpRateLimiter.js";

const router = express.Router();

router.post("/login", admin_login);
router.post("/logout", adminRouteProtector, admin_logout);

router.patch(
  "/password",
  adminRouteProtector,
  limit_password_attempts,
  update_admin_password,
);

router.post(
  "/password-reset/send-otp",
  sendOtpLimiter,
  send_admin_password_reset_otp,
);

router.post(
  "/password-reset/verify-otp",
  verifyOtpLimiter,
  verify_admin_password_reset_otp,
);

router.post("/password-reset", reset_admin_password);
router.patch(
  "/update/profile",
  adminRouteProtector,
  limit_password_attempts,
  update_admin_profile,
);

export default router;
