import { Router } from "express";
import {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
} from "../../controllers/crm/enquiryController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("crm", "create"), createEnquiry);
router.get("/", userRouteProtector, require_permission("crm", "read"), getAllEnquiries);
router.get("/:id", userRouteProtector, require_permission("crm", "read"), getEnquiryById);
router.put("/:id", userRouteProtector, require_permission("crm", "update"), updateEnquiry);
router.delete("/:id", userRouteProtector, require_permission("crm", "delete"), deleteEnquiry);

export default router;
