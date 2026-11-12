import { Router } from "express";
import {
  createCreditNote,
  getAllCreditNotes,
  getCreditNoteById,
  createVendorCredit,
  getAllVendorCredits,
  getVendorCreditById,
} from "../../controllers/invoices/creditNoteController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createCreditNote);
router.get("/", userRouteProtector, getAllCreditNotes);
router.get("/:id", userRouteProtector, getCreditNoteById);

router.post("/vendor-credits", userRouteProtector, createVendorCredit);
router.get("/vendor-credits/all", userRouteProtector, getAllVendorCredits);
router.get("/vendor-credits/:id", userRouteProtector, getVendorCreditById);

export default router;
