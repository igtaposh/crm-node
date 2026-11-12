import { Router } from "express";
import {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
} from "../../controllers/crm/enquiryController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createEnquiry);
router.get("/", userRouteProtector, getAllEnquiries);
router.get("/:id", userRouteProtector, getEnquiryById);
router.put("/:id", userRouteProtector, updateEnquiry);
router.delete("/:id", userRouteProtector, deleteEnquiry);

export default router;
