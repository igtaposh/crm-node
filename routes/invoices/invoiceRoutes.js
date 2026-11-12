import { Router } from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  deleteInvoice,
} from "../../controllers/invoices/invoiceController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createInvoice);
router.get("/", userRouteProtector, getAllInvoices);
router.get("/:id", userRouteProtector, getInvoiceById);
router.put("/:id/status", userRouteProtector, updateInvoiceStatus);
router.delete("/:id", userRouteProtector, deleteInvoice);

export default router;
