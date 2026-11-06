import { Router } from "express";
import { createOrganization } from "../../controllers/organizations/organizationController.js";

const router = Router();

router.post("/", createOrganization);

export default router;
