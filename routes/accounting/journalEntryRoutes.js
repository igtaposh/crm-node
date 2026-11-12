import { Router } from "express";
import {
  createJournalEntry,
  getAllJournalEntries,
  getJournalEntryById,
  reverseJournalEntry,
} from "../../controllers/accounting/journalEntryController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createJournalEntry);
router.get("/", userRouteProtector, getAllJournalEntries);
router.get("/:id", userRouteProtector, getJournalEntryById);
router.post("/:id/reverse", userRouteProtector, reverseJournalEntry);

export default router;
