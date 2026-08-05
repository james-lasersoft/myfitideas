import { Router } from "express";
import { createMeasurement, getMeasurements } from "../controllers/measurement.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireEntitlement } from "../middleware/entitlement.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);
router.use(requireEntitlement("core.tracking"));
router.post("/", requirePermission("measurements.create"), createMeasurement);
router.get("/", requirePermission("measurements.read"), getMeasurements);
export default router;
