import { Router } from "express";
import {
  createSupplierPayment,
  getAllSupplierPayments,
  getSupplierPaymentById,
  allocateSupplierPayment,
} from "../../controllers/finance/supplierPaymentController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createSupplierPayment);
router.get("/", userRouteProtector, getAllSupplierPayments);
router.get("/:id", userRouteProtector, getSupplierPaymentById);
router.post("/:id/allocate", userRouteProtector, allocateSupplierPayment);

export default router;
