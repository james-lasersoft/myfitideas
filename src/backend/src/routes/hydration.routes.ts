import { Router } from "express";
import {
  createHydrationEntry,
  deleteHydrationEntry,
  getDailyHydrationTotal,
  getHydrationEntries,
} from "../controllers/hydration.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.post("/", createHydrationEntry);
router.get("/", getHydrationEntries);
router.get("/daily-total", getDailyHydrationTotal);
router.delete("/:id", deleteHydrationEntry);

export default router;
