import { Router } from "express";
import {
  createJournalEntry,
  getAllJournalEntries,
  getJournalEntryById,
  reverseJournalEntry,
} from "../../controllers/accounting/journalEntryController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createJournalEntry);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllJournalEntries);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getJournalEntryById);
router.post("/:id/reverse", userRouteProtector, require_permission("finance", "post"), reverseJournalEntry);

export default router;
