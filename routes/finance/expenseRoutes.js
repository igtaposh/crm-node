import { Router } from "express";
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "../../controllers/finance/expenseController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("finance", "create"), createExpense);
router.get("/", userRouteProtector, require_permission("finance", "read"), getAllExpenses);
router.get("/:id", userRouteProtector, require_permission("finance", "read"), getExpenseById);
router.put("/:id", userRouteProtector, require_permission("finance", "update"), updateExpense);
router.delete("/:id", userRouteProtector, require_permission("finance", "delete"), deleteExpense);

export default router;
