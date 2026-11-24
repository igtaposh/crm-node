import { Router } from "express";
import {
  createBookingService,
  getAllBookingServices,
  getBookingServiceById,
  updateBookingService,
  deleteBookingService,
  addHotelDetails,
  addServiceVoucher,
} from "../../controllers/suppliers/serviceController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createBookingService);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllBookingServices);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getBookingServiceById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateBookingService);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteBookingService);
router.post("/:id/hotel-details", userRouteProtector, require_permission("booking", "create"), addHotelDetails);
router.post("/:id/voucher", userRouteProtector, require_permission("booking", "create"), addServiceVoucher);

export default router;
