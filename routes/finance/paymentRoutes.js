import { Router } from "express";
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  allocatePayment,
} from "../../controllers/finance/paymentController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createPayment);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllPayments);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getPaymentById);
router.put("/:id", userRouteProtector, require_permission("finance", "update"), updatePayment);
router.post("/:id/allocate", userRouteProtector, require_permission("finance", "post"), allocatePayment);

export default router;
