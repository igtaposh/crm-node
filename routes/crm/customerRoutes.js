import { Router } from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../../controllers/crm/customerController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createCustomer);
router.get("/", userRouteProtector, getAllCustomers);
router.get("/:id", userRouteProtector, getCustomerById);
router.put("/:id", userRouteProtector, updateCustomer);
router.delete("/:id", userRouteProtector, deleteCustomer);

export default router;
