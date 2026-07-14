import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`My Fit Ideas API running on port ${port}`);
});

const shutdown = (signal: string): void => {
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close((error?: Error) => {
    if (error) {
      console.error("Error while shutting down:", error);
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
