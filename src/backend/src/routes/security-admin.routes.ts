import { Router } from "express";
import {
  listSecurityUsers,
  resetUserMfa,
  revokeAllUserSessions,
} from "../controllers/security-admin.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();

router.get("/users", authenticateToken, requirePermission("system.operations"), listSecurityUsers);
router.post("/users/:userId/reset-mfa", authenticateToken, requirePermission("system.operations"), resetUserMfa);
router.post("/users/:userId/revoke-sessions", authenticateToken, requirePermission("system.operations"), revokeAllUserSessions);

export default router;
