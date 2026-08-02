import { Router } from "express";
import { createHydrationEntry, deleteHydrationEntry, getDailyHydrationTotal, getHydrationEntries } from "../controllers/hydration.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);
router.post("/", requirePermission("hydration.create"), createHydrationEntry);
router.get("/", requirePermission("hydration.read"), getHydrationEntries);
router.get("/daily-total", requirePermission("hydration.read"), getDailyHydrationTotal);
router.delete("/:id", requirePermission("hydration.delete"), deleteHydrationEntry);
export default router;
