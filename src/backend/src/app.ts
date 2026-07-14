import express, { type Request, type Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

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

export default app;

