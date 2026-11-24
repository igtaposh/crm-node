import { Router } from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
  addBookingGuest,
  cancelBooking,
} from "../../controllers/bookings/bookingController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createBooking);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllBookings);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getBookingById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateBooking);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteBooking);
router.post("/:id/guests", userRouteProtector, require_permission("booking", "create"), addBookingGuest);
router.post("/:id/cancel", userRouteProtector, require_permission("booking", "create"), cancelBooking);

export default router;
