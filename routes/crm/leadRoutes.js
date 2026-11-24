import { Router } from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  addLeadActivity,
} from "../../controllers/crm/leadController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("crm", "create"), createLead);
router.get("/", userRouteProtector, require_permission("crm", "read"), getAllLeads);
router.get("/:id", userRouteProtector, require_permission("crm", "read"), getLeadById);
router.put("/:id", userRouteProtector, require_permission("crm", "update"), updateLead);
router.delete("/:id", userRouteProtector, require_permission("crm", "delete"), deleteLead);
router.post("/:id/activities", userRouteProtector, require_permission("crm", "create"), addLeadActivity);

export default router;
