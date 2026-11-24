import { Router } from "express";
import {
  createCreditNote,
  getAllCreditNotes,
  getCreditNoteById,
  createVendorCredit,
  getAllVendorCredits,
  getVendorCreditById,
} from "../../controllers/invoices/creditNoteController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createCreditNote);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllCreditNotes);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getCreditNoteById);

router.post("/vendor-credits", userRouteProtector, require_permission("finance", "create"), createVendorCredit);
router.get("/vendor-credits/all", userRouteProtector, require_permission("finance", "read"), getAllVendorCredits);
router.get("/vendor-credits/:id", userRouteProtector, require_permission("finance", "read"), getVendorCreditById);

export default router;
