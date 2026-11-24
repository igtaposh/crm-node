import { Router } from "express";

import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";
import {
  createNotification,
  deleteNotification,
  getAllNotifications,
  markAsRead,
} from "../../controllers/system/notificationController.js";

const router = Router();

router.post("/create", userRouteProtector, require_permission("etc", "create"), createNotification);
router.get("/get-all", userRouteProtector, getAllNotifications);
router.patch("/mark-read/:id", userRouteProtector, markAsRead);
router.delete("/:id", userRouteProtector, deleteNotification);

export default router;
