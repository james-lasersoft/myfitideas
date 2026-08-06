import { Router } from "express";
import {
  deleteSyntheticDataBatch,
  generateSyntheticData,
  listSyntheticDataBatches,
  listSyntheticDataUsers,
  previewSyntheticData,
} from "../controllers/synthetic-data.controller.js";
import {
  getSyntheticAccess,
  provisionSyntheticAccess,
} from "../controllers/synthetic-access.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = Router();
const guards = [authenticateToken, requirePermission("system.operations")] as const;

router.get("/users", ...guards, listSyntheticDataUsers);
router.get("/access", ...guards, getSyntheticAccess);
router.post("/access", ...guards, provisionSyntheticAccess);
router.get("/batches", ...guards, listSyntheticDataBatches);
router.post("/preview", ...guards, previewSyntheticData);
router.post("/generate", ...guards, generateSyntheticData);
router.delete("/batches/:batchId", ...guards, deleteSyntheticDataBatch);

export default router;
