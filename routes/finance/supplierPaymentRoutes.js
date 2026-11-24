import { Router } from "express";
import {
  createSupplierPayment,
  getAllSupplierPayments,
  getSupplierPaymentById,
  allocateSupplierPayment,
} from "../../controllers/finance/supplierPaymentController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createSupplierPayment);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllSupplierPayments);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getSupplierPaymentById);
router.post("/:id/allocate", userRouteProtector, require_permission("finance", "post"), allocateSupplierPayment);

export default router;
