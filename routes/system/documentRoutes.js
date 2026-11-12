import { Router } from "express";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
} from "../../controllers/system/documentController.js";
import { userRouteProtector } from "../../middlewares/userRouteProtector.js";

const router = Router();

router.post("/", userRouteProtector, createDocument);
router.get("/", userRouteProtector, getAllDocuments);
router.get("/:id", userRouteProtector, getDocumentById);
router.delete("/:id", userRouteProtector, deleteDocument);

export default router;
