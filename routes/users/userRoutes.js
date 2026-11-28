import { Router } from "express";
import {
  create_admin_user,
  create_user,
  list_users,
  sent_email_verification_otp,
  update_email,
  update_user_password,
  update_user_profile,
  user_login,
  verify_user_email,
} from "../../controllers/users/userController.js";
import {
  reset_user_password,
  send_password_reset_otp,
  verify_password_reset_otp,
} from "../../controllers/users/passwordResetController.js";
import {
  emailVerificationProtector,
  userRouteProtector,
} from "../../middlewares/userRouteProtector.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";
import {
  loginLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
} from "../../middlewares/otpRateLimiter.js";
const router = Router();

router.get("/", userRouteProtector, list_users);

router.post("/user", userRouteProtector, create_user);

router.post("/admin", adminRouteProtector, create_admin_user);

router.post(
  "/sent-otp",

  sendOtpLimiter(),
  sent_email_verification_otp,
);

router.post(
  "/verify-otp",

  verifyOtpLimiter(),
  verify_user_email,
);

router.post("/login", loginLimiter(), user_login);

router.get("/me", userRouteProtector, (req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json({
    user: req.user,
    role: req.role,
    permissions: req.permissions
      .filter(({ module, action }) => module && action)
      .map(({ module, action }) => ({ module, action })),
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  return res.json({ success: true });
});

router.patch("/update/password", userRouteProtector, update_user_password);

router.patch("/update/profile", userRouteProtector, update_user_profile);

router.patch("/update/emaail", userRouteProtector, update_email);

router.post(
  "/password-reset/send-otp",
  sendOtpLimiter(),
  send_password_reset_otp,
);
router.post(
  "/password-reset/verify-otp",
  verifyOtpLimiter(),
  verify_password_reset_otp,
);

router.post("/password-reset", verifyOtpLimiter(), reset_user_password);

export default router;
