import { Router } from "express";
import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  addSupplierContact,
} from "../../controllers/suppliers/supplierController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createSupplier);
router.get("/", userRouteProtector, getAllSuppliers);
router.get("/:id", userRouteProtector, getSupplierById);
router.put("/:id", userRouteProtector, updateSupplier);
router.delete("/:id", userRouteProtector, deleteSupplier);
router.post("/:id/contacts", userRouteProtector, addSupplierContact);

export default router;
