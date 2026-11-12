import express from "express";
import {
  admin_login,
  admin_logout,
} from "../../controllers/superAdmin/adminController.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";

const router = express.Router();

router.post("/login", admin_login);
router.post("/logout", adminRouteProtector, admin_logout);

export default router;
