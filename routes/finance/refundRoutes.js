import { Router } from "express";
import {
  createRefund,
  getAllRefunds,
  getRefundById,
  updateRefundStatus,
} from "../../controllers/finance/refundController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createRefund);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllRefunds);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getRefundById);
router.put("/:id/status", userRouteProtector, require_permission("finance", "update"), updateRefundStatus);

export default router;
