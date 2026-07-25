import express, {
  type Request,
  type Response,
} from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import measurementRoutes from "./routes/measurement.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "My Fit Ideas API is running",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "OK",
    environment: process.env.NODE_ENV ?? "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/measurements", measurementRoutes);

export default app;
