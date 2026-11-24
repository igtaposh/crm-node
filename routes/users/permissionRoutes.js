import { Router } from "express";
import {
  create_premissions,
  delete_permission,
  get_permission_by_id,
} from "../../controllers/users/permissionController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";

const router = Router();

router.post("/", adminRouteProtector, create_premissions);
router.get("/:id", userRouteProtector, get_permission_by_id);
router.delete("/:id", adminRouteProtector, delete_permission);

export default router;
