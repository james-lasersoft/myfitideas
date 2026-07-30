import { Router } from "express";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.get("/", getDashboardSummary);

export default router;
