import { Router } from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  addLeadActivity,
} from "../../controllers/crm/leadController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createLead);
router.get("/", userRouteProtector, getAllLeads);
router.get("/:id", userRouteProtector, getLeadById);
router.put("/:id", userRouteProtector, updateLead);
router.delete("/:id", userRouteProtector, deleteLead);
router.post("/:id/activities", userRouteProtector, addLeadActivity);

export default router;
