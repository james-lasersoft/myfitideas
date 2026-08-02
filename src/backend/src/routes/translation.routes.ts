import { Router } from "express";
import {
  getPublishedTranslations,
  getTranslationHistory,
  listLanguages,
  listTranslations,
  saveTranslation,
} from "../controllers/translation.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authenticateToken);

router.get("/languages", listLanguages);
router.get("/", listTranslations);
router.put("/:keyId", saveTranslation);
router.get("/:keyId/history", getTranslationHistory);
router.get("/published/:locale", getPublishedTranslations);

export default router;
