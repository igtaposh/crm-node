import { Router } from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../../controllers/crm/customerController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("crm", "create"), createCustomer);
router.get("/", userRouteProtector, require_permission("crm", "read"), getAllCustomers);
router.get("/:id", userRouteProtector, require_permission("crm", "read"), getCustomerById);
router.put("/:id", userRouteProtector, require_permission("crm", "update"), updateCustomer);
router.delete("/:id", userRouteProtector, require_permission("crm", "delete"), deleteCustomer);

export default router;
