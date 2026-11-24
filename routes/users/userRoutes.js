import { Router } from "express";
import {
  create_admin_user,
  create_user,
  sent_email_verification_otp,
  update_email,
  update_user_password,
  update_user_profile,
  user_login,
  verify_user_email,
} from "../../controllers/users/userController.js";
import {
  send_password_reset_otp,
  verify_password_reset_otp,
} from "../../controllers/users/passwordResetController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";
import {
  sendOtpLimiter,
  verifyOtpLimiter,
} from "../../middlewares/otpRateLimiter.js";
const router = Router();

router.post("/user", userRouteProtector, create_user);

router.post("/admin", adminRouteProtector, create_admin_user);

router.post(
  "/sent-otp",
  userRouteProtector,
  sendOtpLimiter,
  sent_email_verification_otp,
);

router.post(
  "/verify-otp",
  userRouteProtector,
  verifyOtpLimiter,
  verify_user_email,
);

router.post("/login", userRouteProtector, user_login);

router.patch("/update/password", userRouteProtector, update_user_password);

router.patch("/update/profile", userRouteProtector, update_user_profile);

router.patch("/update/emaail", userRouteProtector, update_email);

router.post(
  "/password-reset/send-otp",
  sendOtpLimiter,
  send_password_reset_otp,
);
router.post(
  "/password-reset/verify-otp",
  verifyOtpLimiter,
  verify_password_reset_otp,
);

export default router;
