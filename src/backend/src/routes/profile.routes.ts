import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
router.use(authenticateToken);
router.get("/", requirePermission("profile.read"), getProfile);
router.put("/", requirePermission("profile.update"), updateProfile);
export default router;
