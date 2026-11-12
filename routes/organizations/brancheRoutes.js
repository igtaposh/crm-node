import { Router } from "express";
import {
  createBranch,
  getAllBranches,
  getBranchById,
} from "../../controllers/organizations/branchController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createBranch);
router.get("/", userRouteProtector, getAllBranches);
router.get("/:id", userRouteProtector, getBranchById);

export default router;
