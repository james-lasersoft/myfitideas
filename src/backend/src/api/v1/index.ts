import { Router } from "express";
import authRoutes from "../../routes/auth.routes.js";
import userRoutes from "../../routes/user.routes.js";
import measurementRoutes from "../../routes/measurement.routes.js";
import hydrationRoutes from "../../routes/hydration.routes.js";
import dashboardRoutes from "../../routes/dashboard.routes.js";
import profileRoutes from "../../routes/profile.routes.js";
import translationRoutes from "../../routes/translation.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/measurements", measurementRoutes);
router.use("/hydration", hydrationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/profile", profileRoutes);
router.use("/admin/translations", translationRoutes);

export default router;
