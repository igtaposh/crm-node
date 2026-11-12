import { Router } from "express";
import {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
} from "../../controllers/accounting/chartOfAccountsController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createAccount);
router.get("/", userRouteProtector, getAllAccounts);
router.get("/:id", userRouteProtector, getAccountById);
router.put("/:id", userRouteProtector, updateAccount);

export default router;
