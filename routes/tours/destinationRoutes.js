import { Router } from "express";
import {
  createDestination,
  getAllDestinations,
  getDestinationById,
  updateDestination,
  deleteDestination,
} from "../../controllers/tours/destinationController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createDestination);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllDestinations);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getDestinationById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateDestination);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteDestination);

export default router;
