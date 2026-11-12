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
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createBookingService);
router.get("/", userRouteProtector, getAllBookingServices);
router.get("/:id", userRouteProtector, getBookingServiceById);
router.put("/:id", userRouteProtector, updateBookingService);
router.delete("/:id", userRouteProtector, deleteBookingService);
router.post("/:id/hotel-details", userRouteProtector, addHotelDetails);
router.post("/:id/voucher", userRouteProtector, addServiceVoucher);

export default router;
