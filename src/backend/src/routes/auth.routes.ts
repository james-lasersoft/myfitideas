import { Router } from "express";
import {
  beginMfaEnrollment,
  completeMfaEnrollment,
  login,
  logout,
  refreshAccessToken,
  register,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshAccessToken);
router.post("/logout", authenticateToken, logout);
router.post("/mfa/enroll/start", beginMfaEnrollment);
router.post("/mfa/enroll/complete", completeMfaEnrollment);

export default router;
