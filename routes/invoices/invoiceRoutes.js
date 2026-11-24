import { Router } from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  deleteInvoice,
} from "../../controllers/invoices/invoiceController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createInvoice);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllInvoices);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getInvoiceById);
router.put("/:id/status", userRouteProtector, require_permission("finance", "update"), updateInvoiceStatus);
router.delete("/:id", userRouteProtector, require_permission("finance", "delete"), deleteInvoice);

export default router;
