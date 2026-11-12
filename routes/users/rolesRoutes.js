import { Router } from "express";
import { create_roles } from "../../controllers/users/rolesController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, create_roles);
// router.post("/sent-otp", sent_email_verification_otp);
// router.post("/verify-otp", verify_user_email);
// router.post("/login", user_login);

export default router;
