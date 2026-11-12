import { Router } from "express";
import {
  createRefund,
  getAllRefunds,
  getRefundById,
  updateRefundStatus,
} from "../../controllers/finance/refundController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createRefund);
router.get("/", userRouteProtector, getAllRefunds);
router.get("/:id", userRouteProtector, getRefundById);
router.put("/:id/status", userRouteProtector, updateRefundStatus);

export default router;
