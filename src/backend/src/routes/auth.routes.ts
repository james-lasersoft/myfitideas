import { Router } from "express";
import {
  beginMfaEnrollment,
  completeMfaEnrollment,
  listSecurityDevices,
  login,
  logout,
  refreshAccessToken,
  register,
  resetMfa,
  revokeTrustedDevice,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", authenticateToken, logout);
router.post("/mfa/enroll/start", beginMfaEnrollment);
router.post("/mfa/enroll/complete", completeMfaEnrollment);
router.get("/security/devices", authenticateToken, listSecurityDevices);
router.delete("/security/devices/:id", authenticateToken, revokeTrustedDevice);
router.post("/security/mfa/reset", authenticateToken, resetMfa);

export default router;
