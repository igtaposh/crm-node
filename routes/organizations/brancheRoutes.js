import { Router } from "express";
import {
  create_branch,
  get_all_branches,
  get_branch_by_id,
  update_branch,
  update_branch_status,
} from "../../controllers/organizations/branchController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, create_branch);
router.get("/", userRouteProtector, get_all_branches);
router.get("/:id", userRouteProtector, get_branch_by_id);
router.patch("/update/:id", userRouteProtector, update_branch);
router.patch("/update/status/:id", userRouteProtector, update_branch_status);
export default router;
