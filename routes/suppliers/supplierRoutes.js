import { Router } from "express";
import {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  addSupplierContact,
} from "../../controllers/suppliers/supplierController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("booking", "create"), createSupplier);
router.get("/", userRouteProtector, require_permission("booking", "read"), getAllSuppliers);
router.get("/:id", userRouteProtector, require_permission("booking", "read"), getSupplierById);
router.put("/:id", userRouteProtector, require_permission("booking", "update"), updateSupplier);
router.delete("/:id", userRouteProtector, require_permission("booking", "delete"), deleteSupplier);
router.post("/:id/contacts", userRouteProtector, require_permission("booking", "create"), addSupplierContact);

export default router;
