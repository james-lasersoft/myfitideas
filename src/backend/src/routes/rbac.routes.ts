import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";
import {
  assignRoles,
  createInvitation,
  createRole,
  getMyAuthorization,
  listAuditLogs,
  listInvitations,
  listPermissions,
  listRoles,
  listUsers,
  revokeSessions,
  updateRole,
  updateUserStatus,
} from "../controllers/rbac.controller.js";

const router = Router();

router.get("/me", authenticateToken, getMyAuthorization);
router.get("/users", authenticateToken, requirePermission("users.read"), listUsers);
router.patch("/users/:userId/status", authenticateToken, requirePermission("users.update"), updateUserStatus);
router.put("/users/:userId/roles", authenticateToken, requirePermission("users.assign_roles"), assignRoles);
router.post("/users/:userId/revoke-sessions", authenticateToken, requirePermission("users.update"), revokeSessions);
router.get("/roles", authenticateToken, requirePermission("roles.read"), listRoles);
router.post("/roles", authenticateToken, requirePermission("roles.create"), createRole);
router.put("/roles/:roleId", authenticateToken, requirePermission("roles.update"), updateRole);
router.get("/permissions", authenticateToken, requirePermission("roles.read"), listPermissions);
router.get("/invitations", authenticateToken, requirePermission("users.read"), listInvitations);
router.post("/invitations", authenticateToken, requirePermission("users.create"), createInvitation);
router.get("/audit", authenticateToken, requirePermission("audit.read"), listAuditLogs);

export default router;
