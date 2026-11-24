import { Router } from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../../controllers/crm/taskController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("crm", "create"), createTask);
router.get("/", userRouteProtector, require_permission("crm", "read"), getAllTasks);
router.get("/:id", userRouteProtector, require_permission("crm", "read"), getTaskById);
router.put("/:id", userRouteProtector, require_permission("crm", "update"), updateTask);
router.delete("/:id", userRouteProtector, require_permission("crm", "delete"), deleteTask);

export default router;
