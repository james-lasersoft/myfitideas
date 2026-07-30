import express, {
  type Request,
  type Response,
} from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";
import hydrationRoutes from "./routes/hydration.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import v1Routes from "./api/v1/index.js";
import { requestContext } from "./middleware/request-context.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { openApiDocument } from "./openapi.js";

const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "My Fit Ideas API is running",
    apiVersion: "v1",
    documentation: "/api/docs/openapi.json",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "OK",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/docs/openapi.json", (_req: Request, res: Response) => {
  res.json(openApiDocument);
});

// Versioned contract for all new web and mobile client development.
app.use("/api/v1", v1Routes);

// Legacy routes remain available during migration so the current web client
// continues to work. They can be removed only after all clients use /api/v1.
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/hydration", hydrationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
