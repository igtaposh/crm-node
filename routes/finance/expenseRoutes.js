import { Router } from "express";
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "../../controllers/finance/expenseController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createExpense);
router.get("/", userRouteProtector, getAllExpenses);
router.get("/:id", userRouteProtector, getExpenseById);
router.put("/:id", userRouteProtector, updateExpense);
router.delete("/:id", userRouteProtector, deleteExpense);

export default router;
