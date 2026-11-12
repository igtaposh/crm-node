import { Router } from "express";
import {
  createTourPackage,
  getAllTourPackages,
  getTourPackageById,
  updateTourPackage,
  deleteTourPackage,
} from "../../controllers/tours/tourPackageController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createTourPackage);
router.get("/", userRouteProtector, getAllTourPackages);
router.get("/:id", userRouteProtector, getTourPackageById);
router.put("/:id", userRouteProtector, updateTourPackage);
router.delete("/:id", userRouteProtector, deleteTourPackage);

export default router;
