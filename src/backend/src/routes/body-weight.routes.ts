import { Router } from "express";
import {
  createWeight,
  latestWeight,
  removeWeight,
  updateWeight,
  weightHistory,
} from "../controllers/body-weight.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireEntitlement } from "../middleware/entitlement.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);
router.use(requireEntitlement("core.tracking"));
router.get("/latest", requirePermission("measurements.read"), latestWeight);
router.get("/history", requirePermission("measurements.read"), weightHistory);
router.post("/", requirePermission("measurements.create"), createWeight);
router.put("/:id", requirePermission("measurements.create"), updateWeight);
router.delete("/:id", requirePermission("measurements.create"), removeWeight);

export default router;
