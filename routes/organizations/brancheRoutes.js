import { Router } from "express";
import { createBranch } from "../../controllers/organizations/branchController.js";

const router = Router();

router.post("/", createBranch);

export default router;
