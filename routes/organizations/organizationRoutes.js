import { Router } from "express";
import {
  accept_organization_update,
  create_organization,
  get_all_organizations,
  get_organizatins_by_id,
  getOrganizatinsById,
  request_organization_update,
} from "../../controllers/organizations/organizationController.js";
import { adminRouteProtector } from "../../middlewares/adminRouteProtector.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";
const router = Router();

router.post("/", adminRouteProtector, create_organization);
router.get("/", adminRouteProtector, get_all_organizations);
router.patch(
  "/update/request/accept",
  adminRouteProtector,
  accept_organization_update,
);
router.patch(
  "/update/status/:id",
  adminRouteProtector,
  accept_organization_update,
);
router.get("/me", userRouteProtector, get_organizatins_by_id);

router.post("/update/request", userRouteProtector, request_organization_update);
export default router;
