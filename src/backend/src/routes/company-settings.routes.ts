import { Router } from "express";
import {
  getGeolocationSettings,
  updateGeolocationSettings,
} from "../controllers/company-settings.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.get("/geolocation", authenticateToken, requirePermission("system.operations"), getGeolocationSettings);
router.put("/geolocation", authenticateToken, requirePermission("system.operations"), updateGeolocationSettings);

export default router;
