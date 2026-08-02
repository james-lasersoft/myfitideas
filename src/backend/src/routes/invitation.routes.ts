import { Router } from "express";
import { acceptInvitation, inspectInvitation } from "../controllers/invitation.controller.js";

const router = Router();
router.get("/", inspectInvitation);
router.post("/accept", acceptInvitation);
export default router;
