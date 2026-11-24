import { Router } from "express";
import { create_roles, delete_roles } from "../../controllers/users/rolesController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, create_roles);
router.delete("/:role_id", userRouteProtector, delete_roles)
export default router;
