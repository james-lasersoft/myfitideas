import { Router } from "express";
import { listSyntheticDataUsers, previewSyntheticData } from "../controllers/synthetic-data.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.get("/users", authenticateToken, requirePermission("system.operations"), listSyntheticDataUsers);
router.post("/preview", authenticateToken, requirePermission("system.operations"), previewSyntheticData);

export default router;
