import { Router } from "express";
import {
  getPublishedTranslations,
  getTranslationHistory,
  listLanguages,
  listTranslations,
  saveTranslation,
  updateSourceText,
} from "../controllers/translation.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);

router.get("/languages", requirePermission("translations.read"), listLanguages);
router.get("/", requirePermission("translations.read"), listTranslations);
router.put("/:keyId/source", requirePermission("translations.edit"), updateSourceText);
router.put("/:keyId", requirePermission("translations.edit"), saveTranslation);
router.get("/:keyId/history", requirePermission("translations.read"), getTranslationHistory);
router.get("/published/:locale", getPublishedTranslations);

export default router;
