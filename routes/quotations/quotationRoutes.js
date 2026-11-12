import { Router } from "express";
import {
  createQuotation,
  getAllQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
} from "../../controllers/quotations/quotationController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createQuotation);
router.get("/", userRouteProtector, getAllQuotations);
router.get("/:id", userRouteProtector, getQuotationById);
router.put("/:id", userRouteProtector, updateQuotation);
router.delete("/:id", userRouteProtector, deleteQuotation);

export default router;
