import { Router } from "express";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/profile",
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      message: "Protected route accessed successfully.",
      authenticatedUser: req.user,
    });
  }
);

export default router;
