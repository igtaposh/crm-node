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
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createBooking);
router.get("/", userRouteProtector, getAllBookings);
router.get("/:id", userRouteProtector, getBookingById);
router.put("/:id", userRouteProtector, updateBooking);
router.delete("/:id", userRouteProtector, deleteBooking);
router.post("/:id/guests", userRouteProtector, addBookingGuest);
router.post("/:id/cancel", userRouteProtector, cancelBooking);

export default router;
