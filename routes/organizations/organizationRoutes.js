import { Router } from "express";
import {
  createOrganization,
  getAllOrganizations,
  getOrganizatinsById,
} from "../../controllers/organizations/organizationController.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";

const router = Router();

router.post("/", adminRouteProtector, createOrganization);
router.get("/", adminRouteProtector, getAllOrganizations);
router.get("/:id", adminRouteProtector, getOrganizatinsById);

export default router;
