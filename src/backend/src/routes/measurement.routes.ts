import { Router } from "express";
import {
  createMeasurement,
  getMeasurements,
} from "../controllers/measurement.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken);

router.post("/", createMeasurement);
router.get("/", getMeasurements);

export default router;
