import { Router } from "express";
import { createUser, sent_email_verification_otp } from "../../controllers/users/userController.js";
const router = Router();

router.post("/", createUser);
router.post("/sent-otp", sent_email_verification_otp);

export default router;