import { Router } from "express";
import {
  createAccountingPeriod,
  getAllAccountingPeriods,
  updateAccountingPeriodStatus,
  createBankTransaction,
  getAllBankTransactions,
} from "../../controllers/accounting/accountingPeriodController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/periods", userRouteProtector, createAccountingPeriod);
router.get("/periods", userRouteProtector, getAllAccountingPeriods);
router.put("/periods/:id/status", userRouteProtector, updateAccountingPeriodStatus);

router.post("/bank-transactions", userRouteProtector, createBankTransaction);
router.get("/bank-transactions", userRouteProtector, getAllBankTransactions);

export default router;
