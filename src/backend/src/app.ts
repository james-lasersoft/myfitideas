import express, {
  type Request,
  type Response,
} from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";
import bodyWeightRoutes from "./routes/body-weight.routes.js";
import hydrationRoutes from "./routes/hydration.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import v1Routes from "./api/v1/index.js";
import { requestContext } from "./middleware/request-context.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { openApiDocument } from "./openapi.js";

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const trustProxy = process.env.TRUST_PROXY?.trim();
if (trustProxy) {
  const numericTrustProxy = Number(trustProxy);
  app.set("trust proxy", Number.isInteger(numericTrustProxy) && numericTrustProxy >= 0 ? numericTrustProxy : trustProxy);
}

app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "My Fit Ideas API is running", apiVersion: "v1", documentation: "/api/docs/openapi.json" });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "OK", environment: process.env.NODE_ENV ?? "development", timestamp: new Date().toISOString() });
});

app.get("/api/docs/openapi.json", (_req: Request, res: Response) => { res.json(openApiDocument); });
app.use("/api/v1", v1Routes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/body-weight", bodyWeightRoutes);
app.use("/api/hydration", hydrationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
