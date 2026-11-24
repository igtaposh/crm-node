import { Router } from "express";
import {
  createQuotation,
  getAllQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
} from "../../controllers/quotations/quotationController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createQuotation);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllQuotations);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getQuotationById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateQuotation);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteQuotation);

export default router;
