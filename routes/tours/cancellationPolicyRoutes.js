import { Router } from "express";
import {
  createCancellationPolicy,
  getAllCancellationPolicies,
  getCancellationPolicyById,
  updateCancellationPolicy,
  deleteCancellationPolicy,
  addCancellationRule,
} from "../../controllers/tours/cancellationPolicyController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createCancellationPolicy);
router.get("/", userRouteProtector, getAllCancellationPolicies);
router.get("/:id", userRouteProtector, getCancellationPolicyById);
router.put("/:id", userRouteProtector, updateCancellationPolicy);
router.delete("/:id", userRouteProtector, deleteCancellationPolicy);
router.post("/:id/rules", userRouteProtector, addCancellationRule);

export default router;
