import { Router } from "express";
import {
  createDestination,
  getAllDestinations,
  getDestinationById,
  updateDestination,
  deleteDestination,
} from "../../controllers/tours/destinationController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createDestination);
router.get("/", userRouteProtector, getAllDestinations);
router.get("/:id", userRouteProtector, getDestinationById);
router.put("/:id", userRouteProtector, updateDestination);
router.delete("/:id", userRouteProtector, deleteDestination);

export default router;
