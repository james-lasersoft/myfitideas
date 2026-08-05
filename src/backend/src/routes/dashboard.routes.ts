import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireEntitlement } from "../middleware/entitlement.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);
router.use(requireEntitlement("core.tracking"));
router.get("/", requirePermission("dashboard.read"), getDashboardSummary);
export default router;
