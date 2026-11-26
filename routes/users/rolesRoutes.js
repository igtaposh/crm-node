import { Router } from "express";
import { list_roles, create_roles, delete_roles, get_role_permissions, set_role_permission } from "../../controllers/users/rolesController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.get("/", userRouteProtector, list_roles);
router.post("/", userRouteProtector, create_roles);
router.get("/:role_id/permissions", userRouteProtector, get_role_permissions);
router.put("/:role_id/permissions/:permission_id", userRouteProtector, set_role_permission);
router.delete("/:role_id", userRouteProtector, delete_roles)
export default router;
