import { Router } from "express";
import {
  createAdminUser,
  createUser,
  sent_email_verification_otp,
  user_login,
  verify_user_email,
} from "../../controllers/users/userController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";
const router = Router();

router.post("/admin", adminRouteProtector, createAdminUser);
router.post("/sent-otp", userRouteProtector, sent_email_verification_otp);
router.post("/verify-otp", userRouteProtector, verify_user_email);
router.post("/login", userRouteProtector, user_login);

export default router;
