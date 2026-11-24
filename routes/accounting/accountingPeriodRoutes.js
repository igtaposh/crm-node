import { Router } from "express";
import {
  createAccountingPeriod,
  getAllAccountingPeriods,
  updateAccountingPeriodStatus,
  createBankTransaction,
  getAllBankTransactions,
} from "../../controllers/accounting/accountingPeriodController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/periods", userRouteProtector, require_permission("finance", "create"), createAccountingPeriod);
router.get("/periods", userRouteProtector, require_permission("finance", "read"), getAllAccountingPeriods);
router.put("/periods/:id/status", userRouteProtector, require_permission("finance", "update"), updateAccountingPeriodStatus);

router.post("/bank-transactions", userRouteProtector, require_permission("finance", "create"), createBankTransaction);
router.get("/bank-transactions", userRouteProtector, require_permission("finance", "read"), getAllBankTransactions);

export default router;
