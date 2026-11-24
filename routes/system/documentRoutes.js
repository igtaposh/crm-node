import { Router } from "express";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
} from "../../controllers/system/documentController.js";
import { require_permission, userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, require_permission("etc", "create"), createDocument);
router.get("/", userRouteProtector, require_permission("etc", "read"), getAllDocuments);
router.get("/:id", userRouteProtector, require_permission("etc", "read"), getDocumentById);
router.delete("/:id", userRouteProtector, require_permission("etc", "delete"), deleteDocument);

export default router;
