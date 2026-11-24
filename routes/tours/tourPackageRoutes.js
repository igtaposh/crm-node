import { Router } from "express";
import {
  createTourPackage,
  getAllTourPackages,
  getTourPackageById,
  updateTourPackage,
  deleteTourPackage,
} from "../../controllers/tours/tourPackageController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createTourPackage);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllTourPackages);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getTourPackageById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateTourPackage);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteTourPackage);

export default router;
