import { Router } from "express";
import {
  createCancellationPolicy,
  getAllCancellationPolicies,
  getCancellationPolicyById,
  updateCancellationPolicy,
  deleteCancellationPolicy,
  addCancellationRule,
} from "../../controllers/tours/cancellationPolicyController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createCancellationPolicy);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllCancellationPolicies);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getCancellationPolicyById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateCancellationPolicy);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteCancellationPolicy);
router.post("/:id/rules", userRouteProtector, require_permission("booking", "create"), addCancellationRule);

export default router;
