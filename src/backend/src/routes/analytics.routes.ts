import { Router } from "express";
import { getBodyTransformation } from "../controllers/body-transformation-analytics.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireEntitlement } from "../middleware/entitlement.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);
router.use(requireEntitlement("core.tracking"));
router.get("/body-transformation", requirePermission("measurements.read"), getBodyTransformation);
export default router;
