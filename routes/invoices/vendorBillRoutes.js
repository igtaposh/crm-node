import { Router } from "express";
import {
  createVendorBill,
  getAllVendorBills,
  getVendorBillById,
  updateVendorBill,
  deleteVendorBill,
} from "../../controllers/invoices/vendorBillController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createVendorBill);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllVendorBills);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getVendorBillById);
router.put("/:id", userRouteProtector, require_permission("finance", "update"), updateVendorBill);
router.delete("/:id", userRouteProtector, require_permission("finance", "delete"), deleteVendorBill);

export default router;
