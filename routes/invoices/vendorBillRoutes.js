import { Router } from "express";
import {
  createVendorBill,
  getAllVendorBills,
  getVendorBillById,
  updateVendorBill,
  deleteVendorBill,
} from "../../controllers/invoices/vendorBillController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createVendorBill);
router.get("/", userRouteProtector, getAllVendorBills);
router.get("/:id", userRouteProtector, getVendorBillById);
router.put("/:id", userRouteProtector, updateVendorBill);
router.delete("/:id", userRouteProtector, deleteVendorBill);

export default router;
