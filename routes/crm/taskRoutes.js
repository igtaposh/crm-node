import { Router } from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../../controllers/crm/taskController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createTask);
router.get("/", userRouteProtector, getAllTasks);
router.get("/:id", userRouteProtector, getTaskById);
router.put("/:id", userRouteProtector, updateTask);
router.delete("/:id", userRouteProtector, deleteTask);

export default router;
