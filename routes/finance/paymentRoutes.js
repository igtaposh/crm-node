import { Router } from "express";
import {
  createPayment,
  getAllPayments,
  getPaymentById,
  updatePayment,
  allocatePayment,
} from "../../controllers/finance/paymentController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createPayment);
router.get("/", userRouteProtector, getAllPayments);
router.get("/:id", userRouteProtector, getPaymentById);
router.put("/:id", userRouteProtector, updatePayment);
router.post("/:id/allocate", userRouteProtector, allocatePayment);

export default router;
