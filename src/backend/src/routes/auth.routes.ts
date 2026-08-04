import { Router } from "express";
import {
  beginMfaEnrollment,
  completeMfaEnrollment,
  listSecurityDevices,
  login,
  logout,
  refreshAccessToken,
  resetMfa,
  revokeTrustedDevice,
} from "../controllers/auth.controller.js";
import { registerWithPrivacy } from "../controllers/privacy-registration.controller.js";
import {
  listActiveSessions,
  revokeOtherSessions,
  revokeSession,
} from "../controllers/account-security.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerWithPrivacy);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", authenticateToken, logout);
router.post("/mfa/enroll/start", beginMfaEnrollment);
router.post("/mfa/enroll/complete", completeMfaEnrollment);
router.get("/security/devices", authenticateToken, listSecurityDevices);
router.delete("/security/devices/:id", authenticateToken, revokeTrustedDevice);
router.get("/security/sessions", authenticateToken, listActiveSessions);
router.delete("/security/sessions/:id", authenticateToken, revokeSession);
router.post("/security/sessions/revoke-others", authenticateToken, revokeOtherSessions);
router.post("/security/mfa/reset", authenticateToken, resetMfa);

export default router;
