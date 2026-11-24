import { Router } from "express";
import {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
} from "../../controllers/accounting/chartOfAccountsController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createAccount);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllAccounts);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getAccountById);
router.put("/:id", userRouteProtector, require_permission("finance", "update"), updateAccount);

export default router;
